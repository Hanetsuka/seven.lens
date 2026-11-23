/**
 * AI & Smart Effects Engine
 * - Smart Background Removal (Auto Corner Sampling & Magic Wand Flood Fill / Global Chroma Key)
 * - Soft Alpha Edge Feathering
 * - Lightroom-style Offline Auto Masking: Subject, Background, & Sky (MBD + FG/BG Lab EM + Color Guided Filter)
 * - Multi-Mode Non-Destructive Glitch Studio (RGB Split, VHS, Slice, Block Mosh, CRT Wave, Prism, Pixel Melt, Cyberpunk)
 * - Portrait Bokeh Blur & Film Red Halation
 */

const AITools = {
    /**
     * Deterministic PRNG (Mulberry32) agar pola glitch konsisten antara preview & ekspor
     */
    _mulberry32(seed) {
        let a = (seed | 0) || 1337;
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    },

    /**
     * Menghitung jarak warna persepsi (weighted Euclidean distance di ruang RGB)
     */
    colorDistance(r1, g1, b1, r2, g2, b2) {
        const rmean = (r1 + r2) * 0.5;
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        return Math.sqrt(
            (2 + rmean / 256) * dr * dr +
            4 * dg * dg +
            (2 + (255 - rmean) / 256) * db * db
        ) / 3.0;
    },

    /**
     * Menghapus background berdasarkan titik koordinat (x, y) pada gambar
     * Mendukung mode Contiguous (Flood Fill BFS) dan Global (Chroma Key)
     */
    removeBackgroundAtPoint(sourceCanvas, startX, startY, tolerance = 32, feather = 15, contiguous = true) {
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        const ctx = sourceCanvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const sx = Math.max(0, Math.min(w - 1, Math.round(startX)));
        const sy = Math.max(0, Math.min(h - 1, Math.round(startY)));
        const startIdx = (sy * w + sx) * 4;

        const targetR = data[startIdx];
        const targetG = data[startIdx + 1];
        const targetB = data[startIdx + 2];

        const maxTol = tolerance + feather;

        if (!contiguous) {
            for (let i = 0; i < data.length; i += 4) {
                const dist = this.colorDistance(data[i], data[i + 1], data[i + 2], targetR, targetG, targetB);
                if (dist <= tolerance) {
                    data[i + 3] = 0;
                } else if (dist <= maxTol && feather > 0) {
                    const alphaFactor = (dist - tolerance) / feather;
                    data[i + 3] = Math.round(data[i + 3] * alphaFactor);
                }
            }
        } else {
            const visited = new Uint8Array(w * h);
            const queue = new Int32Array(w * h);
            let head = 0;
            let tail = 0;

            const startPos = sy * w + sx;
            queue[tail++] = startPos;
            visited[startPos] = 1;

            while (head < tail) {
                const pos = queue[head++];
                const pIdx = pos * 4;
                const dist = this.colorDistance(data[pIdx], data[pIdx + 1], data[pIdx + 2], targetR, targetG, targetB);

                if (dist <= maxTol) {
                    if (dist <= tolerance) {
                        data[pIdx + 3] = 0;
                    } else if (feather > 0) {
                        const alphaFactor = (dist - tolerance) / feather;
                        data[pIdx + 3] = Math.min(data[pIdx + 3], Math.round(data[pIdx + 3] * alphaFactor));
                    }

                    if (dist <= tolerance + feather * 0.4) {
                        const x = pos % w;
                        const y = (pos - x) / w;

                        if (x > 0 && !visited[pos - 1]) {
                            visited[pos - 1] = 1;
                            queue[tail++] = pos - 1;
                        }
                        if (x < w - 1 && !visited[pos + 1]) {
                            visited[pos + 1] = 1;
                            queue[tail++] = pos + 1;
                        }
                        if (y > 0 && !visited[pos - w]) {
                            visited[pos - w] = 1;
                            queue[tail++] = pos - w;
                        }
                        if (y < h - 1 && !visited[pos + w]) {
                            visited[pos + w] = 1;
                            queue[tail++] = pos + w;
                        }
                    }
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Auto Background Removal: Mengambil sampel dari ke-4 sudut & tepi gambar
     */
    autoRemoveBackground(sourceCanvas, tolerance = 34, feather = 16) {
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        const points = [
            [4, 4],
            [w - 5, 4],
            [4, h - 5],
            [w - 5, h - 5],
            [Math.floor(w / 2), 4]
        ];
        points.forEach(([px, py]) => {
            this.removeBackgroundAtPoint(sourceCanvas, px, py, tolerance, feather, true);
        });
    },

    /**
     * Efek RGB Chromatic Aberration / Glitch (kompatibilitas lama)
     */
    applyChromaticGlitch(sourceCanvas, offsetPx = 8) {
        this.applyGlitch(sourceCanvas, {
            mode: 'rgb_split',
            intensity: Math.min(100, Math.round(offsetPx * 6)),
            shift: 65,
            slices: 0,
            noise: 0,
            angle: 0,
            seed: 42
        });
    },

    /**
     * Multi-Mode Non-Destructive Glitch Studio
     * Modes: 'rgb_split' | 'vhs' | 'slice' | 'pixel_block' | 'wave' | 'prism' | 'pixel_sort' | 'cyber'
     */
    applyGlitch(sourceCanvas, cfg) {
        if (!cfg || !cfg.mode || cfg.mode === 'none') return;
        const amt = Math.max(0, Math.min(100, cfg.intensity ?? 0)) / 100;
        if (amt <= 0) return;

        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
        const orig = ctx.getImageData(0, 0, w, h);
        const out = ctx.createImageData(w, h);
        const s = orig.data;
        const d = out.data;

        const shiftPct = Math.max(0, Math.min(100, cfg.shift ?? 45)) / 100;
        const slicePct = Math.max(0, Math.min(100, cfg.slices ?? 40)) / 100;
        const noisePct = Math.max(0, Math.min(100, cfg.noise ?? 25)) / 100;
        const angleRad = ((cfg.angle ?? 0) * Math.PI) / 180;
        const seed = (cfg.seed ?? 42) | 0;
        const rand = this._mulberry32(seed * 7919 + cfg.mode.length * 97);

        const scale = Math.max(w, h) / 800;
        const clampX = (x) => (x < 0 ? 0 : x >= w ? w - 1 : x | 0);
        const clampY = (y) => (y < 0 ? 0 : y >= h ? h - 1 : y | 0);
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);

        const mode = cfg.mode;

        if (mode === 'rgb_split') {
            const maxShift = Math.max(1, (2 + shiftPct * 28) * amt * scale);
            const dx = Math.round(cosA * maxShift);
            const dy = Math.round(sinA * maxShift);
            const rowJitter = new Int16Array(h);
            if (slicePct > 0.05) {
                const count = Math.round(3 + slicePct * 18);
                for (let k = 0; k < count; k++) {
                    const y0 = Math.floor(rand() * h);
                    const bh = Math.max(1, Math.floor((2 + rand() * 14) * scale));
                    const jx = Math.round((rand() - 0.5) * 2 * slicePct * amt * 28 * scale);
                    for (let y = y0; y < Math.min(h, y0 + bh); y++) rowJitter[y] = jx;
                }
            }
            const scanStep = Math.max(2, Math.round(3 * scale));
            for (let y = 0; y < h; y++) {
                const jx = rowJitter[y];
                const scanMul = noisePct > 0.02 && (y % scanStep === 0) ? 1 - noisePct * amt * 0.25 : 1;
                const ry = clampY(y - dy) * w;
                const gy = y * w;
                const by = clampY(y + dy) * w;
                for (let x = 0; x < w; x++) {
                    const idx = (gy + x) * 4;
                    const rx = clampX(x - dx + jx);
                    const gx = clampX(x + jx);
                    const bx = clampX(x + dx + jx);
                    const n = noisePct > 0.02 ? (rand() - 0.5) * noisePct * amt * 55 : 0;
                    d[idx] = s[(ry + rx) * 4] * scanMul + n;
                    d[idx + 1] = s[(gy + gx) * 4 + 1] * scanMul + n;
                    d[idx + 2] = s[(by + bx) * 4 + 2] * scanMul + n;
                    d[idx + 3] = s[idx + 3];
                }
            }
        } else if (mode === 'vhs') {
            const chromaLag = Math.max(2, Math.round((4 + shiftPct * 22) * amt * scale));
            const waveAmp = (2 + slicePct * 18) * amt * scale;
            const waveFreq = (0.015 + slicePct * 0.05) / Math.max(0.4, scale);
            const trackY = Math.floor(rand() * h);
            const trackH = Math.max(6, Math.round((12 + slicePct * 42) * scale));
            const trackShift = Math.round((rand() < 0.5 ? -1 : 1) * (14 + amt * 45) * scale);
            const scanStep = Math.max(2, Math.round(3 * scale));

            for (let y = 0; y < h; y++) {
                let xOff = Math.round(Math.sin(y * waveFreq + seed) * waveAmp + Math.sin(y * waveFreq * 3.1) * waveAmp * 0.35);
                let inTrack = false;
                if (y >= trackY && y < trackY + trackH) {
                    const t = Math.sin(((y - trackY) / trackH) * Math.PI);
                    xOff += Math.round(trackShift * t + (rand() - 0.5) * 14 * amt * scale);
                    inTrack = true;
                }
                const scanDark = (y % scanStep === 0) ? 1 - (0.08 + noisePct * 0.24) * amt : 1;
                const row = y * w;
                for (let x = 0; x < w; x++) {
                    const idx = (row + x) * 4;
                    const sx = clampX(x + xOff);
                    const rx = clampX(sx - chromaLag);
                    const bx = clampX(sx + Math.round(chromaLag * 0.75));
                    const sIdx = (row + sx) * 4;
                    const rIdx = (row + rx) * 4;
                    const bIdx = (row + bx) * 4;

                    let r = s[rIdx] * 0.85 + s[sIdx] * 0.15;
                    let g = s[sIdx + 1];
                    let b = s[bIdx + 2] * 0.82 + s[sIdx + 2] * 0.18;

                    if (inTrack && rand() < (0.12 + noisePct * 0.35) * amt) {
                        const snow = 175 + rand() * 80;
                        r = r * 0.35 + snow * 0.65;
                        g = g * 0.35 + snow * 0.65;
                        b = b * 0.35 + snow * 0.65;
                    } else if (noisePct > 0.02) {
                        const n = (rand() - 0.5) * noisePct * amt * 68;
                        r += n; g += n; b += n;
                    }

                    d[idx] = r * scanDark;
                    d[idx + 1] = g * scanDark;
                    d[idx + 2] = b * scanDark;
                    d[idx + 3] = s[idx + 3];
                }
            }
        } else if (mode === 'slice') {
            const sliceShift = new Int16Array(h);
            const sliceRgb = new Int16Array(h);
            const numSlices = Math.round(6 + slicePct * 42);
            const maxDisp = (12 + amt * 95) * scale;
            const baseRgb = Math.round(shiftPct * 18 * amt * scale);

            for (let k = 0; k < numSlices; k++) {
                const y0 = Math.floor(rand() * h);
                const bh = Math.max(2, Math.floor((3 + rand() * (34 - slicePct * 16)) * scale));
                const dir = rand() < 0.5 ? -1 : 1;
                const mag = Math.round(dir * (0.25 + rand() * 0.75) * maxDisp);
                const rgbMag = Math.round((0.5 + rand() * 1.2) * (baseRgb + 3 * amt * scale)) * dir;
                for (let y = y0; y < Math.min(h, y0 + bh); y++) {
                    sliceShift[y] = mag;
                    sliceRgb[y] = rgbMag;
                }
            }

            const scanStep = Math.max(2, Math.round(3 * scale));
            for (let y = 0; y < h; y++) {
                const sh = sliceShift[y];
                const rg = sliceRgb[y] || Math.round(baseRgb * 0.35);
                const scanMul = noisePct > 0.05 && (y % scanStep === 0) ? 1 - noisePct * amt * 0.2 : 1;
                const row = y * w;
                for (let x = 0; x < w; x++) {
                    const idx = (row + x) * 4;
                    const gx = clampX(x + sh);
                    const rx = clampX(gx - rg);
                    const bx = clampX(gx + rg);
                    const n = noisePct > 0.02 ? (rand() - 0.5) * noisePct * amt * 52 : 0;
                    d[idx] = s[(row + rx) * 4] * scanMul + n;
                    d[idx + 1] = s[(row + gx) * 4 + 1] * scanMul + n;
                    d[idx + 2] = s[(row + bx) * 4 + 2] * scanMul + n;
                    d[idx + 3] = s[idx + 3];
                }
            }
        } else if (mode === 'pixel_block') {
            d.set(s);
            const numBlocks = Math.round(12 + (slicePct * 85 + 10) * amt);
            const baseRgb = Math.round(shiftPct * 16 * amt * scale);

            for (let k = 0; k < numBlocks; k++) {
                const bw = Math.max(8, Math.round((16 + rand() * (110 - slicePct * 55)) * scale));
                const bh = Math.max(4, Math.round((6 + rand() * (44 - slicePct * 20)) * scale));
                const dstX = Math.floor(rand() * Math.max(1, w - bw));
                const dstY = Math.floor(rand() * Math.max(1, h - bh));
                const srcX = clampX(dstX + Math.round((rand() - 0.5) * 2 * (35 + amt * 130) * scale));
                const srcY = clampY(dstY + Math.round((rand() - 0.5) * 2 * (12 + amt * 36) * scale));
                const effectRoll = rand();
                const rOff = Math.round((rand() - 0.5) * 2 * (baseRgb + 6 * scale));

                for (let yy = 0; yy < bh; yy++) {
                    const dyRow = dstY + yy;
                    if (dyRow >= h) break;
                    const syRow = clampY(srcY + yy);
                    for (let xx = 0; xx < bw; xx++) {
                        const dxCol = dstX + xx;
                        if (dxCol >= w) break;
                        const sxCol = clampX(srcX + xx);
                        const di = (dyRow * w + dxCol) * 4;
                        const si = (syRow * w + sxCol) * 4;
                        const siR = (syRow * w + clampX(sxCol + rOff)) * 4;

                        if (effectRoll < 0.2) {
                            // Channel swap R <-> B
                            d[di] = s[si + 2];
                            d[di + 1] = s[si + 1];
                            d[di + 2] = s[siR];
                        } else if (effectRoll < 0.34) {
                            // Neon tint mosh
                            d[di] = Math.min(255, s[siR] * 1.15 + 25);
                            d[di + 1] = s[si + 1] * 0.72;
                            d[di + 2] = Math.min(255, s[si + 2] * 1.2 + 30);
                        } else {
                            d[di] = s[siR];
                            d[di + 1] = s[si + 1];
                            d[di + 2] = s[si + 2];
                        }
                    }
                }
            }

            if (noisePct > 0.02) {
                const nStr = noisePct * amt * 65;
                for (let i = 0; i < d.length; i += 4) {
                    if (rand() < 0.16 * noisePct) {
                        const n = (rand() - 0.5) * nStr;
                        d[i] += n; d[i + 1] += n; d[i + 2] += n;
                    }
                }
            }
        } else if (mode === 'wave') {
            const amp = (4 + amt * 36) * scale;
            const freq = (0.018 + slicePct * 0.085) / Math.max(0.4, scale);
            const rgbGap = Math.round((2 + shiftPct * 20) * amt * scale);
            const scanStep = Math.max(2, Math.round(3 * scale));
            const phase = seed * 0.7;

            for (let y = 0; y < h; y++) {
                const w1 = Math.sin(y * freq + phase) * amp;
                const w2 = Math.sin(y * freq * 2.7 - phase * 1.3) * amp * 0.28 * slicePct;
                const totalOff = Math.round(w1 + w2);
                const scanMul = (y % scanStep === 0) ? 1 - (0.06 + noisePct * 0.3) * amt : 1;
                const row = y * w;
                const dyR = clampY(y - Math.round(sinA * rgbGap * 0.5)) * w;
                const dyB = clampY(y + Math.round(sinA * rgbGap * 0.5)) * w;
                const dxR = Math.round(cosA * rgbGap);

                for (let x = 0; x < w; x++) {
                    const idx = (row + x) * 4;
                    const gx = clampX(x + totalOff);
                    const rx = clampX(gx - dxR);
                    const bx = clampX(gx + dxR);
                    const n = noisePct > 0.02 ? (rand() - 0.5) * noisePct * amt * 45 : 0;
                    d[idx] = s[(dyR + rx) * 4] * scanMul + n;
                    d[idx + 1] = s[(row + gx) * 4 + 1] * scanMul + n;
                    d[idx + 2] = s[(dyB + bx) * 4 + 2] * scanMul + n;
                    d[idx + 3] = s[idx + 3];
                }
            }
        } else if (mode === 'prism') {
            const spread = (4 + shiftPct * 42) * amt * scale;
            const echoes = Math.max(1, Math.round(1 + slicePct * 3));
            const ghostMix = 0.28 + amt * 0.42;

            for (let y = 0; y < h; y++) {
                const row = y * w;
                for (let x = 0; x < w; x++) {
                    const idx = (row + x) * 4;
                    let rr = s[idx] * (1 - ghostMix);
                    let gg = s[idx + 1] * (1 - ghostMix * 0.65);
                    let bb = s[idx + 2] * (1 - ghostMix);
                    const wPerEcho = ghostMix / echoes;

                    for (let e = 1; e <= echoes; e++) {
                        const f = e / echoes;
                        const ox = Math.round(cosA * spread * f);
                        const oy = Math.round(sinA * spread * f);
                        const rx = clampX(x - ox), ry = clampY(y - oy);
                        const bx = clampX(x + ox), by = clampY(y + oy);
                        const gx = clampX(x + Math.round(oy * 0.35)), gy = clampY(y - Math.round(ox * 0.35));

                        rr += s[(ry * w + rx) * 4] * wPerEcho;
                        gg += s[(gy * w + gx) * 4 + 1] * (wPerEcho * 0.65);
                        bb += s[(by * w + bx) * 4 + 2] * wPerEcho;
                    }
                    if (noisePct > 0.02) {
                        const n = (rand() - 0.5) * noisePct * amt * 40;
                        rr += n; gg += n; bb += n;
                    }
                    d[idx] = rr;
                    d[idx + 1] = gg;
                    d[idx + 2] = bb;
                    d[idx + 3] = s[idx + 3];
                }
            }
        } else if (mode === 'pixel_sort') {
            // Pixel Melt / Streak berdasarkan threshold kecerahan (horizontal atau vertikal sesuai angle)
            d.set(s);
            const vertical = Math.abs(Math.sin(angleRad)) > 0.7;
            const thresh = 225 - slicePct * 155; // 70..225
            const maxRun = Math.max(6, Math.round((10 + amt * 95) * scale));
            const rgbSpread = Math.round(shiftPct * 12 * amt * scale);

            if (!vertical) {
                for (let y = 0; y < h; y++) {
                    const row = y * w;
                    let run = 0, sr = 0, sg = 0, sb = 0;
                    for (let x = 0; x < w; x++) {
                        const idx = (row + x) * 4;
                        const lum = 0.299 * s[idx] + 0.587 * s[idx + 1] + 0.114 * s[idx + 2];
                        if (lum > thresh && run < maxRun) {
                            if (run === 0) { sr = s[idx]; sg = s[idx + 1]; sb = s[idx + 2]; }
                            else { sr = sr * 0.84 + s[idx] * 0.16; sg = sg * 0.84 + s[idx + 1] * 0.16; sb = sb * 0.84 + s[idx + 2] * 0.16; }
                            run++;
                            const bIdx = (row + clampX(x + rgbSpread)) * 4;
                            d[idx] = sr;
                            d[idx + 1] = sg;
                            d[bIdx + 2] = sb;
                        } else {
                            run = 0;
                        }
                    }
                }
            } else {
                for (let x = 0; x < w; x++) {
                    let run = 0, sr = 0, sg = 0, sb = 0;
                    for (let y = 0; y < h; y++) {
                        const idx = (y * w + x) * 4;
                        const lum = 0.299 * s[idx] + 0.587 * s[idx + 1] + 0.114 * s[idx + 2];
                        if (lum > thresh && run < maxRun) {
                            if (run === 0) { sr = s[idx]; sg = s[idx + 1]; sb = s[idx + 2]; }
                            else { sr = sr * 0.86 + s[idx] * 0.14; sg = sg * 0.86 + s[idx + 1] * 0.14; sb = sb * 0.86 + s[idx + 2] * 0.14; }
                            run++;
                            const bIdx = (clampY(y + rgbSpread) * w + x) * 4;
                            d[idx] = sr;
                            d[idx + 1] = sg;
                            d[bIdx + 2] = sb;
                        } else {
                            run = 0;
                        }
                    }
                }
            }
            if (noisePct > 0.02) {
                const nStr = noisePct * amt * 45;
                for (let i = 0; i < d.length; i += 4) {
                    const n = (rand() - 0.5) * nStr;
                    d[i] += n; d[i + 1] += n; d[i + 2] += n;
                }
            }
        } else if (mode === 'cyber') {
            // Cyberpunk Overdrive: Neon Cyan/Magenta split + sharp glitch slices + scanline pulse
            const rowShift = new Int16Array(h);
            const sliceCount = Math.round(8 + slicePct * 32);
            for (let k = 0; k < sliceCount; k++) {
                const y0 = Math.floor(rand() * h);
                const bh = Math.max(1, Math.floor((2 + rand() * 18) * scale));
                const off = Math.round((rand() - 0.5) * 2 * (18 + amt * 70) * scale);
                for (let y = y0; y < Math.min(h, y0 + bh); y++) rowShift[y] = off;
            }
            const rgbD = Math.max(2, Math.round((4 + shiftPct * 26) * amt * scale));
            const dxR = Math.round(cosA * rgbD);
            const dyR = Math.round(sinA * rgbD);
            const scanStep = Math.max(2, Math.round(3 * scale));

            for (let y = 0; y < h; y++) {
                const sh = rowShift[y];
                const scanMul = (y % scanStep === 0) ? 1 - (0.1 + noisePct * 0.25) * amt : 1;
                const row = y * w;
                const rowR = clampY(y - dyR) * w;
                const rowB = clampY(y + dyR) * w;
                const isTear = Math.abs(sh) > 8 * scale;

                for (let x = 0; x < w; x++) {
                    const idx = (row + x) * 4;
                    const gx = clampX(x + sh);
                    const rx = clampX(gx - dxR);
                    const bx = clampX(gx + dxR);

                    let r = s[(rowR + rx) * 4];
                    let g = s[(row + gx) * 4 + 1];
                    let b = s[(rowB + bx) * 4 + 2];

                    // Neon magenta/cyan edge kick
                    if (isTear) {
                        r = r * 1.12 + 12 * amt;
                        b = b * 1.15 + 16 * amt;
                    }
                    const n = noisePct > 0.02 ? (rand() - 0.5) * noisePct * amt * 65 : 0;
                    d[idx] = r * scanMul + n;
                    d[idx + 1] = g * scanMul + n * 0.7;
                    d[idx + 2] = b * scanMul + n;
                    d[idx + 3] = s[idx + 3];
                }
            }
        } else {
            d.set(s);
        }

        ctx.putImageData(out, 0, 0);
    },

    /**
     * Efek Film Red Halation (Pendaran cahaya kemerahan di sekitar area terang ala film CineStill)
     */
    applyFilmHalation(sourceCanvas) {
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        const ctx = sourceCanvas.getContext('2d');

        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = w;
        glowCanvas.height = h;
        const gCtx = glowCanvas.getContext('2d');
        gCtx.drawImage(sourceCanvas, 0, 0);

        const imgData = gCtx.getImageData(0, 0, w, h);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            if (lum > 195) {
                const strength = (lum - 195) / 60;
                d[i] = 255;
                d[i + 1] = Math.round(65 * strength);
                d[i + 2] = Math.round(35 * strength);
                d[i + 3] = Math.round(210 * strength);
            } else {
                d[i + 3] = 0;
            }
        }
        gCtx.putImageData(imgData, 0, 0);

        ctx.save();
        ctx.filter = `blur(${Math.max(6, Math.round(w / 95))}px)`;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(glowCanvas, 0, 0);
        ctx.restore();
    },

    /**
     * Efek Portrait Bokeh (kompatibilitas lama — kini juga tersedia non-destruktif dengan titik fokus geser)
     */
    applyPortraitBokeh(sourceCanvas, cxNorm = 0.5, cyNorm = 0.48, radiusNorm = 0.25) {
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;

        const sharpCopy = document.createElement('canvas');
        sharpCopy.width = w;
        sharpCopy.height = h;
        sharpCopy.getContext('2d').drawImage(sourceCanvas, 0, 0);

        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = w;
        blurCanvas.height = h;
        const bCtx = blurCanvas.getContext('2d');
        bCtx.filter = `blur(${Math.max(8, Math.round(Math.min(w, h) / 65))}px)`;
        bCtx.drawImage(sourceCanvas, 0, 0);
        bCtx.filter = 'none';

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext('2d');

        const cx = w * cxNorm;
        const cy = h * cyNorm;
        const innerR = Math.min(w, h) * radiusNorm;
        const outerR = Math.min(w, h) * (radiusNorm + 0.30);

        const grad = mCtx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        mCtx.fillStyle = grad;
        mCtx.fillRect(0, 0, w, h);

        mCtx.globalCompositeOperation = 'source-in';
        mCtx.drawImage(sharpCopy, 0, 0);

        const ctx = sourceCanvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(blurCanvas, 0, 0);
        ctx.drawImage(maskCanvas, 0, 0);
    },

    // =========================================================================
    // LIGHTROOM-STYLE OFFLINE AUTO MASKING ENGINE (SUBJECT / BACKGROUND / SKY)
    // =========================================================================

    /**
     * O(N) Box Filter berbasis Summed Area Table (Integral Image)
     */
    _boxFilter(src, w, h, r) {
        const W1 = w + 1;
        const S = new Float64Array(W1 * (h + 1));
        for (let y = 0; y < h; y++) {
            let rowSum = 0;
            const srcOff = y * w;
            const curOff = (y + 1) * W1;
            const prevOff = y * W1;
            for (let x = 0; x < w; x++) {
                rowSum += src[srcOff + x];
                S[curOff + x + 1] = S[prevOff + x + 1] + rowSum;
            }
        }
        const out = new Float32Array(w * h);
        for (let y = 0; y < h; y++) {
            const y0 = Math.max(0, y - r);
            const y1 = Math.min(h - 1, y + r);
            const r0 = y0 * W1;
            const r1 = (y1 + 1) * W1;
            const dy = y1 - y0 + 1;
            const outOff = y * w;
            for (let x = 0; x < w; x++) {
                const x0 = Math.max(0, x - r);
                const x1 = Math.min(w - 1, x + r);
                const sum = S[r1 + x1 + 1] - S[r0 + x1 + 1] - S[r1 + x0] + S[r0 + x0];
                out[outOff + x] = sum / ((x1 - x0 + 1) * dy);
            }
        }
        return out;
    },

    /**
     * 3-Channel Color Guided Image Filter (He et al.) — O(N) edge-preserving matting!
     * Membuat tepi mask menempel tajam pada kontur rambut, bahu, pepohonan, & gedung tanpa halo.
     */
    _colorGuidedFilter(data, p, w, h, radius = 6, eps = 0.002) {
        const n = w * h;
        const R = new Float32Array(n);
        const G = new Float32Array(n);
        const B = new Float32Array(n);
        for (let i = 0, k = 0; k < n; k++, i += 4) {
            R[k] = data[i] / 255;
            G[k] = data[i + 1] / 255;
            B[k] = data[i + 2] / 255;
        }

        const mR = this._boxFilter(R, w, h, radius);
        const mG = this._boxFilter(G, w, h, radius);
        const mB = this._boxFilter(B, w, h, radius);
        const mP = this._boxFilter(p, w, h, radius);

        const mul = (a, b) => {
            const c = new Float32Array(n);
            for (let i = 0; i < n; i++) c[i] = a[i] * b[i];
            return c;
        };

        const mRP = this._boxFilter(mul(R, p), w, h, radius);
        const mGP = this._boxFilter(mul(G, p), w, h, radius);
        const mBP = this._boxFilter(mul(B, p), w, h, radius);

        const mRR = this._boxFilter(mul(R, R), w, h, radius);
        const mRG = this._boxFilter(mul(R, G), w, h, radius);
        const mRB = this._boxFilter(mul(R, B), w, h, radius);
        const mGG = this._boxFilter(mul(G, G), w, h, radius);
        const mGB = this._boxFilter(mul(G, B), w, h, radius);
        const mBB = this._boxFilter(mul(B, B), w, h, radius);

        const aR = new Float32Array(n);
        const aG = new Float32Array(n);
        const aB = new Float32Array(n);
        const bCoef = new Float32Array(n);

        for (let i = 0; i < n; i++) {
            const rr = mRR[i] - mR[i] * mR[i] + eps;
            const rg = mRG[i] - mR[i] * mG[i];
            const rb = mRB[i] - mR[i] * mB[i];
            const gg = mGG[i] - mG[i] * mG[i] + eps;
            const gb = mGB[i] - mG[i] * mB[i];
            const bb = mBB[i] - mB[i] * mB[i] + eps;

            const covR = mRP[i] - mR[i] * mP[i];
            const covG = mGP[i] - mG[i] * mP[i];
            const covB = mBP[i] - mB[i] * mP[i];

            const c00 = gg * bb - gb * gb;
            const c01 = rb * gb - rg * bb;
            const c02 = rg * gb - gg * rb;
            const c11 = rr * bb - rb * rb;
            const c12 = rg * rb - rr * gb;
            const c22 = rr * gg - rg * rg;
            const det = rr * c00 + rg * c01 + rb * c02 || 1e-12;

            const ar = (c00 * covR + c01 * covG + c02 * covB) / det;
            const ag = (c01 * covR + c11 * covG + c12 * covB) / det;
            const ab = (c02 * covR + c12 * covG + c22 * covB) / det;

            aR[i] = ar;
            aG[i] = ag;
            aB[i] = ab;
            bCoef[i] = mP[i] - ar * mR[i] - ag * mG[i] - ab * mB[i];
        }

        const maR = this._boxFilter(aR, w, h, radius);
        const maG = this._boxFilter(aG, w, h, radius);
        const maB = this._boxFilter(aB, w, h, radius);
        const mBcoef = this._boxFilter(bCoef, w, h, radius);

        const q = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const v = maR[i] * R[i] + maG[i] * G[i] + maB[i] * B[i] + mBcoef[i];
            q[i] = v < 0 ? 0 : v > 1 ? 1 : v;
        }
        return q;
    },

    /**
     * Konversi RGB (0-255) ke CIELAB aproksimasi cepat untuk segmentasi persepsi warna
     */
    _rgbToLabBuffers(data, n) {
        const L = new Float32Array(n);
        const A = new Float32Array(n);
        const B = new Float32Array(n);
        for (let i = 0, p = 0; p < n; p++, i += 4) {
            let r = data[i] / 255;
            let g = data[i + 1] / 255;
            let b = data[i + 2] / 255;
            r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
            g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
            b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
            const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
            const y = (r * 0.2126 + g * 0.7152 + b * 0.0722);
            const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
            const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
            const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
            const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;
            L[p] = 116 * fy - 16;
            A[p] = 500 * (fx - fy);
            B[p] = 200 * (fy - fz);
        }
        return { L, A, B };
    },

    /**
     * K-Means cepat di ruang CIELAB (subsampling otomatis agar selalu < 3ms)
     */
    _kmeansLab(samples, k, iters = 7) {
        if (!samples.length) return [];
        const maxSamp = 900;
        let pts = samples;
        if (samples.length > maxSamp) {
            pts = [];
            const stride = samples.length / maxSamp;
            for (let i = 0; i < maxSamp; i++) pts.push(samples[Math.floor(i * stride)]);
        }
        const kk = Math.min(k, pts.length);
        const centers = [];
        const step = Math.max(1, Math.floor(pts.length / kk));
        for (let c = 0; c < kk; c++) {
            const s = pts[Math.min(pts.length - 1, c * step)];
            centers.push([s[0], s[1], s[2]]);
        }
        const sumL = new Float64Array(kk);
        const sumA = new Float64Array(kk);
        const sumB = new Float64Array(kk);
        const cnt = new Int32Array(kk);
        for (let it = 0; it < iters; it++) {
            sumL.fill(0); sumA.fill(0); sumB.fill(0); cnt.fill(0);
            for (let i = 0; i < pts.length; i++) {
                const s = pts[i];
                let best = 0, bestD = 1e18;
                for (let c = 0; c < kk; c++) {
                    const dl = s[0] - centers[c][0], da = s[1] - centers[c][1], db = s[2] - centers[c][2];
                    const d = dl * dl + da * da + db * db;
                    if (d < bestD) { bestD = d; best = c; }
                }
                sumL[best] += s[0]; sumA[best] += s[1]; sumB[best] += s[2]; cnt[best]++;
            }
            for (let c = 0; c < kk; c++) {
                if (cnt[c] > 0) {
                    centers[c][0] = sumL[c] / cnt[c];
                    centers[c][1] = sumA[c] / cnt[c];
                    centers[c][2] = sumB[c] / cnt[c];
                }
            }
        }
        return centers;
    },

    _minLabDist(l, a, b, centers) {
        let best = 1e9;
        for (let c = 0; c < centers.length; c++) {
            const dl = l - centers[c][0], da = a - centers[c][1], db = b - centers[c][2];
            const d = Math.sqrt(dl * dl + da * da + db * db);
            if (d < best) best = d;
        }
        return best;
    },

    /**
     * Isi lubang kecil di dalam subjek & buang bintik latar belakang terisolasi
     */
    _cleanupSubjectMask(mask, w, h, focusPt = null) {
        const n = w * h;
        const bin = new Uint8Array(n);
        for (let i = 0; i < n; i++) bin[i] = mask[i] >= 0.45 ? 1 : 0;

        // 1. Isi lubang interior (piksel 0 yang tidak terhubung ke tepi gambar)
        const bgReach = new Uint8Array(n);
        const q = new Int32Array(n);
        let head = 0, tail = 0;
        const pushBg = (p) => {
            if (!bgReach[p] && !bin[p]) {
                bgReach[p] = 1;
                q[tail++] = p;
            }
        };
        for (let x = 0; x < w; x++) { pushBg(x); pushBg((h - 1) * w + x); }
        for (let y = 0; y < h; y++) { pushBg(y * w); pushBg(y * w + w - 1); }
        while (head < tail) {
            const p = q[head++];
            const x = p % w, y = (p - x) / w;
            if (x > 0) pushBg(p - 1);
            if (x < w - 1) pushBg(p + 1);
            if (y > 0) pushBg(p - w);
            if (y < h - 1) pushBg(p + w);
        }

        const out = new Float32Array(mask);
        for (let i = 0; i < n; i++) {
            if (!bin[i] && !bgReach[i]) {
                out[i] = Math.max(out[i], 0.92);
                bin[i] = 1;
            }
        }

        // 2. Temukan komponen terhubung subjek -> buang serpihan kecil / distraktor tepi atas (atau pertahankan komponen Tap-to-Focus)
        const labels = new Int32Array(n);
        const sizes = [0];
        const touchesTop = [false];
        let nextLabel = 1;
        const topEdgeLimit = Math.max(2, Math.round(h * 0.08));
        for (let i = 0; i < n; i++) {
            if (!bin[i] || labels[i]) continue;
            let h2 = 0, t2 = 0;
            let hitTop = false;
            q[t2++] = i;
            labels[i] = nextLabel;
            while (h2 < t2) {
                const p = q[h2++];
                const x = p % w, y = (p - x) / w;
                if (y < topEdgeLimit) hitTop = true;
                const tryN = (np) => {
                    if (bin[np] && !labels[np]) { labels[np] = nextLabel; q[t2++] = np; }
                };
                if (x > 0) tryN(p - 1);
                if (x < w - 1) tryN(p + 1);
                if (y > 0) tryN(p - w);
                if (y < h - 1) tryN(p + w);
            }
            sizes.push(t2);
            touchesTop.push(hitTop);
            nextLabel++;
        }

        let maxComp = 0;
        let maxLabel = 0;
        for (let c = 1; c < sizes.length; c++) {
            if (sizes[c] > maxComp) { maxComp = sizes[c]; maxLabel = c; }
        }

        let focusLabel = 0;
        if (focusPt && maxComp > 0) {
            const fx = Math.min(w - 1, Math.max(0, Math.round(focusPt.x * (w - 1))));
            const fy = Math.min(h - 1, Math.max(0, Math.round(focusPt.y * (h - 1))));
            focusLabel = labels[fy * w + fx];
            if (!focusLabel) {
                let bestD = 1e9;
                for (let i = 0; i < n; i++) {
                    const lb = labels[i];
                    if (!lb || sizes[lb] < 12) continue;
                    const x = i % w, y = (i - x) / w;
                    const d = (x - fx) * (x - fx) + (y - fy) * (y - fy);
                    if (d < bestD) { bestD = d; focusLabel = lb; }
                }
            }
        }

        if (maxComp > 0) {
            const keepThr = Math.max(20, maxComp * 0.22);
            for (let i = 0; i < n; i++) {
                const lb = labels[i];
                if (focusLabel > 0) {
                    if (lb !== focusLabel) out[i] = 0;
                } else if (lb > 0) {
                    const isSmallIsland = sizes[lb] < keepThr;
                    const isTopDistractor = lb !== maxLabel && touchesTop[lb] && sizes[lb] < maxComp * 0.65;
                    if (isSmallIsland || isTopDistractor) out[i] = 0;
                }
            }
        }
        return out;
    },

    /**
     * Render array float [0..1] menjadi kanvas alpha putih (ukuran outW x outH)
     */
    _floatMaskToCanvas(mask, sw, sh, outW, outH) {
        const sc = document.createElement('canvas');
        sc.width = sw;
        sc.height = sh;
        const sCtx = sc.getContext('2d');
        const id = sCtx.createImageData(sw, sh);
        const d = id.data;
        for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
            d[i] = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
            d[i + 3] = Math.round(Math.min(1, Math.max(0, mask[p])) * 255);
        }
        sCtx.putImageData(id, 0, 0);

        const out = document.createElement('canvas');
        out.width = outW;
        out.height = outH;
        const oCtx = out.getContext('2d');
        oCtx.imageSmoothingEnabled = true;
        oCtx.imageSmoothingQuality = 'high';
        oCtx.drawImage(sc, 0, 0, outW, outH);
        return out;
    },

    /**
     * Core Subject Probability Map [0..1] pada resolusi kerja (≤240px)
     * Menggunakan:
     * 1. Portrait-aware Border Model (tepi kiri, kanan, atas + sudut bawah — subjek yang menyentuh tepi bawah tetap terdeteksi!)
     * 2. Minimum Barrier Distance (MBD) dari tepi latar
     * 3. 2-Stage GrabCut-inspired FG/BG CIELAB K-Means Likelihood
     * 4. Connected-component cleanup + hole filling + 3-Channel Color Guided Filter
     */
    _computeSubjectProbability(sourceCanvas, focusPt = null) {
        const maxSide = 240;
        const scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
        const sw = Math.max(24, Math.round(sourceCanvas.width * scale));
        const sh = Math.max(24, Math.round(sourceCanvas.height * scale));
        const n = sw * sh;

        const work = document.createElement('canvas');
        work.width = sw;
        work.height = sh;
        const wCtx = work.getContext('2d', { willReadFrequently: true });
        wCtx.drawImage(sourceCanvas, 0, 0, sw, sh);
        const data = wCtx.getImageData(0, 0, sw, sh).data;
        const { L, A, B } = this._rgbToLabBuffers(data, n);

        // 1. Model warna tepi utama (kiri, kanan, atas + sudut bawah 20%)
        const borderSamples = [];
        const bw = Math.max(3, Math.round(Math.min(sw, sh) * 0.045));
        const botSide = Math.round(sw * 0.22);
        for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                const isTop = y < bw;
                const isSide = x < bw || x >= sw - bw;
                const isBotCorner = y >= sh - bw && (x < botSide || x >= sw - botSide);
                if (isTop || isSide || isBotCorner) {
                    const p = y * sw + x;
                    borderSamples.push([L[p], A[p], B[p]]);
                }
            }
        }
        const bgInit = this._kmeansLab(borderSamples, 6, 7);

        // 2. Minimum Barrier Distance (MBD) — tepi bawah-tengah hanya jadi seed BG jika warnanya dekat dengan BG tepi lain
        const dist = new Float32Array(n).fill(1e9);
        const minL = new Float32Array(n), maxL = new Float32Array(n);
        const minA = new Float32Array(n), maxA = new Float32Array(n);
        const minB = new Float32Array(n), maxB = new Float32Array(n);
        for (let p = 0; p < n; p++) {
            minL[p] = maxL[p] = L[p];
            minA[p] = maxA[p] = A[p];
            minB[p] = maxB[p] = B[p];
        }
        for (let x = 0; x < sw; x++) {
            dist[x] = 0; // tepi atas
            const bp = (sh - 1) * sw + x;
            if (x < botSide || x >= sw - botSide || this._minLabDist(L[bp], A[bp], B[bp], bgInit) < 18) {
                dist[bp] = 0;
            }
        }
        for (let y = 0; y < sh; y++) {
            dist[y * sw] = 0;
            dist[y * sw + sw - 1] = 0;
        }

        const relax = (p, q) => {
            const nl0 = Math.min(minL[q], L[p]), nl1 = Math.max(maxL[q], L[p]);
            const na0 = Math.min(minA[q], A[p]), na1 = Math.max(maxA[q], A[p]);
            const nb0 = Math.min(minB[q], B[p]), nb1 = Math.max(maxB[q], B[p]);
            const d = (nl1 - nl0) + (na1 - na0) * 1.2 + (nb1 - nb0) * 1.2;
            if (d < dist[p]) {
                dist[p] = d;
                minL[p] = nl0; maxL[p] = nl1;
                minA[p] = na0; maxA[p] = na1;
                minB[p] = nb0; maxB[p] = nb1;
            }
        };

        for (let pass = 0; pass < 3; pass++) {
            for (let y = 1; y < sh - 1; y++) {
                const row = y * sw;
                for (let x = 1; x < sw - 1; x++) {
                    const p = row + x;
                    relax(p, p - 1); relax(p, p - sw); relax(p, p - sw - 1); relax(p, p - sw + 1);
                }
            }
            for (let y = sh - 2; y >= 1; y--) {
                const row = y * sw;
                for (let x = sw - 2; x >= 1; x--) {
                    const p = row + x;
                    relax(p, p + 1); relax(p, p + sw); relax(p, p + sw + 1); relax(p, p + sw - 1);
                }
            }
        }

        // 3. Border contrast + Center Prior lembut (sedikit bias ke bawah untuk potret manusia)
        const bgContrast = new Float32Array(n);
        let maxMbd = 1e-5, maxBg = 1e-5;
        for (let p = 0; p < n; p++) {
            if (dist[p] > maxMbd) maxMbd = dist[p];
            const dBg = this._minLabDist(L[p], A[p], B[p], bgInit);
            bgContrast[p] = dBg;
            if (dBg > maxBg) maxBg = dBg;
        }

        const sal = new Float32Array(n);
        const cx = focusPt ? focusPt.x * sw : sw * 0.5;
        const cy = focusPt ? focusPt.y * sh : sh * 0.53;
        const rx2 = focusPt ? 2 * (sw * 0.24) * (sw * 0.24) : 2 * (sw * 0.48) * (sw * 0.48);
        const ry2 = focusPt ? 2 * (sh * 0.34) * (sh * 0.34) : 2 * (sh * 0.52) * (sh * 0.52);
        const basePrior = focusPt ? 0.14 : 0.46;
        const peakPrior = 1 - basePrior;
        for (let y = 0, p = 0; y < sh; y++) {
            const dy = y - cy;
            const gy = (dy * dy) / ry2;
            for (let x = 0; x < sw; x++, p++) {
                const dx = x - cx;
                const centerPrior = basePrior + peakPrior * Math.exp(-((dx * dx) / rx2 + gy));
                const sMbd = Math.min(1, dist[p] / (maxMbd * 0.78));
                const sBg = Math.min(1, bgContrast[p] / (maxBg * 0.72));
                sal[p] = (0.56 * sMbd + 0.44 * sBg) * centerPrior;
            }
        }

        // 4. Otsu Adaptive Threshold pada peta saliency awal
        const otsuThr = (arr) => {
            const hist = new Uint32Array(256);
            for (let p = 0; p < n; p++) hist[Math.min(255, Math.max(0, Math.round(arr[p] * 255)))]++;
            let sumAll = 0;
            for (let i = 0; i < 256; i++) sumAll += i * hist[i];
            let sumB = 0, wB = 0, maxVar = -1, thr = 96;
            for (let i = 0; i < 256; i++) {
                wB += hist[i];
                if (wB === 0) continue;
                const wF = n - wB;
                if (wF === 0) break;
                sumB += i * hist[i];
                const mB = sumB / wB;
                const mF = (sumAll - sumB) / wF;
                const v = wB * wF * (mB - mF) * (mB - mF);
                if (v > maxVar) { maxVar = v; thr = i; }
            }
            return thr / 255;
        };

        const t1 = Math.min(0.68, Math.max(0.20, otsuThr(sal) * 0.94));

        // 5. GrabCut-style Stage 2: bangun model warna Foreground & Background dari saliency awal (atau fokus tap)
        const fgSamples = [];
        const bgSamples2 = [];
        if (focusPt) {
            const seedR = Math.max(4, Math.min(sw, sh) * 0.085);
            const seedR2 = seedR * seedR;
            const farRx = sw * 0.34;
            const farRy = sh * 0.46;
            for (let y = 0, p = 0; y < sh; y++) {
                const dy = y - cy;
                for (let x = 0; x < sw; x++, p++) {
                    const dx = x - cx;
                    const d2 = dx * dx + dy * dy;
                    const ell = (dx * dx) / (farRx * farRx) + (dy * dy) / (farRy * farRy);
                    if (d2 <= seedR2 || (ell < 0.72 && sal[p] > Math.min(0.84, t1 + 0.16))) {
                        fgSamples.push([L[p], A[p], B[p]]);
                    } else if (ell > 1.05 || sal[p] < Math.max(0.14, t1 - 0.10)) {
                        bgSamples2.push([L[p], A[p], B[p]]);
                    }
                }
            }
        } else {
            for (let p = 0; p < n; p++) {
                if (sal[p] > Math.min(0.88, t1 + 0.14)) fgSamples.push([L[p], A[p], B[p]]);
                else if (sal[p] < Math.max(0.12, t1 - 0.12)) bgSamples2.push([L[p], A[p], B[p]]);
            }
        }

        const prob = new Float32Array(n);
        if (fgSamples.length > 25 && bgSamples2.length > 25) {
            const fgCenters = this._kmeansLab(fgSamples, focusPt ? 4 : 5, 6);
            const bgCenters2 = this._kmeansLab(bgSamples2, 6, 6);
            for (let y = 0, p = 0; y < sh; y++) {
                const dy = y - cy;
                const gy = (dy * dy) / ry2;
                for (let x = 0; x < sw; x++, p++) {
                    const dFg = this._minLabDist(L[p], A[p], B[p], fgCenters);
                    const dBg = this._minLabDist(L[p], A[p], B[p], bgCenters2);
                    const colorProb = dBg / (dFg + dBg + 1e-4);
                    const sSoft = Math.min(1, Math.max(0, (sal[p] - (t1 - 0.18)) / 0.36));
                    if (focusPt) {
                        const dx = x - cx;
                        const spat = Math.exp(-((dx * dx) / (rx2 * 1.4) + gy * 0.85));
                        prob[p] = (0.42 * sSoft + 0.58 * colorProb) * (0.22 + 0.78 * spat);
                    } else {
                        prob[p] = 0.52 * sSoft + 0.48 * colorProb;
                    }
                }
            }
        } else {
            for (let p = 0; p < n; p++) {
                prob[p] = Math.min(1, Math.max(0, (sal[p] - (t1 - 0.14)) / 0.28));
            }
        }

        // 6. Threshold lunak + pembersihan komponen/lubang + 3-Channel Color Guided Filter
        const t2 = Math.min(0.66, Math.max(0.32, otsuThr(prob) * (focusPt ? 1.02 : 0.96)));
        const soft = new Float32Array(n);
        const band = 0.13;
        for (let p = 0; p < n; p++) {
            const v = (prob[p] - (t2 - band)) / (band * 2);
            const t = Math.min(1, Math.max(0, v));
            soft[p] = t * t * (3 - 2 * t);
        }

        const cleaned = this._cleanupSubjectMask(soft, sw, sh, focusPt);
        const guided = this._colorGuidedFilter(data, cleaned, sw, sh, Math.max(4, Math.round(Math.min(sw, sh) * 0.035)), 0.0018);

        // Kontras akhir agar subjek solid & tepi menempel tajam
        for (let p = 0; p < n; p++) {
            const v = (guided[p] - 0.22) / 0.56;
            const t = Math.min(1, Math.max(0, v));
            guided[p] = t * t * (3 - 2 * t);
        }

        return { mask: guided, sw, sh };
    },

    /**
     * Auto Select Subject (Lightroom-style, 100% Offline, opsional Tap-to-Focus point)
     */
    detectSubjectMask(sourceCanvas, outW, outH, focusPt = null) {
        const { mask, sw, sh } = this._computeSubjectProbability(sourceCanvas, focusPt);
        return this._floatMaskToCanvas(mask, sw, sh, outW || sourceCanvas.width, outH || sourceCanvas.height);
    },

    /**
     * Auto Select Background (Lightroom-style, 100% Offline — kebalikan akurat dari Subjek)
     */
    detectBackgroundMask(sourceCanvas, outW, outH) {
        const { mask, sw, sh } = this._computeSubjectProbability(sourceCanvas);
        const bg = new Float32Array(mask.length);
        for (let i = 0; i < mask.length; i++) bg[i] = 1 - mask[i];
        return this._floatMaskToCanvas(bg, sw, sh, outW || sourceCanvas.width, outH || sourceCanvas.height);
    },

    /**
     * Auto Select Sky (Lightroom-style, 100% Offline):
     * - Filter kehalusan tekstur (gradient magnitude) agar daun/rambut/gedung di tepi atas tidak ikut terambil
     * - Model warna Langit (atas, halus) vs Ground/Objek (bawah) di ruang CIELAB
     * - Propagasi gradasi lembut (mendukung langit biru->putih, mendung, maupun sunset oranye)
     * - Pemulihan celah langit di antara pepohonan/bangunan + 3-Channel Color Guided Filter
     */
    detectSkyMask(sourceCanvas, outW, outH) {
        const maxSide = 240;
        const scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
        const sw = Math.max(24, Math.round(sourceCanvas.width * scale));
        const sh = Math.max(24, Math.round(sourceCanvas.height * scale));
        const n = sw * sh;

        const work = document.createElement('canvas');
        work.width = sw;
        work.height = sh;
        const wCtx = work.getContext('2d', { willReadFrequently: true });
        wCtx.drawImage(sourceCanvas, 0, 0, sw, sh);
        const data = wCtx.getImageData(0, 0, sw, sh).data;
        const { L, A, B } = this._rgbToLabBuffers(data, n);

        // 1. Peta gradien lokal (langit halus; daun, gedung, rambut bertekstur tajam)
        const grad = new Float32Array(n);
        for (let y = 1; y < sh - 1; y++) {
            const row = y * sw;
            for (let x = 1; x < sw - 1; x++) {
                const p = row + x;
                const gx = Math.abs(L[p + 1] - L[p - 1]) + 0.6 * (Math.abs(A[p + 1] - A[p - 1]) + Math.abs(B[p + 1] - B[p - 1]));
                const gy = Math.abs(L[p + sw] - L[p - sw]) + 0.6 * (Math.abs(A[p + sw] - A[p - sw]) + Math.abs(B[p + sw] - B[p - sw]));
                grad[p] = Math.hypot(gx, gy);
            }
        }
        const smoothGrad = this._boxFilter(grad, sw, sh, 2);

        // 2. Prior warna langit (biru/cyan, mendung terang/netral, sunset emas/pink, senja)
        const skyColorPrior = new Float32Array(n);
        for (let p = 0; p < n; p++) {
            const l = L[p], a = A[p], b = B[p];
            const chroma = Math.hypot(a, b);
            const isBlueSky = b < 4 && a < 16 && l > 18;
            const isOvercast = l > 52 && chroma < 18;
            const isSunset = l > 35 && b > -2 && a > -6 && a < 45;
            const isNightSky = l < 32 && b < 8 && smoothGrad[p] < 6;
            const isGreenFoliage = a < -10 && b > 8;
            let pr = 0.55;
            if (isBlueSky) pr = 1.0;
            else if (isOvercast) pr = 0.94;
            else if (isSunset) pr = 0.85;
            else if (isNightSky) pr = 0.72;
            if (isGreenFoliage) pr *= 0.25;
            const smoothFactor = Math.exp(-(smoothGrad[p] * smoothGrad[p]) / (2 * 16 * 16));
            skyColorPrior[p] = pr * (0.38 + 0.62 * smoothFactor);
        }

        // 3. Sampel langit dari 20% bagian atas yang halus & mirip langit + sampel ground dari 28% terbawah
        const topH = Math.max(6, Math.round(sh * 0.20));
        const topSamples = [];
        for (let y = 0; y < topH; y++) {
            for (let x = 0; x < sw; x++) {
                const p = y * sw + x;
                if (smoothGrad[p] < 18 && skyColorPrior[p] > 0.45) {
                    topSamples.push([L[p], A[p], B[p]]);
                }
            }
        }
        // Fallback jika tepi atas bertekstur (mis. awan dramatis)
        if (topSamples.length < 20) {
            const fbH = Math.max(4, Math.round(sh * 0.1));
            for (let y = 0; y < fbH; y++) {
                for (let x = 0; x < sw; x++) {
                    const p = y * sw + x;
                    topSamples.push([L[p], A[p], B[p]]);
                }
            }
        }

        const botStart = Math.round(sh * 0.72);
        const groundSamples = [];
        for (let y = botStart; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                const p = y * sw + x;
                groundSamples.push([L[p], A[p], B[p]]);
            }
        }

        const skyCenters = this._kmeansLab(topSamples, 4, 7);
        const groundCenters = this._kmeansLab(groundSamples, 5, 7);

        // 4. Skor kemiripan langit per piksel (mempertimbangkan warna langit vs ground + posisi vertikal)
        const skyScore = new Float32Array(n);
        for (let y = 0, p = 0; y < sh; y++) {
            const yFrac = y / sh;
            const yPrior = yFrac < 0.58 ? 1.0 : Math.max(0.05, 1 - (yFrac - 0.58) / 0.36);
            for (let x = 0; x < sw; x++, p++) {
                let bestSky = 1e9;
                for (let c = 0; c < skyCenters.length; c++) {
                    const dl = L[p] - skyCenters[c][0], da = A[p] - skyCenters[c][1], db = B[p] - skyCenters[c][2];
                    // Bobot luminance sedikit lebih longgar agar gradasi langit (biru tua -> terang di horizon) tetap menyatu
                    const d = Math.sqrt(dl * dl * 0.55 + da * da + db * db);
                    if (d < bestSky) bestSky = d;
                }
                const bestGnd = this._minLabDist(L[p], A[p], B[p], groundCenters);
                const skySim = Math.exp(-(bestSky * bestSky) / (2 * 28 * 28));
                const vsGround = bestGnd / (bestSky + bestGnd + 1e-4);
                skyScore[p] = (0.62 * skySim + 0.38 * vsGround) * (0.45 + 0.55 * skyColorPrior[p]) * yPrior;
            }
        }

        // 5. Gradient-aware BFS dari tepi atas (baris 0..3) yang berhenti pada kontur tajam
        const visited = new Uint8Array(n);
        const mask = new Float32Array(n);
        const queue = new Int32Array(n);
        let head = 0, tail = 0;
        const seedRows = Math.min(4, sh);
        for (let y = 0; y < seedRows; y++) {
            for (let x = 0; x < sw; x++) {
                const p = y * sw + x;
                if (!visited[p] && skyScore[p] > 0.34) {
                    visited[p] = 1;
                    queue[tail++] = p;
                }
            }
        }

        const colHorizon = new Int32Array(sw).fill(0);
        while (head < tail) {
            const p = queue[head++];
            const x = p % sw, y = (p - x) / sw;
            if (y > colHorizon[x]) colHorizon[x] = y;
            mask[p] = Math.min(1, skyScore[p] * 1.45);

            const tryPush = (np) => {
                if (visited[np]) return;
                const dl = L[np] - L[p], da = A[np] - A[p], db = B[np] - B[p];
                const edgeJump = Math.sqrt(dl * dl * 0.7 + da * da + db * db);
                if (skyScore[np] > 0.32 && edgeJump < 20) {
                    visited[np] = 1;
                    queue[tail++] = np;
                }
            };
            if (x > 0) tryPush(p - 1);
            if (x < sw - 1) tryPush(p + 1);
            if (y > 0) tryPush(p - sw);
            if (y < sh - 1) tryPush(p + sw);
        }

        // 6. Pemulihan kantong langit kecil di sela-sela ranting/bangunan di atas garis horizon
        for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                const p = y * sw + x;
                if (!visited[p] && y <= colHorizon[x] + Math.round(sh * 0.04)) {
                    const dSky = this._minLabDist(L[p], A[p], B[p], skyCenters);
                    if (dSky < 16 && skyScore[p] > 0.56) {
                        mask[p] = Math.min(1, skyScore[p] * 1.2);
                    }
                }
            }
        }

        // 7. 3-Channel Color Guided Filter agar tepi ranting, atap, & gunung sangat rapi
        const guided = this._colorGuidedFilter(data, mask, sw, sh, Math.max(4, Math.round(Math.min(sw, sh) * 0.03)), 0.0015);
        for (let p = 0; p < n; p++) {
            const v = (guided[p] - 0.24) / 0.52;
            const t = Math.min(1, Math.max(0, v));
            guided[p] = t * t * (3 - 2 * t);
        }

        return this._floatMaskToCanvas(guided, sw, sh, outW || sourceCanvas.width, outH || sourceCanvas.height);
    },

    // =========================================================================
    // DETAIL ENGINE (Real Unsharp Mask Sharpness, Global Clarity, Texture, Edge-Preserving Denoise)
    // =========================================================================
    _getScratch(key, w, h) {
        if (!this._scratch) this._scratch = {};
        let c = this._scratch[key];
        if (!c) { c = document.createElement('canvas'); this._scratch[key] = c; }
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        return c;
    },

    applyDetailEnhancements(targetCanvas, opts) {
        const sharpness = opts.sharpness || 0;
        const clarity = opts.clarity || 0;
        const texture = opts.texture || 0;
        const denoise = opts.denoise || 0;
        if (!sharpness && !clarity && !texture && !denoise) return;

        const w = targetCanvas.width;
        const h = targetCanvas.height;
        const minSide = Math.min(w, h);
        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
        const blurCv = this._getScratch('detBlur', w, h);
        const bCtx = blurCv.getContext('2d', { willReadFrequently: true });

        const makeBlurData = (radPx) => {
            bCtx.clearRect(0, 0, w, h);
            bCtx.filter = `blur(${radPx.toFixed(2)}px)`;
            bCtx.drawImage(targetCanvas, 0, 0);
            bCtx.filter = 'none';
            return bCtx.getImageData(0, 0, w, h).data;
        };

        // 1. Edge-Preserving Denoise / Skin Smooth (dijalankan sebelum sharpening agar noise tidak ikut dipertajam)
        if (denoise > 0) {
            const dn = Math.min(100, denoise) / 100;
            const rad = Math.max(1.2, dn * 0.005 * minSide + 1.0);
            const bd = makeBlurData(rad);
            const img = ctx.getImageData(0, 0, w, h);
            const d = img.data;
            const thr = 10 + dn * 32;
            const inv2Thr2 = 1 / (2 * thr * thr);
            const strength = dn * 0.84;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] === 0) continue;
                const dr = d[i] - bd[i];
                const dg = d[i + 1] - bd[i + 1];
                const db = d[i + 2] - bd[i + 2];
                const diff = Math.abs(dr) * 0.34 + Math.abs(dg) * 0.48 + Math.abs(db) * 0.18;
                const wEdge = Math.exp(-(diff * diff) * inv2Thr2) * strength;
                d[i] = d[i] - dr * wEdge;
                d[i + 1] = d[i + 1] - dg * wEdge;
                d[i + 2] = d[i + 2] - db * wEdge;
            }
            ctx.putImageData(img, 0, 0);
        }

        // 2. Global Clarity (Kontras mikro midtone)
        if (clarity !== 0) {
            const cl = clarity / 100;
            const rad = Math.max(3, minSide * 0.015);
            const bd = makeBlurData(rad);
            const img = ctx.getImageData(0, 0, w, h);
            const d = img.data;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] === 0) continue;
                const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
                const midW = Math.max(0.14, 1 - Math.abs(lum - 0.5) * 1.72);
                const k = cl * midW * 1.05;
                d[i] = d[i] + (d[i] - bd[i]) * k;
                d[i + 1] = d[i + 1] + (d[i + 1] - bd[i + 1]) * k;
                d[i + 2] = d[i + 2] + (d[i + 2] - bd[i + 2]) * k;
            }
            ctx.putImageData(img, 0, 0);
        }

        // 3. Global Texture (Detail halus — negatif menghaluskan kulit, positif menonjolkan tekstur kain/batu/rambut)
        if (texture !== 0) {
            const tx = texture / 100;
            const rad = Math.max(1.2, minSide * 0.0038);
            const bd = makeBlurData(rad);
            const img = ctx.getImageData(0, 0, w, h);
            const d = img.data;
            const k = tx * 0.72;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] === 0) continue;
                d[i] = d[i] + (d[i] - bd[i]) * k;
                d[i + 1] = d[i + 1] + (d[i + 1] - bd[i + 1]) * k;
                d[i + 2] = d[i + 2] + (d[i + 2] - bd[i + 2]) * k;
            }
            ctx.putImageData(img, 0, 0);
        }

        // 4. Real Sharpness (Luminance-Preserving Unsharp Mask dengan noise-gate agar langit tetap bersih)
        if (sharpness > 0) {
            const sh = Math.min(100, sharpness) / 100;
            const rad = Math.max(0.75, minSide * 0.0014);
            const bd = makeBlurData(rad);
            const img = ctx.getImageData(0, 0, w, h);
            const d = img.data;
            const gain = sh * 1.45;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] === 0) continue;
                const lOrig = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                const lBlur = 0.299 * bd[i] + 0.587 * bd[i + 1] + 0.114 * bd[i + 2];
                const diff = lOrig - lBlur;
                const ad = Math.abs(diff);
                if (ad < 1.6) continue;
                const gate = Math.min(1, (ad - 1.6) / 3.5);
                const add = diff * gain * gate;
                d[i] = d[i] + add;
                d[i + 1] = d[i + 1] + add;
                d[i + 2] = d[i + 2] + add;
            }
            ctx.putImageData(img, 0, 0);
        }
    },

    // =========================================================================
    // SMART PORTRAIT LENS BLUR (AI Subject-Aware DSLR Bokeh — Zero Halo + Specular Bloom)
    // =========================================================================
    applySmartLensBlur(targetCanvas, subjectMaskCanvas, cfg) {
        if (!cfg || !subjectMaskCanvas) return;
        const amount = Math.max(0, Math.min(100, cfg.amount || 0));
        const previewFocus = !!cfg.previewFocus;
        if (amount <= 0 && !previewFocus) return;

        const w = targetCanvas.width;
        const h = targetCanvas.height;
        const maxSide = Math.max(w, h);
        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });

        // 1. Skala & perhalus mask subjek sesuai parameter feather & protect (expand/contract area tajam)
        const maskCv = this._getScratch('lbMask', w, h);
        const mCtx = maskCv.getContext('2d', { willReadFrequently: true });
        mCtx.clearRect(0, 0, w, h);
        const featherPx = ((cfg.feather ?? 18) / 100) * 0.014 * maxSide;
        mCtx.filter = featherPx > 0.5 ? `blur(${featherPx.toFixed(2)}px)` : 'none';
        mCtx.drawImage(subjectMaskCanvas, 0, 0, w, h);
        mCtx.filter = 'none';
        const mData = mCtx.getImageData(0, 0, w, h).data;

        const n = w * h;
        const blurMask = new Float32Array(n);
        const protectBias = ((cfg.protect ?? 0) / 100) * 0.85; // positif = perluas area tajam subjek
        const inv = !!cfg.invert;
        for (let p = 0, i = 0; p < n; p++, i += 4) {
            let subj = mData[i + 3] / 255;
            if (protectBias !== 0) {
                const v = (subj + protectBias - 0.15) / 0.7;
                const t = Math.min(1, Math.max(0, v));
                subj = t * t * (3 - 2 * t);
            }
            const sharp = inv ? 1 - subj : subj;
            blurMask[p] = 1 - sharp;
        }

        const origImg = ctx.getImageData(0, 0, w, h);
        const od = origImg.data;

        // 2. Render DSLR Background Blur bebas halo (Normalized-Alpha Convolution + Highlight Bokeh Bloom)
        if (amount > 0) {
            const bgCv = this._getScratch('lbBg', w, h);
            const bgCtx = bgCv.getContext('2d', { willReadFrequently: true });
            const bgImg = bgCtx.createImageData(w, h);
            const bd = bgImg.data;
            const bokehBoost = ((cfg.bokeh ?? 35) / 100) * (0.4 + 0.6 * (amount / 100));

            for (let p = 0, i = 0; p < n; p++, i += 4) {
                const bm = blurMask[p];
                let r = od[i], g = od[i + 1], b = od[i + 2];
                if (bokehBoost > 0.02 && bm > 0.2) {
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    if (lum > 175) {
                        const s = (lum - 175) / 80;
                        const boost = s * s * bokehBoost * 135;
                        r += boost;
                        g += boost * 0.98;
                        b += boost * 0.94;
                    }
                }
                bd[i] = r;
                bd[i + 1] = g;
                bd[i + 2] = b;
                bd[i + 3] = Math.round(bm * 255);
            }
            bgCtx.putImageData(bgImg, 0, 0);

            const blurRad = (amount / 100) * 0.022 * maxSide + 1.4;
            const outBlurCv = this._getScratch('lbBlur', w, h);
            const obCtx = outBlurCv.getContext('2d', { willReadFrequently: true });
            obCtx.clearRect(0, 0, w, h);
            obCtx.filter = `blur(${blurRad.toFixed(2)}px)`;
            obCtx.drawImage(bgCv, 0, 0);
            obCtx.filter = 'none';
            const bData = obCtx.getImageData(0, 0, w, h).data;

            // Fallback blur penuh tipis hanya dipakai jika alpha normalized sangat tipis di celah sempit
            const fullBlurCv = this._getScratch('lbFull', w, h);
            const fbCtx = fullBlurCv.getContext('2d', { willReadFrequently: true });
            fbCtx.clearRect(0, 0, w, h);
            fbCtx.filter = `blur(${(blurRad * 0.85).toFixed(2)}px)`;
            fbCtx.drawImage(targetCanvas, 0, 0);
            fbCtx.filter = 'none';
            const fData = fbCtx.getImageData(0, 0, w, h).data;

            for (let p = 0, i = 0; p < n; p++, i += 4) {
                const bm = blurMask[p];
                if (bm < 0.005) continue;
                const ba = bData[i + 3] / 255;
                let rr = bData[i], gg = bData[i + 1], bb = bData[i + 2];
                if (ba < 0.25) {
                    const t = ba / 0.25;
                    rr = fData[i] * (1 - t) + rr * t;
                    gg = fData[i + 1] * (1 - t) + gg * t;
                    bb = fData[i + 2] * (1 - t) + bb * t;
                }
                const sharp = 1 - bm;
                od[i] = od[i] * sharp + rr * bm;
                od[i + 1] = od[i + 1] * sharp + gg * bm;
                od[i + 2] = od[i + 2] * sharp + bb * bm;
            }
        }

        // 3. Visualisasi Peta Fokus (jika tombol 👁 CEK FOKUS aktif: kuning hangat = area tajam, biru = area blur)
        if (previewFocus) {
            for (let p = 0, i = 0; p < n; p++, i += 4) {
                const bm = blurMask[p];
                const sharp = 1 - bm;
                od[i] = od[i] * 0.65 + (sharp * 255 + bm * 48) * 0.35;
                od[i + 1] = od[i + 1] * 0.65 + (sharp * 185 + bm * 115) * 0.35;
                od[i + 2] = od[i + 2] * 0.65 + (sharp * 70 + bm * 220) * 0.35;
            }
        }

        ctx.putImageData(origImg, 0, 0);

        // Gambar reticle titik Tap-to-Focus saat mode 👁 CEK FOKUS aktif
        if (previewFocus && cfg.focusPt) {
            const fx = cfg.focusPt.x * w;
            const fy = cfg.focusPt.y * h;
            const rad = Math.max(10, Math.min(w, h) * 0.028);
            ctx.save();
            ctx.strokeStyle = '#ffb547';
            ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.004);
            ctx.beginPath(); ctx.arc(fx, fy, rad, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(fx - rad * 1.45, fy); ctx.lineTo(fx - rad * 0.5, fy);
            ctx.moveTo(fx + rad * 0.5, fy); ctx.lineTo(fx + rad * 1.45, fy);
            ctx.moveTo(fx, fy - rad * 1.45); ctx.lineTo(fx, fy - rad * 0.5);
            ctx.moveTo(fx, fy + rad * 0.5); ctx.lineTo(fx, fy + rad * 1.45);
            ctx.stroke();
            ctx.restore();
        }
    }
};

window.AITools = AITools;
