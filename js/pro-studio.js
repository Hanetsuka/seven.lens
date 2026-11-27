/**
 * svn.lens — Pro Studio Engine (js/pro-studio.js)
 * Modul fitur kelas Meitu yang berjalan 100% lokal di perangkat:
 * - Parser EXIF JPEG biner asli (Make, Model, Focal, Aperture, Shutter, ISO, Date)
 * - Portrait Beauty AI (Frequency-Separated Skin Smooth, Blemish, Brighten, Eye Pop, Lip Tint)
 * - Magic Eraser / Spot Healing Brush (Harmonic Inpaint + Grain/Texture Transfer)
 * - Color Match (Transfer palet warna, kontras & matte floor dari foto referensi)
 * - Live RGB Histogram + Indikator Clipping
 * - Editorial EXIF Gallery Frames (Leica Style, Dark Obsidian, Fuji Contact, Polaroid)
 */
(function (root) {
    'use strict';

    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

    // =========================================================================
    // 1. REAL JPEG BINARY EXIF PARSER
    // =========================================================================
    function formatDefaultExif() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return {
            make: 'SVN.LENS',
            model: 'SVN.LENS PRO',
            lens: '35mm f/2.0',
            focalLength: '35mm',
            aperture: 'f/2.0',
            shutter: '1/125s',
            iso: 'ISO 400',
            date: `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`,
            hasRealExif: false
        };
    }

    function readAscii(dv, off, len, end) {
        let s = '';
        const lim = Math.min(end, off + len);
        for (let i = off; i < lim; i++) {
            const c = dv.getUint8(i);
            if (c === 0) break;
            if (c >= 32 && c <= 126) s += String.fromCharCode(c);
        }
        return s.trim();
    }

    function readRational(dv, off, le, end) {
        if (off < 0 || off + 8 > end) return null;
        const num = dv.getUint32(off, le);
        const den = dv.getUint32(off + 4, le);
        if (!den) return null;
        return num / den;
    }

    function parseIfd(dv, tiffStart, ifdOff, le, end, out) {
        if (ifdOff <= 0 || tiffStart + ifdOff + 2 > end) return;
        const base = tiffStart + ifdOff;
        const count = dv.getUint16(base, le);
        if (count > 256) return;

        for (let i = 0; i < count; i++) {
            const ent = base + 2 + i * 12;
            if (ent + 12 > end) break;
            const tag = dv.getUint16(ent, le);
            const type = dv.getUint16(ent + 2, le);
            const cnt = dv.getUint32(ent + 4, le);
            const valFieldOff = ent + 8;

            const typeSize = type === 1 || type === 2 || type === 7 ? 1 : type === 3 ? 2 : (type === 4 || type === 9) ? 4 : (type === 5 || type === 10) ? 8 : 0;
            const totalBytes = typeSize * cnt;
            const dataOff = totalBytes <= 4 ? valFieldOff : (tiffStart + dv.getUint32(valFieldOff, le));
            if (dataOff < tiffStart || dataOff >= end) continue;

            if (tag === 0x010F && type === 2) out.make = readAscii(dv, dataOff, cnt, end);
            else if (tag === 0x0110 && type === 2) out.model = readAscii(dv, dataOff, cnt, end);
            else if (tag === 0x0132 && type === 2 && !out.rawDate) out.rawDate = readAscii(dv, dataOff, cnt, end);
            else if (tag === 0x9003 && type === 2) out.rawDate = readAscii(dv, dataOff, cnt, end);
            else if (tag === 0x8769) {
                const subOff = dv.getUint32(valFieldOff, le);
                out.exifPtr = subOff;
            } else if (tag === 0x829A && (type === 5 || type === 10)) {
                const v = readRational(dv, dataOff, le, end);
                if (v && v > 0) {
                    out.shutter = v < 0.9 ? `1/${Math.max(1, Math.round(1 / v))}s` : `${v >= 2 ? Math.round(v) : Number(v.toFixed(1))}s`;
                    out.hasRealExif = true;
                }
            } else if (tag === 0x829D && (type === 5 || type === 10)) {
                const v = readRational(dv, dataOff, le, end);
                if (v && v > 0 && v < 64) {
                    out.aperture = `f/${v >= 10 ? Math.round(v) : Number(v.toFixed(1))}`;
                    out.hasRealExif = true;
                }
            } else if (tag === 0x8827 && type === 3) {
                const iso = dv.getUint16(dataOff, le);
                if (iso > 0) {
                    out.iso = `ISO ${iso}`;
                    out.hasRealExif = true;
                }
            } else if (tag === 0x920A && (type === 5 || type === 10)) {
                const v = readRational(dv, dataOff, le, end);
                if (v && v > 0 && v < 2000) {
                    out.focalLength = `${v < 15 && Math.abs(v - Math.round(v)) > 0.08 ? Number(v.toFixed(1)) : Math.round(v)}mm`;
                    out.hasRealExif = true;
                }
            } else if (tag === 0xA434 && type === 2) {
                out.lens = readAscii(dv, dataOff, cnt, end);
            }
        }
    }

    function parseJpegExif(arrayBuffer) {
        const def = formatDefaultExif();
        if (!arrayBuffer || arrayBuffer.byteLength < 12) return def;
        try {
            const dv = new DataView(arrayBuffer);
            const len = dv.byteLength;
            if (dv.getUint16(0, false) !== 0xFFD8) return def;
            let off = 2;
            while (off + 4 <= len) {
                const marker = dv.getUint16(off, false);
                if (marker === 0xFFDA || marker === 0xFFD9) break;
                if ((marker & 0xFF00) !== 0xFF00) break;
                const segLen = dv.getUint16(off + 2, false);
                if (segLen < 2 || off + 2 + segLen > len) break;
                if (marker === 0xFFE1 && segLen >= 14) {
                    if (dv.getUint32(off + 4, false) === 0x45786966 && dv.getUint16(off + 8, false) === 0x0000) {
                        const tiffStart = off + 10;
                        const segEnd = off + 2 + segLen;
                        const endianTag = dv.getUint16(tiffStart, false);
                        if (endianTag === 0x4949 || endianTag === 0x4D4D) {
                            const le = endianTag === 0x4949;
                            if (dv.getUint16(tiffStart + 2, le) === 42) {
                                const firstIfd = dv.getUint32(tiffStart + 4, le);
                                const parsed = {};
                                parseIfd(dv, tiffStart, firstIfd, le, segEnd, parsed);
                                if (parsed.exifPtr) parseIfd(dv, tiffStart, parsed.exifPtr, le, segEnd, parsed);
                                if (parsed.rawDate) {
                                    const m = parsed.rawDate.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})/);
                                    if (m) parsed.date = `${m[1]}.${m[2]}.${m[3]}`;
                                }
                                if (parsed.model) {
                                    const mk = parsed.make && !parsed.model.toLowerCase().includes(parsed.make.toLowerCase())
                                        ? `${parsed.make} ${parsed.model}`
                                        : parsed.model;
                                    parsed.model = mk.toUpperCase().slice(0, 26);
                                    parsed.hasRealExif = true;
                                }
                                return {
                                    make: parsed.make || def.make,
                                    model: parsed.model || def.model,
                                    lens: parsed.lens || def.lens,
                                    focalLength: parsed.focalLength || def.focalLength,
                                    aperture: parsed.aperture || def.aperture,
                                    shutter: parsed.shutter || def.shutter,
                                    iso: parsed.iso || def.iso,
                                    date: parsed.date || def.date,
                                    hasRealExif: !!parsed.hasRealExif
                                };
                            }
                        }
                    }
                }
                off += 2 + segLen;
            }
        } catch (_) { /* ignore malformed EXIF */ }
        return def;
    }

    // =========================================================================
    // 2. PORTRAIT BEAUTY AI (Frequency-Separated Natural Skin & Features)
    // =========================================================================
    function applyPortraitRetouchData(data, lowBlurData, fineBlurData, maskAlpha, w, h, cfg) {
        if (!data || !lowBlurData || !fineBlurData || !w || !h) return;
        const smooth = clamp((cfg.smooth || 0) / 100, 0, 1);
        const brighten = clamp((cfg.brighten || 0) / 100, 0, 1);
        const blemish = clamp((cfg.blemish || 0) / 100, 0, 1);
        const eyePop = clamp((cfg.eyePop || 0) / 100, 0, 1);
        const lipTint = clamp((cfg.lipTint || 0) / 100, 0, 1);
        if (smooth <= 0.005 && brighten <= 0.005 && blemish <= 0.005 && eyePop <= 0.005 && lipTint <= 0.005) return;

        const inv255 = 1 / 255;
        const hasMask = !!(maskAlpha && maskAlpha.length === w * h);
        const sigma = 0.075 + smooth * 0.11;
        const inv2Sigma2 = 1 / (2 * sigma * sigma);
        const invH = 1 / h;

        for (let y = 0, p = 0; y < h; y++) {
            const v = y * invH;
            const upperEyeZone = (v >= 0.08 && v <= 0.68) ? 1 : 0;
            const lipZone = (v >= 0.18 && v <= 0.80) ? 1 : 0;
            const rowOff = y * w;
            for (let x = 0; x < w; x++, p++) {
                const idx = (rowOff + x) << 2;
                if (data[idx + 3] === 0) continue;

                const subW = hasMask ? (maskAlpha[p] * inv255) : 1;
                if (hasMask && subW < 0.05) continue;

                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const rn = r * inv255;
                const gn = g * inv255;
                const bn = b * inv255;
                const lum = 0.299 * rn + 0.587 * gn + 0.114 * bn;

                // Smooth YCbCr + RGB skin tone gate
                const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
                const cbScore = Math.exp(-((cb - 103) * (cb - 103)) / (2 * 14 * 14));
                const crScore = Math.exp(-((cr - 150) * (cr - 150)) / (2 * 13 * 13));
                const rgbWarm = clamp((rn - bn) * 6.5, 0, 1) * clamp((rn - gn + 0.04) * 7.0, 0, 1);
                const lumOk = lum > 0.14 && lum < 0.96 ? 1 : 0;
                const skinW = cbScore * crScore * (0.25 + 0.75 * rgbWarm) * lumOk * subW;

                const lr = lowBlurData[idx] * inv255;
                const lg = lowBlurData[idx + 1] * inv255;
                const lb = lowBlurData[idx + 2] * inv255;
                const fr = fineBlurData[idx] * inv255;
                const fg = fineBlurData[idx + 1] * inv255;
                const fb = fineBlurData[idx + 2] * inv255;

                let or = rn, og = gn, ob = bn;

                // A. Frequency-separated edge-preserving Skin Smoothing + Pore retention
                if (smooth > 0.005 && skinW > 0.04) {
                    const lowLum = 0.299 * lr + 0.587 * lg + 0.114 * lb;
                    const dLum = lum - lowLum;
                    const edgePres = Math.exp(-(dLum * dLum) * inv2Sigma2);
                    const sMix = clamp(smooth * skinW * edgePres * 0.78, 0, 0.82);
                    const poreR = (rn - fr) * 0.32;
                    const poreG = (gn - fg) * 0.32;
                    const poreB = (bn - fb) * 0.32;
                    or = rn + (lr - rn) * sMix + poreR * sMix;
                    og = gn + (lg - gn) * sMix + poreG * sMix;
                    ob = bn + (lb - bn) * sMix + poreB * sMix;
                }

                // B. Localized Blemish / Dark-Spot Healing inside skin
                if (blemish > 0.005 && skinW > 0.08) {
                    const lowLum = 0.299 * lr + 0.587 * lg + 0.114 * lb;
                    const dip = lowLum - lum;
                    const redSpot = (rn - gn) - (lr - lg);
                    if (dip > 0.028 && dip < 0.28) {
                        const spotW = clamp((dip - 0.028) * 10, 0, 1) * blemish * skinW * 0.84;
                        or += (lr - or) * spotW;
                        og += (lg - og) * spotW;
                        ob += (lb - ob) * spotW;
                    } else if (redSpot > 0.035 && redSpot < 0.22) {
                        const redW = clamp((redSpot - 0.035) * 9, 0, 1) * blemish * skinW * 0.70;
                        or += (lr - or) * redW;
                        og += (lg - ob * 0.02 - og) * redW;
                    }
                }

                // C. Linear-Light Creamy Brighten inside skin
                if (brighten > 0.005 && skinW > 0.04) {
                    const bK = brighten * skinW * 0.52;
                    const gLift = 1 + bK;
                    let rL = or * or * gLift * (1 - bK * 0.03);
                    let gL = og * og * gLift;
                    let bL = ob * ob * gLift * (1 + bK * 0.06);
                    if (rL > 0.72) rL = 0.72 + (rL - 0.72) / (1 + (rL - 0.72) * 1.45);
                    if (gL > 0.72) gL = 0.72 + (gL - 0.72) / (1 + (gL - 0.72) * 1.45);
                    if (bL > 0.72) bL = 0.72 + (bL - 0.72) / (1 + (bL - 0.72) * 1.45);
                    or = Math.sqrt(Math.max(0, rL));
                    og = Math.sqrt(Math.max(0, gL));
                    ob = Math.sqrt(Math.max(0, bL));
                }

                // D. Eye Catchlight & Micro-Clarity (upper-mid subject non-skin features with sharp gradient)
                if (eyePop > 0.005 && upperEyeZone && subW > 0.5 && skinW < 0.42) {
                    const fLum = 0.299 * fr + 0.587 * fg + 0.114 * fb;
                    const hp = lum - fLum;
                    const eW = eyePop * subW * clamp(1 - skinW * 2.2, 0, 1);
                    if (Math.abs(hp) > 0.015) {
                        const boost = hp * eW * 0.55;
                        or += boost; og += boost; ob += boost;
                    }
                    if (lum > 0.55 && lum < 0.90 && hp > 0.025) {
                        const spark = eW * 0.065 * clamp((hp - 0.025) * 14, 0, 1);
                        or += spark; og += spark; ob += spark;
                    }
                }

                // E. Natural Rosy Lip Tint (strictly high-warm-rose pixels in mid-subject)
                if (lipTint > 0.005 && lipZone && subW > 0.5 && lum > 0.18 && lum < 0.72) {
                    const rgGap = rn - gn;
                    const rbGap = rn - bn;
                    if (rgGap > 0.075 && rbGap > 0.080) {
                        const lGate = clamp((rgGap - 0.075) * 9, 0, 1) * clamp((rbGap - 0.080) * 8, 0, 1) * subW;
                        const k = lipTint * lGate;
                        or += k * 0.072 * (1 - or * 0.4);
                        og -= k * 0.018;
                        ob += k * 0.014;
                    }
                }

                data[idx] = clamp((or * 255 + 0.5) | 0, 0, 255);
                data[idx + 1] = clamp((og * 255 + 0.5) | 0, 0, 255);
                data[idx + 2] = clamp((ob * 255 + 0.5) | 0, 0, 255);
            }
        }
    }

    const _scratch = {};
    function getScratch(key, w, h) {
        let c = _scratch[key];
        if (!c && typeof document !== 'undefined') {
            c = _scratch[key] = document.createElement('canvas');
        }
        if (c && (c.width !== w || c.height !== h)) {
            c.width = w;
            c.height = h;
        }
        return c;
    }

    function applyPortraitRetouch(targetCanvas, subjectMaskCanvas, cfg) {
        if (!targetCanvas || !cfg) return;
        const w = targetCanvas.width, h = targetCanvas.height;
        if (!w || !h) return;
        const smooth = cfg.smooth || 0, brighten = cfg.brighten || 0, blemish = cfg.blemish || 0, eyePop = cfg.eyePop || 0, lipTint = cfg.lipTint || 0;
        if (smooth <= 0 && brighten <= 0 && blemish <= 0 && eyePop <= 0 && lipTint <= 0) return;

        const rLow = Math.max(2.6, Math.min(12, Math.min(w, h) * (0.008 + (smooth / 100) * 0.008)));
        const lowCv = getScratch('psLow', w, h);
        const lowCtx = lowCv.getContext('2d', { willReadFrequently: true });
        lowCtx.clearRect(0, 0, w, h);
        lowCtx.filter = `blur(${rLow.toFixed(1)}px)`;
        lowCtx.drawImage(targetCanvas, 0, 0, w, h);
        lowCtx.filter = 'none';
        const lowData = lowCtx.getImageData(0, 0, w, h).data;

        const fineCv = getScratch('psFine', w, h);
        const fineCtx = fineCv.getContext('2d', { willReadFrequently: true });
        fineCtx.clearRect(0, 0, w, h);
        fineCtx.filter = 'blur(1.4px)';
        fineCtx.drawImage(targetCanvas, 0, 0, w, h);
        fineCtx.filter = 'none';
        const fineData = fineCtx.getImageData(0, 0, w, h).data;

        let maskAlpha = null;
        if (subjectMaskCanvas && subjectMaskCanvas.width && subjectMaskCanvas.height) {
            const mCv = getScratch('psMask', w, h);
            const mCtx = mCv.getContext('2d', { willReadFrequently: true });
            mCtx.clearRect(0, 0, w, h);
            mCtx.drawImage(subjectMaskCanvas, 0, 0, w, h);
            const md = mCtx.getImageData(0, 0, w, h).data;
            maskAlpha = new Uint8Array(w * h);
            for (let p = 0, i = 3; p < maskAlpha.length; p++, i += 4) maskAlpha[p] = md[i];
        }

        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
        const img = ctx.getImageData(0, 0, w, h);
        applyPortraitRetouchData(img.data, lowData, fineData, maskAlpha, w, h, cfg);
        ctx.putImageData(img, 0, 0);
    }

    // =========================================================================
    // 3. MAGIC ERASER / SPOT HEALING (Harmonic Laplace Inpaint + Micro Grain)
    // =========================================================================
    function applyMagicHealData(data, mask, w, h, passes = 20) {
        if (!data || !mask || !w || !h) return;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) {
            const row = y * w;
            for (let x = 0; x < w; x++) {
                if (mask[row + x] > 4) {
                    if (x < x0) x0 = x;
                    if (x > x1) x1 = x;
                    if (y < y0) y0 = y;
                    if (y > y1) y1 = y;
                }
            }
        }
        if (x1 < x0 || y1 < y0) return;

        const pad = 16;
        x0 = Math.max(0, x0 - pad);
        y0 = Math.max(0, y0 - pad);
        x1 = Math.min(w - 1, x1 + pad);
        y1 = Math.min(h - 1, y1 + pad);
        const bw = x1 - x0 + 1;
        const bh = y1 - y0 + 1;
        const bn = bw * bh;

        const wr = new Float32Array(bn);
        const wg = new Float32Array(bn);
        const wb = new Float32Array(bn);
        const bMask = new Uint8Array(bn);
        let ringVarSum = 0, ringCnt = 0;
        let ringR = 0, ringG = 0, ringB = 0;

        for (let ly = 0; ly < bh; ly++) {
            const gx = x0, gy = y0 + ly;
            const gRow = gy * w, lRow = ly * bw;
            for (let lx = 0; lx < bw; lx++) {
                const lp = lRow + lx;
                const gp = gRow + gx + lx;
                const gi = gp << 2;
                const m = mask[gp];
                bMask[lp] = m > 4 ? m : 0;
                wr[lp] = data[gi];
                wg[lp] = data[gi + 1];
                wb[lp] = data[gi + 2];
                if (m <= 4) {
                    ringR += data[gi]; ringG += data[gi + 1]; ringB += data[gi + 2];
                    ringCnt++;
                }
            }
        }

        const avgR = ringCnt ? ringR / ringCnt : 128;
        const avgG = ringCnt ? ringG / ringCnt : 128;
        const avgB = ringCnt ? ringB / ringCnt : 128;

        // Compute natural local micro-texture amplitude from clean ring
        if (ringCnt > 16) {
            for (let ly = 1; ly < bh - 1; ly++) {
                const lRow = ly * bw;
                for (let lx = 1; lx < bw - 1; lx++) {
                    const lp = lRow + lx;
                    if (bMask[lp] === 0 && bMask[lp - 1] === 0 && bMask[lp + 1] === 0) {
                        const diff = wr[lp] - 0.5 * (wr[lp - 1] + wr[lp + 1]);
                        ringVarSum += Math.abs(diff);
                    }
                }
            }
        }
        const grainAmp = clamp((ringCnt ? (ringVarSum / ringCnt) : 2) * 1.15, 0.5, 9.0);

        // Seed masked pixels cleanly with ring mean so harmonic convergence takes <20 sweeps
        for (let lp = 0; lp < bn; lp++) {
            if (bMask[lp] > 0) {
                wr[lp] = avgR; wg[lp] = avgG; wb[lp] = avgB;
            }
        }

        // Gauss-Seidel / SOR harmonic inpaint (fast in-place directional + reverse sweeps!)
        const omega = 1.35;
        for (let it = 0; it < passes; it++) {
            const forward = (it & 1) === 0;
            const ys = forward ? 1 : bh - 2;
            const ye = forward ? bh - 1 : 0;
            const yStep = forward ? 1 : -1;
            for (let ly = ys; ly !== ye; ly += yStep) {
                const lRow = ly * bw;
                const xs = forward ? 1 : bw - 2;
                const xe = forward ? bw - 1 : 0;
                const xStep = forward ? 1 : -1;
                for (let lx = xs; lx !== xe; lx += xStep) {
                    const lp = lRow + lx;
                    if (bMask[lp] === 0) continue;
                    const nr = (wr[lp - 1] + wr[lp + 1] + wr[lp - bw] + wr[lp + bw] + 0.5 * (wr[lp - bw - 1] + wr[lp - bw + 1] + wr[lp + bw - 1] + wr[lp + bw + 1])) / 6.0;
                    const ng = (wg[lp - 1] + wg[lp + 1] + wg[lp - bw] + wg[lp + bw] + 0.5 * (wg[lp - bw - 1] + wg[lp - bw + 1] + wg[lp + bw - 1] + wg[lp + bw + 1])) / 6.0;
                    const nb = (wb[lp - 1] + wb[lp + 1] + wb[lp - bw] + wb[lp + bw] + 0.5 * (wb[lp - bw - 1] + wb[lp - bw + 1] + wb[lp + bw - 1] + wb[lp + bw + 1])) / 6.0;
                    wr[lp] = clamp(wr[lp] + omega * (nr - wr[lp]), 0, 255);
                    wg[lp] = clamp(wg[lp] + omega * (ng - wg[lp]), 0, 255);
                    wb[lp] = clamp(wb[lp] + omega * (nb - wb[lp]), 0, 255);
                }
            }
        }

        // Feathered blend + deterministic micro-grain synthesis
        const inv255 = 1 / 255;
        for (let ly = 0; ly < bh; ly++) {
            const gy = y0 + ly;
            const gRow = gy * w, lRow = ly * bw;
            for (let lx = 0; lx < bw; lx++) {
                const lp = lRow + lx;
                const m = bMask[lp];
                if (m === 0) continue;
                const gp = gRow + x0 + lx;
                const gi = gp << 2;
                const a = m * inv255;
                // Deterministic pseudo-noise from pixel position
                const h0 = Math.imul((gp ^ 0x9E3779B9) >>> 0, 0x85EBCA6B) >>> 0;
                const nVal = (((h0 >>> 24) / 255) - 0.5) * 2.0 * grainAmp;
                const hr = clamp(wr[lp] + nVal, 0, 255);
                const hg = clamp(wg[lp] + nVal, 0, 255);
                const hb = clamp(wb[lp] + nVal, 0, 255);
                data[gi] = clamp(Math.round(data[gi] + (hr - data[gi]) * a), 0, 255);
                data[gi + 1] = clamp(Math.round(data[gi + 1] + (hg - data[gi + 1]) * a), 0, 255);
                data[gi + 2] = clamp(Math.round(data[gi + 2] + (hb - data[gi + 2]) * a), 0, 255);
            }
        }
    }

    function applyMagicHealStrokes(targetCanvas, strokes, fast) {
        if (!targetCanvas || !Array.isArray(strokes) || !strokes.length) return;
        const w = targetCanvas.width, h = targetCanvas.height;
        if (!w || !h) return;
        const mCv = getScratch('psHealMask', w, h);
        const mCtx = mCv.getContext('2d', { willReadFrequently: true });
        mCtx.clearRect(0, 0, w, h);
        mCtx.lineCap = 'round';
        mCtx.lineJoin = 'round';
        mCtx.strokeStyle = '#ffffff';
        mCtx.fillStyle = '#ffffff';
        const minSide = Math.min(w, h);
        mCtx.filter = 'blur(1.5px)';
        strokes.forEach((st) => {
            if (!st || !Array.isArray(st.points) || !st.points.length) return;
            const lw = Math.max(4, (st.radius || 0.035) * minSide * 2);
            mCtx.lineWidth = lw;
            if (st.points.length === 1) {
                mCtx.beginPath();
                mCtx.arc(st.points[0].x * w, st.points[0].y * h, lw * 0.5, 0, Math.PI * 2);
                mCtx.fill();
            } else {
                mCtx.beginPath();
                mCtx.moveTo(st.points[0].x * w, st.points[0].y * h);
                for (let i = 1; i < st.points.length; i++) mCtx.lineTo(st.points[i].x * w, st.points[i].y * h);
                mCtx.stroke();
            }
        });
        mCtx.filter = 'none';
        const md = mCtx.getImageData(0, 0, w, h).data;
        const mask = new Uint8Array(w * h);
        for (let p = 0, i = 3; p < mask.length; p++, i += 4) mask[p] = md[i];
        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
        const img = ctx.getImageData(0, 0, w, h);
        applyMagicHealData(img.data, mask, w, h, fast ? 14 : 24);
        ctx.putImageData(img, 0, 0);
    }

    // =========================================================================
    // 4. COLOR MATCH (Reference Photo Palette & Tone Transfer)
    // =========================================================================
    function extractColorMatchFromData(data, w, h) {
        if (!data || !w || !h) return null;
        const inv255 = 1 / 255;
        const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 16000)));
        let sumL = 0, sumA = 0, sumB = 0;
        let sqL = 0, sqA = 0, sqB = 0, cnt = 0;
        const samples = [];
        for (let y = 0; y < h; y += step) {
            const row = y * w;
            for (let x = 0; x < w; x += step) {
                const i = (row + x) << 2;
                if (data[i + 3] < 16) continue;
                const r = data[i] * inv255, g = data[i + 1] * inv255, b = data[i + 2] * inv255;
                const L = 0.299 * r + 0.587 * g + 0.114 * b;
                const A = r - g;
                const B = 0.5 * (r + g) - b;
                sumL += L; sumA += A; sumB += B;
                sqL += L * L; sqA += A * A; sqB += B * B;
                samples.push({ L, r, g, b, A, B });
                cnt++;
            }
        }
        if (cnt < 8) return null;
        const mL = sumL / cnt, mA = sumA / cnt, mB = sumB / cnt;
        const sL = Math.sqrt(Math.max(1e-5, sqL / cnt - mL * mL));
        const sA = Math.sqrt(Math.max(1e-5, sqA / cnt - mA * mA));
        const sB = Math.sqrt(Math.max(1e-5, sqB / cnt - mB * mB));

        samples.sort((p, q) => p.L - q.L);
        const k5 = Math.min(cnt - 1, Math.floor(cnt * 0.05));
        const k15 = Math.max(1, Math.floor(cnt * 0.15));
        let shA = 0, shB = 0, hiA = 0, hiB = 0;
        for (let i = 0; i < k15; i++) {
            shA += samples[i].A; shB += samples[i].B;
            const hi = samples[cnt - 1 - i];
            hiA += hi.A; hiB += hi.B;
        }
        return {
            mL, mA, mB, sL, sA, sB,
            shA: shA / k15, shB: shB / k15,
            hiA: hiA / k15, hiB: hiB / k15,
            matteR: clamp(samples[k5].r, 0, 0.18),
            matteG: clamp(samples[k5].g, 0, 0.18),
            matteB: clamp(samples[k5].b, 0, 0.18)
        };
    }

    function extractColorMatchProfile(sourceCanvas) {
        if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) return null;
        const sc = Math.min(1, 200 / Math.max(sourceCanvas.width, sourceCanvas.height));
        const rw = Math.max(16, Math.round(sourceCanvas.width * sc));
        const rh = Math.max(16, Math.round(sourceCanvas.height * sc));
        const cv = getScratch('psCM', rw, rh);
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, rw, rh);
        ctx.drawImage(sourceCanvas, 0, 0, rw, rh);
        const img = ctx.getImageData(0, 0, rw, rh);
        return extractColorMatchFromData(img.data, rw, rh);
    }

    function applyColorMatchData(data, w, h, profile, strength = 1) {
        if (!data || !profile || !w || !h) return;
        const k = clamp(strength, 0, 1);
        if (k <= 0.005) return;
        const src = extractColorMatchFromData(data, w, h);
        if (!src) return;

        const rL = clamp(profile.sL / Math.max(0.04, src.sL), 0.58, 1.55);
        const rA = clamp(profile.sA / Math.max(0.025, src.sA), 0.55, 1.48);
        const rB = clamp(profile.sB / Math.max(0.025, src.sB), 0.55, 1.48);
        const inv255 = 1 / 255;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            const rn = data[i] * inv255, gn = data[i + 1] * inv255, bn = data[i + 2] * inv255;
            const L0 = 0.299 * rn + 0.587 * gn + 0.114 * bn;
            const A0 = rn - gn;
            const B0 = 0.5 * (rn + gn) - bn;

            let Lt = (L0 - src.mL) * rL + profile.mL;
            let At = (A0 - src.mA) * rA + profile.mA;
            let Bt = (B0 - src.mB) * rB + profile.mB;

            // Gentle shadow & highlight split bias from reference
            const shW = clamp(1 - L0 * 2.4, 0, 1);
            const hiW = clamp((L0 - 0.58) * 2.38, 0, 1);
            At += (profile.shA - profile.mA) * shW * 0.28 + (profile.hiA - profile.mA) * hiW * 0.22;
            Bt += (profile.shB - profile.mB) * shW * 0.28 + (profile.hiB - profile.mB) * hiW * 0.22;

            // Opponent inverse: A = r - g, B = 0.5*(r + g) - b, L = 0.299r + 0.587g + 0.114b
            const gT = Lt - 0.413 * At + 0.114 * Bt;
            const rT = gT + At;
            const bT = 0.5 * (rT + gT) - Bt;

            let or = rn + (clamp(rT, 0, 1) - rn) * k;
            let og = gn + (clamp(gT, 0, 1) - gn) * k;
            let ob = bn + (clamp(bT, 0, 1) - bn) * k;

            // Subtle matte floor match in deep shadows
            const mfK = k * 0.55;
            const mfR = profile.matteR * mfK;
            const mfG = profile.matteG * mfK;
            const mfB = profile.matteB * mfK;
            or = mfR + or * (1 - mfR);
            og = mfG + og * (1 - mfG);
            ob = mfB + ob * (1 - mfB);

            data[i] = clamp((or * 255 + 0.5) | 0, 0, 255);
            data[i + 1] = clamp((og * 255 + 0.5) | 0, 0, 255);
            data[i + 2] = clamp((ob * 255 + 0.5) | 0, 0, 255);
        }
    }

    function applyColorMatch(targetCanvas, profile, strength) {
        if (!targetCanvas || !profile || strength <= 0) return;
        const w = targetCanvas.width, h = targetCanvas.height;
        if (!w || !h) return;
        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
        const img = ctx.getImageData(0, 0, w, h);
        applyColorMatchData(img.data, w, h, profile, strength);
        ctx.putImageData(img, 0, 0);
    }

    // =========================================================================
    // 5. LIVE RGB HISTOGRAM & CLIPPING METRICS
    // =========================================================================
    function computeHistogramStats(data, w, h) {
        const rBins = new Int32Array(256);
        const gBins = new Int32Array(256);
        const bBins = new Int32Array(256);
        const lBins = new Int32Array(256);
        if (!data || !w || !h) return { rBins, gBins, bBins, lBins, total: 0, hiClipPct: 0, shClipPct: 0 };
        const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 48000)));
        let total = 0, hiClip = 0, shClip = 0;
        for (let y = 0; y < h; y += step) {
            const row = y * w;
            for (let x = 0; x < w; x += step) {
                const i = (row + x) << 2;
                if (data[i + 3] === 0) continue;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const l = clamp((0.299 * r + 0.587 * g + 0.114 * b + 0.5) | 0, 0, 255);
                rBins[r]++; gBins[g]++; bBins[b]++; lBins[l]++;
                total++;
                if (r >= 252 || g >= 252 || b >= 252) hiClip++;
                if (l <= 4) shClip++;
            }
        }
        return {
            rBins, gBins, bBins, lBins, total,
            hiClipPct: total ? (hiClip / total) * 100 : 0,
            shClipPct: total ? (shClip / total) * 100 : 0
        };
    }

    function computeHistogram(sourceCanvas, histCanvas) {
        if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) return { hiClipPct: 0, shClipPct: 0 };
        const sc = Math.min(1, 220 / Math.max(sourceCanvas.width, sourceCanvas.height));
        const sw = Math.max(16, Math.round(sourceCanvas.width * sc));
        const sh = Math.max(16, Math.round(sourceCanvas.height * sc));
        const tmp = getScratch('psHistSrc', sw, sh);
        const tCtx = tmp.getContext('2d', { willReadFrequently: true });
        tCtx.clearRect(0, 0, sw, sh);
        tCtx.drawImage(sourceCanvas, 0, 0, sw, sh);
        const stats = computeHistogramStats(tCtx.getImageData(0, 0, sw, sh).data, sw, sh);

        if (histCanvas) {
            const cw = histCanvas.width, ch = histCanvas.height;
            const c = histCanvas.getContext('2d');
            c.clearRect(0, 0, cw, ch);
            c.fillStyle = 'rgba(20, 17, 15, 0.72)';
            c.fillRect(0, 0, cw, ch);

            let maxPeak = 10;
            for (let x = 2; x < 254; x++) {
                const m = Math.max(stats.rBins[x], stats.gBins[x], stats.bBins[x], stats.lBins[x]);
                if (m > maxPeak) maxPeak = m;
            }
            const drawCurve = (bins, color, fill) => {
                c.beginPath();
                c.moveTo(0, ch);
                for (let i = 0; i < 256; i += 2) {
                    const avg = 0.5 * (bins[i] + bins[Math.min(255, i + 1)]);
                    const px = (i / 255) * cw;
                    const py = ch - clamp(avg / maxPeak, 0, 1) * (ch - 6) - 2;
                    c.lineTo(px, py);
                }
                c.lineTo(cw, ch);
                c.closePath();
                c.fillStyle = fill;
                c.fill();
                c.strokeStyle = color;
                c.lineWidth = 1;
                c.stroke();
            };
            c.save();
            c.globalCompositeOperation = 'screen';
            drawCurve(stats.rBins, 'rgba(239,68,68,0.75)', 'rgba(239,68,68,0.28)');
            drawCurve(stats.gBins, 'rgba(34,197,94,0.75)', 'rgba(34,197,94,0.28)');
            drawCurve(stats.bBins, 'rgba(59,130,246,0.75)', 'rgba(59,130,246,0.28)');
            drawCurve(stats.lBins, 'rgba(244,241,234,0.8)', 'rgba(244,241,234,0.14)');
            c.restore();
        }
        return { hiClipPct: stats.hiClipPct, shClipPct: stats.shClipPct };
    }

    // =========================================================================
    // 6. EDITORIAL EXIF GALLERY FRAMES
    // =========================================================================
    function renderExifFrame(c, w, h, frameId, strength = 0.6, exifData = null) {
        if (!c || !w || !h) return;
        const ex = { ...formatDefaultExif(), ...(exifData || {}) };
        const m = Math.min(w, h);
        const k = clamp(strength, 0, 1);
        const pad = m * (0.025 + k * 0.045);
        const isDark = frameId === 'frm_exif_dark';
        const isFuji = frameId === 'frm_exif_fuji';
        const isPola = frameId === 'frm_exif_pola';

        const botH = isPola ? pad * 3.4 : Math.max(pad * 2.1, m * 0.085);
        const bgCol = isDark ? '#0e0d0c' : isFuji ? '#f5efe2' : '#faf8f3';
        const fgCol = isDark ? '#f4f1ea' : '#1c1917';
        const subCol = isDark ? 'rgba(244,241,234,0.68)' : 'rgba(28,25,23,0.64)';

        c.save();
        c.fillStyle = bgCol;
        c.fillRect(0, 0, w, pad);
        c.fillRect(0, h - botH, w, botH);
        c.fillRect(0, pad, pad, h - pad - botH);
        c.fillRect(w - pad, pad, pad, h - pad - botH);

        const fsMain = Math.max(10, Math.min(botH * 0.25, m * 0.026));
        const fsSub = Math.max(8, fsMain * 0.80);
        const midY = h - botH * 0.5;
        const specs = `${ex.focalLength} · ${ex.aperture} · ${ex.shutter} · ${ex.iso}`;

        if (isPola) {
            c.fillStyle = fgCol;
            c.font = `italic 600 ${Math.round(fsMain * 1.15)}px "Playfair Display", Georgia, serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(`${ex.model}  —  ${ex.date}`, w * 0.5, midY - fsSub * 0.55);
            c.fillStyle = subCol;
            c.font = `400 ${Math.round(fsSub * 0.95)}px "Space Mono", monospace`;
            c.fillText(specs, w * 0.5, midY + fsMain * 0.75);
        } else if (isFuji) {
            c.fillStyle = '#d97706';
            c.font = `700 ${Math.round(fsMain)}px "Space Mono", monospace`;
            c.textAlign = 'left';
            c.textBaseline = 'middle';
            c.fillText(`▶ ${ex.model}`, pad * 1.1, midY - fsSub * 0.45);
            c.fillStyle = subCol;
            c.font = `400 ${Math.round(fsSub)}px "Space Mono", monospace`;
            c.fillText(specs, pad * 1.1, midY + fsMain * 0.62);
            c.textAlign = 'right';
            c.fillStyle = '#c2410c';
            c.fillText(ex.date, w - pad * 1.1, midY);
        } else {
            // Leica / Dark Editorial Bar
            const dotR = Math.max(3, fsMain * 0.30);
            const xLeft = pad * 1.15;
            if (frameId === 'frm_exif_leica') {
                c.fillStyle = '#dc2626';
                c.beginPath();
                c.arc(xLeft + dotR, midY - fsSub * 0.48, dotR, 0, Math.PI * 2);
                c.fill();
            }
            const textX = frameId === 'frm_exif_leica' ? (xLeft + dotR * 3.1) : xLeft;
            c.fillStyle = fgCol;
            c.font = `600 ${Math.round(fsMain)}px "Inter", sans-serif`;
            c.textAlign = 'left';
            c.textBaseline = 'middle';
            c.fillText(ex.model, textX, midY - fsSub * 0.48);
            c.fillStyle = subCol;
            c.font = `400 ${Math.round(fsSub * 0.92)}px "Space Mono", monospace`;
            c.fillText(ex.date, textX, midY + fsMain * 0.58);

            c.fillStyle = fgCol;
            c.textAlign = 'right';
            c.font = `400 ${Math.round(fsSub)}px "Space Mono", monospace`;
            c.fillText(specs, w - pad * 1.15, midY);
        }
        c.restore();
    }

    const api = {
        parseJpegExif,
        formatDefaultExif,
        applyPortraitRetouchData,
        applyPortraitRetouch,
        applyMagicHealData,
        applyMagicHealStrokes,
        extractColorMatchFromData,
        extractColorMatchProfile,
        applyColorMatchData,
        applyColorMatch,
        computeHistogramStats,
        computeHistogram,
        renderExifFrame
    };

    root.ProStudio = api;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
