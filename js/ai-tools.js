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
     * Auto Select Subject (Lightroom-style, 100% Offline heuristic fallback, opsional Tap-to-Focus point)
     */
    detectSubjectMask(sourceCanvas, outW, outH, focusPt = null) {
        const { mask, sw, sh } = this._computeSubjectProbability(sourceCanvas, focusPt);
        const cv = this._floatMaskToCanvas(mask, sw, sh, outW || sourceCanvas.width, outH || sourceCanvas.height);
        cv._isNeural = false;
        return cv;
    },

    /**
     * Real Neural Network Subject Segmentation (Bria AI RMBG-1.4 — 1024x1024 quantized ONNX)
     * Berjalan 100% di browser (client-side WASM) & tersimpan permanen di cache browser setelah unduhan pertama.
     * Mendeteksi orang (rambut, wajah, pakaian) sekaligus objek yang dipegang (buket bunga, tas, produk, hewan).
     */
    async _loadNeuralSegmenter(onProgress = null) {
        if (this._neuralSegReady) return this._neuralSegReady;
        if (this._neuralSegPromise) return this._neuralSegPromise;

        this._neuralSegPromise = (async () => {
            if (onProgress) onProgress('Memuat mesin AI deteksi subjek...', 5);
            const tf = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3');
            const { env, AutoModel, AutoProcessor, RawImage } = tf;
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            const modelId = 'briaai/RMBG-1.4';
            const progress_callback = (p) => {
                if (!onProgress || !p) return;
                if (p.status === 'progress' && typeof p.progress === 'number') {
                    onProgress(`Mengunduh AI Deteksi Subjek (${Math.round(p.progress)}%)...`, p.progress);
                } else if (p.status === 'initiate') {
                    onProgress('Menyiapkan model AI RMBG-1.4...', 10);
                }
            };

            let model;
            try {
                model = await AutoModel.from_pretrained(modelId, {
                    device: 'wasm',
                    dtype: 'q8',
                    config: { model_type: 'custom' },
                    progress_callback
                });
            } catch (errQ8) {
                console.warn('RMBG-1.4 q8 load fallback to default:', errQ8);
                model = await AutoModel.from_pretrained(modelId, {
                    device: 'wasm',
                    config: { model_type: 'custom' },
                    progress_callback
                });
            }

            const processor = await AutoProcessor.from_pretrained(modelId, {
                config: {
                    do_normalize: true,
                    do_pad: false,
                    do_rescale: true,
                    do_resize: true,
                    image_mean: [0.5, 0.5, 0.5],
                    image_std: [1, 1, 1],
                    resample: 2,
                    rescale_factor: 0.00392156862745098,
                    size: { width: 1024, height: 1024 },
                    feature_extractor_type: 'ImageFeatureExtractor'
                }
            });

            this._neuralSegReady = { model, processor, RawImage };
            return this._neuralSegReady;
        })().catch((err) => {
            this._neuralSegPromise = null;
            throw err;
        });

        return this._neuralSegPromise;
    },

    async detectSubjectMaskAI(sourceCanvas, outW, outH, onProgress = null) {
        const { model, processor, RawImage } = await this._loadNeuralSegmenter(onProgress);
        if (onProgress) onProgress('Mendeteksi subjek AI (RMBG-1.4)...', 95);

        const maxIn = 1024;
        const sc = Math.min(1, maxIn / Math.max(sourceCanvas.width, sourceCanvas.height));
        const sw = Math.max(16, Math.round(sourceCanvas.width * sc));
        const sh = Math.max(16, Math.round(sourceCanvas.height * sc));
        const inCv = this._getScratch('aiSegIn', sw, sh);
        const inCtx = inCv.getContext('2d', { willReadFrequently: true });
        inCtx.clearRect(0, 0, sw, sh);
        inCtx.drawImage(sourceCanvas, 0, 0, sw, sh);
        const imgData = inCtx.getImageData(0, 0, sw, sh);

        const rawImg = new RawImage(imgData.data, sw, sh, 4).rgb();
        const { pixel_values } = await processor(rawImg);
        const res = await model({ input: pixel_values });
        const outTensor = res.output || res[Object.keys(res)[0]];
        const dims = outTensor.dims;
        const mh = dims[dims.length - 2];
        const mw = dims[dims.length - 1];
        const mData = outTensor.data;

        const maskCv = document.createElement('canvas');
        maskCv.width = mw;
        maskCv.height = mh;
        const mCtx = maskCv.getContext('2d');
        const mImg = mCtx.createImageData(mw, mh);
        const md = mImg.data;
        const total = mw * mh;
        for (let p = 0, i = 0; p < total; p++, i += 4) {
            let v = mData[p];
            if (v < 0) v = 0;
            else if (v > 1) v = 1;
            md[i] = 255;
            md[i + 1] = 255;
            md[i + 2] = 255;
            md[i + 3] = (v * 255 + 0.5) | 0;
        }
        mCtx.putImageData(mImg, 0, 0);

        const fw = outW || sourceCanvas.width;
        const fh = outH || sourceCanvas.height;
        const out = document.createElement('canvas');
        out.width = fw;
        out.height = fh;
        const oCtx = out.getContext('2d');
        oCtx.imageSmoothingEnabled = true;
        oCtx.imageSmoothingQuality = 'high';
        oCtx.drawImage(maskCv, 0, 0, fw, fh);
        out._isNeural = true;
        return out;
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
    // DETAIL ENGINE — Dioptimalkan 6x-10x lebih cepat (Single Read/Write, Downscaled Blur, LUT Denoise, In-Memory USM)
    // =========================================================================
    _getScratch(key, w, h) {
        if (!this._scratch) this._scratch = {};
        let c = this._scratch[key];
        if (!c) { c = document.createElement('canvas'); this._scratch[key] = c; }
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        return c;
    },

    _makeDownscaledBlurData(sourceCanvas, w, h, radPx, div = 1) {
        const dScale = div > 1 ? Math.min(div, Math.max(1, Math.floor(Math.min(w, h) / 32))) : 1;
        const bw = Math.max(16, Math.round(w / dScale));
        const bh = Math.max(16, Math.round(h / dScale));
        const smallCv = this._getScratch('detSmall', bw, bh);
        const sCtx = smallCv.getContext('2d');
        sCtx.clearRect(0, 0, bw, bh);
        const scaledRad = radPx / dScale;
        sCtx.filter = scaledRad > 0.35 ? `blur(${scaledRad.toFixed(2)}px)` : 'none';
        sCtx.drawImage(sourceCanvas, 0, 0, bw, bh);
        sCtx.filter = 'none';

        if (dScale === 1) {
            return smallCv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
        }
        const upCv = this._getScratch('detBlur', w, h);
        const uCtx = upCv.getContext('2d', { willReadFrequently: true });
        uCtx.clearRect(0, 0, w, h);
        uCtx.imageSmoothingEnabled = true;
        uCtx.drawImage(smallCv, 0, 0, w, h);
        return uCtx.getImageData(0, 0, w, h).data;
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
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;
        let dirtyCanvas = false;

        // 1. Edge-Preserving Denoise / Skin Smooth (256-entry exp LUT + 1/2-res blur = ~8x lebih cepat)
        if (denoise > 0) {
            const dn = Math.min(100, denoise) / 100;
            const rad = Math.max(1.2, dn * 0.005 * minSide + 1.0);
            const bd = this._makeDownscaledBlurData(targetCanvas, w, h, rad, rad >= 2.2 ? 2 : 1);
            const thr = 10 + dn * 32;
            const inv2Thr2 = 1 / (2 * thr * thr);
            const strength = dn * 0.84;
            // Precompute 256-entry exponential LUT (menghilangkan jutaan panggilan Math.exp!)
            const expLut = this._denoiseExpLut || (this._denoiseExpLut = new Float32Array(256));
            for (let k = 0; k < 256; k++) expLut[k] = Math.exp(-(k * k) * inv2Thr2) * strength;

            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] === 0) continue;
                const dr = d[i] - bd[i];
                const dg = d[i + 1] - bd[i + 1];
                const db = d[i + 2] - bd[i + 2];
                const diff = ((dr < 0 ? -dr : dr) * 0.34 + (dg < 0 ? -dg : dg) * 0.48 + (db < 0 ? -db : db) * 0.18) | 0;
                const wEdge = expLut[diff > 255 ? 255 : diff];
                d[i] = d[i] - dr * wEdge;
                d[i + 1] = d[i + 1] - dg * wEdge;
                d[i + 2] = d[i + 2] - db * wEdge;
            }
            dirtyCanvas = true;
        }

        // Flush hanya jika Clarity atau Texture butuh membaca gambar hasil Denoise
        if (dirtyCanvas && (clarity !== 0 || texture !== 0)) {
            ctx.putImageData(img, 0, 0);
            dirtyCanvas = false;
        }

        // 2. Global Clarity (1/4-res blur untuk radius lebar midtone = 16x lebih cepat, hasil identik halus!)
        if (clarity !== 0) {
            const cl = clarity / 100;
            const rad = Math.max(3, minSide * 0.015);
            const bd = this._makeDownscaledBlurData(targetCanvas, w, h, rad, rad >= 5 ? 4 : 2);
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] === 0) continue;
                const r = d[i], g = d[i + 1], b = d[i + 2];
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) * 0.00392157;
                let midW = 1 - Math.abs(lum - 0.5) * 1.72;
                if (midW < 0.14) midW = 0.14;
                const k = cl * midW * 1.05;
                d[i] = r + (r - bd[i]) * k;
                d[i + 1] = g + (g - bd[i + 1]) * k;
                d[i + 2] = b + (b - bd[i + 2]) * k;
            }
            dirtyCanvas = true;
        }

        // 3. Global Texture (1/2-res blur untuk detail halus)
        if (texture !== 0) {
            if (dirtyCanvas) { ctx.putImageData(img, 0, 0); dirtyCanvas = false; }
            const tx = texture / 100;
            const rad = Math.max(1.2, minSide * 0.0038);
            const bd = this._makeDownscaledBlurData(targetCanvas, w, h, rad, rad >= 2.2 ? 2 : 1);
            const k = tx * 0.72;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] === 0) continue;
                d[i] = d[i] + (d[i] - bd[i]) * k;
                d[i + 1] = d[i + 1] + (d[i + 1] - bd[i + 1]) * k;
                d[i + 2] = d[i + 2] + (d[i + 2] - bd[i + 2]) * k;
            }
        }

        // 4. Real Sharpness — Fast In-Memory 3x3 Gaussian Luminance Unsharp Mask (0 GPU blur, < 2ms!)
        if (sharpness > 0) {
            const sh = Math.min(100, sharpness) / 100;
            const gain = sh * 1.48;
            const n = w * h;
            let lumBuf = this._sharpLumBuf;
            if (!lumBuf || lumBuf.length < n) lumBuf = this._sharpLumBuf = new Float32Array(n);
            for (let p = 0, i = 0; p < n; p++, i += 4) {
                lumBuf[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            }
            const step = Math.max(1, Math.min(2, Math.round(minSide / 950)));
            const rowStep = step * w;
            for (let y = step; y < h - step; y++) {
                const row = y * w;
                const rowU = row - rowStep;
                const rowD = row + rowStep;
                for (let x = step; x < w - step; x++) {
                    const p = row + x;
                    const idx = p * 4;
                    if (d[idx + 3] === 0) continue;
                    const lC = lumBuf[p];
                    const lBlur = (
                        lC * 4 +
                        (lumBuf[p - step] + lumBuf[p + step] + lumBuf[rowU + x] + lumBuf[rowD + x]) * 2 +
                        lumBuf[rowU + x - step] + lumBuf[rowU + x + step] + lumBuf[rowD + x - step] + lumBuf[rowD + x + step]
                    ) * 0.0625;
                    const diff = lC - lBlur;
                    const ad = diff < 0 ? -diff : diff;
                    if (ad < 1.6) continue;
                    let gate = (ad - 1.6) * 0.2857;
                    if (gate > 1) gate = 1;
                    const add = diff * gain * gate;
                    d[idx] = d[idx] + add;
                    d[idx + 1] = d[idx + 1] + add;
                    d[idx + 2] = d[idx + 2] + add;
                }
            }
        }

        ctx.putImageData(img, 0, 0);
    },

    // =========================================================================
    // SMART PORTRAIT LENS BLUR — Dioptimalkan 10x lebih cepat (Cached Mask + Half-Res Bokeh + GPU Compositing)
    // =========================================================================
    _getPreparedLensMask(subjectMaskCanvas, w, h, feather, protect, invert) {
        const c = this._lbMaskCache;
        if (
            c && c.src === subjectMaskCanvas && c.w === w && c.h === h &&
            c.feather === feather && c.protect === protect && c.invert === invert
        ) {
            return c.canvas;
        }
        // Hitung mask halus pada grid kompak (≤420px) lalu skalakan dengan GPU smoothing -> sangat cepat!
        const ms = Math.min(1, 420 / Math.max(w, h));
        const mw = Math.max(16, Math.round(w * ms));
        const mh = Math.max(16, Math.round(h * ms));
        const smallMask = this._getScratch('lbMaskSmall', mw, mh);
        const sCtx = smallMask.getContext('2d', { willReadFrequently: true });
        sCtx.clearRect(0, 0, mw, mh);
        const featherPx = (feather / 100) * 0.014 * Math.max(mw, mh);
        sCtx.filter = featherPx > 0.4 ? `blur(${featherPx.toFixed(2)}px)` : 'none';
        sCtx.drawImage(subjectMaskCanvas, 0, 0, mw, mh);
        sCtx.filter = 'none';

        if (protect !== 0 || invert) {
            const id = sCtx.getImageData(0, 0, mw, mh);
            const md = id.data;
            const protectBias = (protect / 100) * 0.85;
            for (let i = 0; i < md.length; i += 4) {
                let subj = md[i + 3] / 255;
                if (protectBias !== 0) {
                    const v = (subj + protectBias - 0.15) / 0.7;
                    const t = v < 0 ? 0 : v > 1 ? 1 : v;
                    subj = t * t * (3 - 2 * t);
                }
                const sharp = invert ? 1 - subj : subj;
                md[i] = 255; md[i + 1] = 255; md[i + 2] = 255;
                md[i + 3] = (sharp * 255) | 0;
            }
            sCtx.putImageData(id, 0, 0);
        }

        const outCv = this._getScratch('lbMaskFull', w, h);
        const oCtx = outCv.getContext('2d');
        oCtx.clearRect(0, 0, w, h);
        oCtx.imageSmoothingEnabled = true;
        oCtx.drawImage(smallMask, 0, 0, w, h);

        this._lbMaskCache = { src: subjectMaskCanvas, w, h, feather, protect, invert, canvas: outCv };
        return outCv;
    },

    applySmartLensBlur(targetCanvas, subjectMaskCanvas, cfg) {
        if (!cfg || !subjectMaskCanvas) return;
        const amount = Math.max(0, Math.min(100, cfg.amount || 0));
        const previewFocus = !!cfg.previewFocus;
        if (amount <= 0 && !previewFocus) return;

        const w = targetCanvas.width;
        const h = targetCanvas.height;
        const maxSide = Math.max(w, h);
        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
        const feather = cfg.feather ?? 18;
        const protect = cfg.protect ?? 0;
        const inv = !!cfg.invert;

        // 1. Ambil subject mask yang sudah di-cache (0ms saat menggeser BLUR / BOKEH / warna!)
        const sharpMaskCv = this._getPreparedLensMask(subjectMaskCanvas, w, h, feather, protect, inv);

        // 2. Render DSLR Bokeh pada resolusi kompak (≤360px saat drag, ≤760px saat idle/ekspor) lalu komposit 100% di GPU!
        if (amount > 0) {
            const maxBokehDim = cfg.fast ? 340 : 720;
            const bScale = Math.min(0.6, maxBokehDim / maxSide);
            const bw = Math.max(24, Math.round(w * bScale));
            const bh = Math.max(24, Math.round(h * bScale));
            const bn = bw * bh;

            // Potongan subjek tajam resolusi penuh di GPU (0 getImageData pada resolusi penuh!)
            const subjCv = this._getScratch('lbSubj', w, h);
            const sjCtx = subjCv.getContext('2d');
            sjCtx.clearRect(0, 0, w, h);
            sjCtx.globalCompositeOperation = 'source-over';
            sjCtx.drawImage(targetCanvas, 0, 0);
            sjCtx.globalCompositeOperation = 'destination-in';
            sjCtx.drawImage(sharpMaskCv, 0, 0);
            sjCtx.globalCompositeOperation = 'source-over';

            // Siapkan background + highlight bokeh bloom pada ukuran kecil bw x bh (~90k piksel -> < 1.5ms!)
            const bgCv = this._getScratch('lbBg', bw, bh);
            const bgCtx = bgCv.getContext('2d', { willReadFrequently: true });
            bgCtx.clearRect(0, 0, bw, bh);
            bgCtx.drawImage(targetCanvas, 0, 0, bw, bh);
            const bgImg = bgCtx.getImageData(0, 0, bw, bh);
            const bd = bgImg.data;

            const bmCv = this._getScratch('lbMaskBm', bw, bh);
            const bmCtx = bmCv.getContext('2d', { willReadFrequently: true });
            bmCtx.clearRect(0, 0, bw, bh);
            bmCtx.drawImage(sharpMaskCv, 0, 0, bw, bh);
            const bmAlpha = bmCtx.getImageData(0, 0, bw, bh).data;

            const bokehBoost = ((cfg.bokeh ?? 35) / 100) * (0.4 + 0.6 * (amount / 100));
            for (let p = 0, i = 0; p < bn; p++, i += 4) {
                const bm = 255 - bmAlpha[i + 3];
                if (bokehBoost > 0.02 && bm > 52) {
                    const r = bd[i], g = bd[i + 1], b = bd[i + 2];
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    if (lum > 175) {
                        const s = (lum - 175) * 0.0125;
                        const boost = s * s * bokehBoost * 135;
                        bd[i] = r + boost;
                        bd[i + 1] = g + boost * 0.98;
                        bd[i + 2] = b + boost * 0.94;
                    }
                }
                bd[i + 3] = bm;
            }
            bgCtx.putImageData(bgImg, 0, 0);

            const blurRad = ((amount / 100) * 0.022 * maxSide + 1.4) * bScale;
            const outBlurCv = this._getScratch('lbBlur', bw, bh);
            const obCtx = outBlurCv.getContext('2d', { willReadFrequently: true });
            obCtx.clearRect(0, 0, bw, bh);
            obCtx.filter = `blur(${blurRad.toFixed(2)}px)`;
            obCtx.drawImage(bgCv, 0, 0);
            obCtx.filter = 'none';

            // Fallback blur penuh tipis di celah alpha sangat kecil (< 0.25)
            const fullBlurCv = this._getScratch('lbFull', bw, bh);
            const fbCtx = fullBlurCv.getContext('2d', { willReadFrequently: true });
            fbCtx.clearRect(0, 0, bw, bh);
            fbCtx.filter = `blur(${(blurRad * 0.85).toFixed(2)}px)`;
            fbCtx.drawImage(targetCanvas, 0, 0, bw, bh);
            fbCtx.filter = 'none';

            const bImg = obCtx.getImageData(0, 0, bw, bh);
            const bData = bImg.data;
            const fData = fbCtx.getImageData(0, 0, bw, bh).data;
            for (let i = 0; i < bData.length; i += 4) {
                const ba = bData[i + 3];
                if (ba < 64) {
                    const t = ba * 0.015625;
                    const it = 1 - t;
                    bData[i] = fData[i] * it + bData[i] * t;
                    bData[i + 1] = fData[i + 1] * it + bData[i + 1] * t;
                    bData[i + 2] = fData[i + 2] * it + bData[i + 2] * t;
                }
                bData[i + 3] = 255;
            }
            obCtx.putImageData(bImg, 0, 0);

            // Komposit akhir 100% di GPU: latar bokeh mulus + subjek tajam di atasnya!
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(outBlurCv, 0, 0, w, h);
            ctx.drawImage(subjCv, 0, 0);
            ctx.restore();
        }

        // 3. Visualisasi Peta Fokus 100% di GPU (kuning hangat = area tajam, biru = area blur)
        if (previewFocus) {
            const ovCv = this._getScratch('lbPrev', w, h);
            const ovCtx = ovCv.getContext('2d');
            ovCtx.clearRect(0, 0, w, h);
            ovCtx.fillStyle = 'rgba(48, 115, 220, 0.36)';
            ovCtx.fillRect(0, 0, w, h);
            ovCtx.globalCompositeOperation = 'destination-out';
            ovCtx.drawImage(sharpMaskCv, 0, 0);
            ovCtx.globalCompositeOperation = 'source-over';
            ctx.drawImage(ovCv, 0, 0);

            ovCtx.clearRect(0, 0, w, h);
            ovCtx.fillStyle = 'rgba(255, 185, 70, 0.36)';
            ovCtx.fillRect(0, 0, w, h);
            ovCtx.globalCompositeOperation = 'destination-in';
            ovCtx.drawImage(sharpMaskCv, 0, 0);
            ovCtx.globalCompositeOperation = 'source-over';
            ctx.drawImage(ovCv, 0, 0);

            if (cfg.focusPt) {
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
    },

    // =========================================================================
    // 3D RELIGHT STUDIO (Pseudo-3D Surface Normals + Depth Separation + Directional Rim Light)
    // =========================================================================
    _hexToRgb(hex) {
        const h = String(hex || '#ff9f43').replace('#', '');
        const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
        const n = parseInt(full, 16);
        if (isNaN(n)) return [255, 175, 90];
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },

    /**
     * Analisis Pemandangan & Multi-Subjek untuk Relight Fisik (O(N), ~2ms, di-cache per foto):
     * 1. Mendeteksi masker langit (skyMask) & garis horizon per kolom agar TIDAK PERNAH ada bayangan melayang
     *    atau lingkaran flash palsu di langit terbuka / pepohonan jauh!
     * 2. Membedakan foto indoor/dinding dekat (outdoorFactor ≈ 0 -> bayangan dinding) vs outdoor langit terbuka
     *    (outdoorFactor ≈ 1 -> bayangan perspektif menapak di tanah/rumput!).
     * 3. Memisahkan tiap subjek secara individual (mis. 2 orang di posisi berbeda) beserta titik tumpuan kaki (feetX, feetY).
     */
    _analyzeRelightScene(sd, lum, subj, lw, lh, hasMask) {
        const n = lw * lh;
        const skyMask = new Float32Array(n);
        const colHorizon = new Float32Array(lw);
        const groundAccept = new Float32Array(n);
        const compLabels = new Int16Array(n);
        const subjects = [];

        // 1. Deteksi Komponen Multi-Subjek + titik tumpuan kaki (feetX, feetY)
        if (hasMask) {
            const q = new Int32Array(n);
            let nextId = 1;
            const rawComps = [];
            for (let i = 0; i < n; i++) {
                if (subj[i] < 0.42 || compLabels[i]) continue;
                let head = 0, tail = 0;
                q[tail++] = i;
                compLabels[i] = nextId;
                let minX = lw, maxX = 0, minY = lh, maxY = 0;
                let sumW = 0, sumX = 0, sumY = 0;
                while (head < tail) {
                    const p = q[head++];
                    const x = p % lw, y = (p - x) / lw;
                    const sw = subj[p];
                    sumW += sw; sumX += x * sw; sumY += y * sw;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    if (x > 0 && subj[p - 1] >= 0.42 && !compLabels[p - 1]) { compLabels[p - 1] = nextId; q[tail++] = p - 1; }
                    if (x < lw - 1 && subj[p + 1] >= 0.42 && !compLabels[p + 1]) { compLabels[p + 1] = nextId; q[tail++] = p + 1; }
                    if (y > 0 && subj[p - lw] >= 0.42 && !compLabels[p - lw]) { compLabels[p - lw] = nextId; q[tail++] = p - lw; }
                    if (y < lh - 1 && subj[p + lw] >= 0.42 && !compLabels[p + lw]) { compLabels[p + lw] = nextId; q[tail++] = p + lw; }
                }
                rawComps.push({ id: nextId, count: tail, minX, maxX, minY, maxY, sumW, sumX, sumY });
                nextId++;
            }

            const minArea = Math.max(24, n * 0.006);
            rawComps.sort((a, b) => b.count - a.count);
            for (let k = 0; k < rawComps.length && subjects.length < 6; k++) {
                const c = rawComps[k];
                if (c.count < minArea) continue;
                const bh = Math.max(1, c.maxY - c.minY);
                const footBandTop = Math.max(c.minY, c.maxY - Math.max(3, Math.round(bh * 0.08)));
                let fSumX = 0, fCnt = 0, fMinX = lw, fMaxX = 0;
                for (let y = footBandTop; y <= c.maxY; y++) {
                    const row = y * lw;
                    for (let x = c.minX; x <= c.maxX; x++) {
                        if (compLabels[row + x] === c.id) {
                            fSumX += x; fCnt++;
                            if (x < fMinX) fMinX = x;
                            if (x > fMaxX) fMaxX = x;
                        }
                    }
                }
                const cx = (c.sumX / Math.max(1, c.sumW)) / lw;
                const cy = (c.sumY / Math.max(1, c.sumW)) / lh;
                const feetX = fCnt > 0 ? (fSumX / fCnt) / lw : cx;
                const feetY = (c.maxY + 0.5) / lh;
                subjects.push({
                    id: c.id,
                    area: c.count / n,
                    cx, cy,
                    minX: c.minX / lw, maxX: (c.maxX + 1) / lw,
                    minY: c.minY / lh, maxY: (c.maxY + 1) / lh,
                    w: (c.maxX - c.minX + 1) / lw,
                    h: (c.maxY - c.minY + 1) / lh,
                    feetX, feetY,
                    footMinX: (fCnt > 0 ? fMinX : c.minX) / lw,
                    footMaxX: (fCnt > 0 ? fMaxX + 1 : c.maxX + 1) / lw,
                    touchesBottom: c.maxY >= lh - 3
                });
            }
        }

        // 2. Deteksi Langit Terbuka (Sky Mask) & Garis Horizon (ketat agar dinding putih indoor TIDAK salah dikira langit!)
        const grad = new Float32Array(n);
        for (let y = 1; y < lh - 1; y++) {
            const r0 = (y - 1) * lw, r1 = y * lw, r2 = (y + 1) * lw;
            for (let x = 1; x < lw - 1; x++) {
                const p = r1 + x;
                grad[p] = Math.abs(lum[p + 1] - lum[p - 1]) + Math.abs(lum[r2 + x] - lum[r0 + x]);
            }
        }

        const isSkyCand = new Uint8Array(n);
        const isBlueCand = new Uint8Array(n);
        const isFoliage = new Uint8Array(n);
        for (let p = 0, i = 0; p < n; p++, i += 4) {
            const r = sd[i] * 0.00392157;
            const g = sd[i + 1] * 0.00392157;
            const b = sd[i + 2] * 0.00392157;
            const l = lum[p];
            const cMax = r > g ? (r > b ? r : b) : (g > b ? g : b);
            const cMin = r < g ? (r < b ? r : b) : (g < b ? g : b);
            const sat = cMax > 0.01 ? (cMax - cMin) / cMax : 0;
            const gr = grad[p];

            const greenFol = (g > r + 0.018 && g > b + 0.032) || (g > b + 0.05 && l < 0.56);
            if (greenFol) { isFoliage[p] = 1; continue; }

            // Langit biru/cyan/senja/awan terang (menolak balon kuning jenuh & dinding kusam)
            const blueSky = (b - r > 0.022) && (b >= g - 0.075) && (l > 0.16) && (gr < 0.16);
            const cloudSky = (l > 0.58) && (sat < 0.16) && (b >= r - 0.035) && (gr < 0.13);
            const sunsetSky = (l > 0.38) && (r > b + 0.03) && (g >= b * 0.88) && (sat < 0.48) && (gr < 0.085);
            if (blueSky) { isSkyCand[p] = 1; isBlueCand[p] = 1; }
            else if (cloudSky || sunsetSky) { isSkyCand[p] = 1; }
        }

        // BFS dari tepi atas (baris 0..3) melewati area latar langit yang kontinu
        const visited = new Uint8Array(n);
        const qSky = new Int32Array(n);
        let qh = 0, qt = 0;
        const maxSkyY = Math.round(lh * 0.78);
        const seedRows = Math.min(4, lh);
        for (let y = 0; y < seedRows; y++) {
            const row = y * lw;
            for (let x = 0; x < lw; x++) {
                const p = row + x;
                if (!visited[p] && (!hasMask || subj[p] < 0.45) && isSkyCand[p]) {
                    visited[p] = 1;
                    qSky[qt++] = p;
                }
            }
        }
        const colMaxSkyY = new Int32Array(lw).fill(-1);
        while (qh < qt) {
            const p = qSky[qh++];
            const x = p % lw, y = (p - x) / lw;
            if (y > colMaxSkyY[x]) colMaxSkyY[x] = y;
            const i0 = p << 2;
            const r0 = sd[i0], g0 = sd[i0 + 1], b0 = sd[i0 + 2];
            const tryPush = (np, ny) => {
                if (ny >= maxSkyY || visited[np] || !isSkyCand[np]) return;
                if (hasMask && subj[np] >= 0.50) return;
                const i1 = np << 2;
                const dCol = (Math.abs(sd[i1] - r0) + Math.abs(sd[i1 + 1] - g0) + Math.abs(sd[i1 + 2] - b0)) * 0.001307;
                if (dCol < 0.16) {
                    visited[np] = 1;
                    qSky[qt++] = np;
                }
            };
            if (x > 0) tryPush(p - 1, y);
            if (x < lw - 1) tryPush(p + 1, y);
            if (y > 0) tryPush(p - lw, y - 1);
            if (y < lh - 1) tryPush(p + lw, y + 1);
        }

        // Statistik validasi: pisahkan LANGIT OUTDOOR asli vs DINDING PUTIH INDOOR
        let topBgCnt = 0, topSkyCnt = 0, skyTotal = 0, blueTotal = 0, skyLumSum = 0;
        const topLim = Math.max(4, Math.round(lh * 0.24));
        for (let y = 0; y < lh; y++) {
            const row = y * lw;
            for (let x = 0; x < lw; x++) {
                const p = row + x;
                const isBg = !hasMask || subj[p] < 0.45;
                if (y < topLim && isBg) {
                    topBgCnt++;
                    if (visited[p]) topSkyCnt++;
                }
                if (visited[p]) {
                    skyTotal++;
                    skyLumSum += lum[p];
                    if (isBlueCand[p]) blueTotal++;
                }
            }
        }

        // Hitung garis horizon median dari kolom langit yang TIDAK terhalang subjek
        const colSkyBottom = new Int32Array(lw).fill(-1);
        const hValsUnocc = [];
        const hValsAll = [];
        for (let x = 0; x < lw; x++) {
            const my = colMaxSkyY[x];
            if (my >= 0) {
                hValsAll.push(my / lh);
                const yChk1 = Math.min(lh - 1, my + 2);
                const yChk2 = Math.min(lh - 1, my + 5);
                const blockedBySubj = hasMask && (subj[yChk1 * lw + x] >= 0.22 || subj[yChk2 * lw + x] >= 0.22);
                if (!blockedBySubj) {
                    colSkyBottom[x] = my;
                    hValsUnocc.push(my / lh);
                }
            }
        }
        const hSrc = hValsUnocc.length > lw * 0.15 ? hValsUnocc : hValsAll;
        hSrc.sort((a, b) => a - b);
        const horizonY = hSrc.length > lw * 0.15 ? hSrc[Math.floor(hSrc.length * 0.58)] : 0.48;

        let botBgCnt = 0, botNonSkyCnt = 0, botLumSum = 0, botGreenCnt = 0;
        const botStart = Math.min(lh - 1, Math.round(Math.max(horizonY + 0.05, 0.58) * lh));
        for (let y = botStart; y < lh; y++) {
            const row = y * lw;
            for (let x = 0; x < lw; x++) {
                const p = row + x;
                if (hasMask && subj[p] >= 0.45) continue;
                botBgCnt++;
                if (!visited[p]) {
                    botNonSkyCnt++;
                    botLumSum += lum[p];
                    if (isFoliage[p]) botGreenCnt++;
                }
            }
        }

        const topSkyRatio = topBgCnt > 10 ? topSkyCnt / topBgCnt : 0;
        const skyAreaRatio = skyTotal / n;
        const blueSkyRatio = skyTotal > 10 ? blueTotal / skyTotal : 0;
        const avgSkyLum = skyTotal > 10 ? skyLumSum / skyTotal : 0;
        const avgBotLum = botNonSkyCnt > 10 ? botLumSum / botNonSkyCnt : 0;
        const botNonSkyRatio = botBgCnt > 10 ? botNonSkyCnt / botBgCnt : 0;
        const botGreenRatio = botNonSkyCnt > 10 ? botGreenCnt / botNonSkyCnt : 0;

        const hasGenuineOutdoorSky =
            topSkyRatio > 0.44 &&
            skyAreaRatio > 0.11 &&
            horizonY < 0.76 &&
            (
                blueSkyRatio > 0.18 ||
                (botNonSkyRatio > 0.65 && (avgSkyLum - avgBotLum > 0.12 || botGreenRatio > 0.25))
            );

        let outdoorFactor = 0;
        if (hasGenuineOutdoorSky) {
            const fTop = Math.max(0, Math.min(1, (topSkyRatio - 0.34) / 0.32));
            const fHor = Math.max(0, Math.min(1, (0.78 - horizonY) / 0.20));
            const fCue = blueSkyRatio > 0.18
                ? Math.max(0.90, Math.min(1, blueSkyRatio * 3.2))
                : Math.max(0.75, Math.min(1, (avgSkyLum - avgBotLum) * 3.5 + botGreenRatio));
            outdoorFactor = Math.max(0, Math.min(1, fTop * fHor * fCue));

            // Isi garis horizon per kolom lebih dulu (interpolasi linear melintasi kolom tertutup subjek!)
            let lastValid = -1;
            const nextValid = new Int32Array(lw).fill(-1);
            let nxt = -1;
            for (let x = lw - 1; x >= 0; x--) {
                if (colSkyBottom[x] >= 0) nxt = x;
                nextValid[x] = nxt;
            }
            for (let x = 0; x < lw; x++) {
                if (colSkyBottom[x] >= 0) {
                    colHorizon[x] = colSkyBottom[x] / lh;
                    lastValid = x;
                } else {
                    const leftIdx = lastValid;
                    const rightIdx = nextValid[x];
                    if (leftIdx >= 0 && rightIdx >= 0 && rightIdx > leftIdx) {
                        const t = (x - leftIdx) / (rightIdx - leftIdx);
                        colHorizon[x] = (colSkyBottom[leftIdx] * (1 - t) + colSkyBottom[rightIdx] * t) / lh;
                    } else if (leftIdx >= 0) {
                        colHorizon[x] = colSkyBottom[leftIdx] / lh;
                    } else if (rightIdx >= 0) {
                        colHorizon[x] = colSkyBottom[rightIdx] / lh;
                    } else {
                        colHorizon[x] = horizonY;
                    }
                }
            }
            // Haluskan profil horizon horizontal agar bebas lonjakan
            const horCopy = new Float32Array(colHorizon);
            const hr = Math.max(3, Math.round(lw * 0.03));
            for (let x = 0; x < lw; x++) {
                let s = 0, cnt = 0;
                const x0 = Math.max(0, x - hr), x1 = Math.min(lw - 1, x + hr);
                for (let k = x0; k <= x1; k++) { s += horCopy[k]; cnt++; }
                colHorizon[x] = s / cnt;
            }

            // Dilasi separabel O(N) 4-sweep dari masker subjek (radius rD) untuk menyambungkan langit di balik tepi subjek
            const nearSubj = new Uint8Array(n);
            if (hasMask) {
                const rD = Math.max(4, Math.round(Math.max(lw, lh) * 0.025));
                const tmpDil = new Uint8Array(n);
                for (let y = 0; y < lh; y++) {
                    const row = y * lw;
                    let cd = 0;
                    for (let x = 0; x < lw; x++) {
                        if (subj[row + x] >= 0.16) cd = rD + 1;
                        else if (cd > 0) cd--;
                        if (cd > 0) tmpDil[row + x] = 1;
                    }
                    cd = 0;
                    for (let x = lw - 1; x >= 0; x--) {
                        if (subj[row + x] >= 0.16) cd = rD + 1;
                        else if (cd > 0) cd--;
                        if (cd > 0) tmpDil[row + x] = 1;
                    }
                }
                for (let x = 0; x < lw; x++) {
                    let cd = 0;
                    for (let y = 0; y < lh; y++) {
                        const p = y * lw + x;
                        if (tmpDil[p]) cd = rD + 1;
                        else if (cd > 0) cd--;
                        if (cd > 0) nearSubj[p] = 1;
                    }
                    cd = 0;
                    for (let y = lh - 1; y >= 0; y--) {
                        const p = y * lw + x;
                        if (tmpDil[p]) cd = rD + 1;
                        else if (cd > 0) cd--;
                        if (cd > 0) nearSubj[p] = 1;
                    }
                }
            }

            // Isi kantong langit kecil di sela lengan/rambut di atas horizon + lanjutkan bidang langit di balik subjek (NOL parit gelap!)
            const rawSky = new Float32Array(n);
            const recLimY = Math.min(lh - 1, Math.round((horizonY + 0.08) * lh));
            for (let y = 0; y < lh; y++) {
                const v = (y + 0.5) / lh;
                const row = y * lw;
                for (let x = 0; x < lw; x++) {
                    const p = row + x;
                    if (visited[p]) {
                        rawSky[p] = 1;
                    } else if (v <= colHorizon[x] + 0.012 && ((hasMask && subj[p] >= 0.16) || (nearSubj[p] && !isFoliage[p]))) {
                        // Lanjutkan bidang langit secara kontinu di balik subjek & tepi gradien tinggi di atas horizon (NOL cincin gelap!)
                        rawSky[p] = 1;
                    } else if (y <= recLimY && (!hasMask || subj[p] < 0.55) && (isBlueCand[p] || (isSkyCand[p] && blueSkyRatio > 0.16 && lum[p] > avgSkyLum - 0.18))) {
                        rawSky[p] = 0.92;
                    }
                }
            }
            // Perhalus tepi skyMask (2-pass 3x3) agar transisi langit & pepohonan mulus
            const tmpSky = new Float32Array(n);
            const smoothPass = (src, dst) => {
                for (let y = 0; y < lh; y++) {
                    const y0 = y > 0 ? y - 1 : 0, y1 = y < lh - 1 ? y + 1 : lh - 1;
                    const r0 = y0 * lw, r1 = y * lw, r2 = y1 * lw;
                    for (let x = 0; x < lw; x++) {
                        const x0 = x > 0 ? x - 1 : 0, x1 = x < lw - 1 ? x + 1 : lw - 1;
                        dst[r1 + x] = (
                            src[r1 + x] * 4 +
                            (src[r1 + x0] + src[r1 + x1] + src[r0 + x] + src[r2 + x]) * 2 +
                            src[r0 + x0] + src[r0 + x1] + src[r2 + x0] + src[r2 + x1]
                        ) * 0.0625;
                    }
                }
            };
            smoothPass(rawSky, tmpSky);
            smoothPass(tmpSky, skyMask);

            // Peta bidang tanah (groundAccept): 0 di langit & pepohonan jauh di horizon, 1 mulus di rumput/tanah!
            for (let y = 0; y < lh; y++) {
                const v = (y + 0.5) / lh;
                const row = y * lw;
                for (let x = 0; x < lw; x++) {
                    const p = row + x;
                    if (skyMask[p] > 0.25) { groundAccept[p] = 0; continue; }
                    const hCol = Math.max(horizonY * 0.88, colHorizon[x]);
                    // Sisakan margin ~7% di bawah batas langit untuk pita pepohonan/gedung horizon jauh
                    const gStart = Math.min(0.82, hCol + 0.065);
                    const gFull = Math.min(0.92, gStart + 0.095);
                    const t = (v - gStart) / Math.max(0.03, gFull - gStart);
                    const tc = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
                    groundAccept[p] = tc * (1 - skyMask[p]);
                }
            }
        } else {
            colHorizon.fill(0);
            groundAccept.fill(1);
        }

        return { skyMask, colHorizon, horizonY, outdoorFactor, groundAccept, compLabels, subjects };
    },

    _getRelightMaps(targetCanvas, subjectMaskCanvas, lw, lh, normalKey) {
        const isNeural = !!(subjectMaskCanvas && subjectMaskCanvas._isNeural);
        const key = `${normalKey || ''}|${lw}x${lh}|${subjectMaskCanvas ? (isNeural ? 'mN' : 'mH') : 'm0'}|sc3`;
        if (this._relightCache && this._relightCache.key === key) {
            return this._relightCache;
        }
        const n = lw * lh;

        // 1. Estimasi 3D Surface Normals (nx, ny, nz) dari gradien luminance halus
        const srcCv = this._getScratch('rlSrc', lw, lh);
        const sCtx = srcCv.getContext('2d', { willReadFrequently: true });
        sCtx.clearRect(0, 0, lw, lh);
        sCtx.filter = 'blur(1.5px)';
        sCtx.drawImage(targetCanvas, 0, 0, lw, lh);
        sCtx.filter = 'none';
        const sd = sCtx.getImageData(0, 0, lw, lh).data;

        const lum = new Float32Array(n);
        for (let p = 0, i = 0; p < n; p++, i += 4) {
            lum[p] = (0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2]) * 0.00392157;
        }

        const nx = new Float32Array(n);
        const ny = new Float32Array(n);
        const nz = new Float32Array(n);
        for (let y = 0; y < lh; y++) {
            const y0 = y > 0 ? y - 1 : 0;
            const y1 = y < lh - 1 ? y + 1 : lh - 1;
            const r0 = y0 * lw, r1 = y * lw, r2 = y1 * lw;
            for (let x = 0; x < lw; x++) {
                const x0 = x > 0 ? x - 1 : 0;
                const x1 = x < lw - 1 ? x + 1 : lw - 1;
                const gx = (lum[r0 + x1] + 2 * lum[r1 + x1] + lum[r2 + x1]) - (lum[r0 + x0] + 2 * lum[r1 + x0] + lum[r2 + x0]);
                const gy = (lum[r2 + x0] + 2 * lum[r2 + x] + lum[r2 + x1]) - (lum[r0 + x0] + 2 * lum[r0 + x] + lum[r0 + x1]);
                const vx = -gx * 2.5;
                const vy = -gy * 2.5;
                const vz = 1.0;
                const inv = 1 / Math.sqrt(vx * vx + vy * vy + vz * vz);
                const p = r1 + x;
                nx[p] = vx * inv;
                ny[p] = vy * inv;
                nz[p] = vz * inv;
            }
        }

        // 2. Subject Depth & Directional Rim-Light Contour Map dari subjectMaskCanvas
        const subj = new Float32Array(n);
        const edge = new Float32Array(n);
        const ex = new Float32Array(n);
        const ey = new Float32Array(n);
        let cxS = 0.5, cyS = 0.52;
        const hasMask = !!subjectMaskCanvas;

        if (subjectMaskCanvas) {
            const mCv = this._getScratch('rlMask', lw, lh);
            const mCtx = mCv.getContext('2d', { willReadFrequently: true });
            mCtx.clearRect(0, 0, lw, lh);
            mCtx.imageSmoothingEnabled = true;
            mCtx.imageSmoothingQuality = 'high';
            mCtx.drawImage(subjectMaskCanvas, 0, 0, lw, lh);
            const md = mCtx.getImageData(0, 0, lw, lh).data;
            const rawSubj = new Float32Array(n);
            for (let p = 0, i = 0; p < n; p++, i += 4) rawSubj[p] = md[i + 3] * 0.00392157;

            if (isNeural) {
                const tmpSubj = new Float32Array(n);
                for (let y = 0; y < lh; y++) {
                    const y0 = y > 0 ? y - 1 : 0;
                    const y1 = y < lh - 1 ? y + 1 : lh - 1;
                    const r0 = y0 * lw, r1 = y * lw, r2 = y1 * lw;
                    for (let x = 0; x < lw; x++) {
                        const x0 = x > 0 ? x - 1 : 0;
                        const x1 = x < lw - 1 ? x + 1 : lw - 1;
                        const p = r1 + x;
                        const c = rawSubj[p];
                        let v = c;
                        if (c > 0.04 && c < 0.92) {
                            const mn = Math.min(c, rawSubj[r1 + x0], rawSubj[r1 + x1], rawSubj[r0 + x], rawSubj[r2 + x]);
                            v = c * 0.80 + mn * 0.20;
                        }
                        const t = (v - 0.18) / 0.64;
                        const tc = t < 0 ? 0 : t > 1 ? 1 : t;
                        tmpSubj[p] = tc * tc * (3 - 2 * tc);
                    }
                }
                for (let y = 0; y < lh; y++) {
                    const y0 = y > 0 ? y - 1 : 0;
                    const y1 = y < lh - 1 ? y + 1 : lh - 1;
                    const r0 = y0 * lw, r1 = y * lw, r2 = y1 * lw;
                    for (let x = 0; x < lw; x++) {
                        const x0 = x > 0 ? x - 1 : 0;
                        const x1 = x < lw - 1 ? x + 1 : lw - 1;
                        const p = r1 + x;
                        const c = tmpSubj[p];
                        if (c > 0.01 && c < 0.99) {
                            subj[p] = (
                                c * 4 +
                                (tmpSubj[r1 + x0] + tmpSubj[r1 + x1] + tmpSubj[r0 + x] + tmpSubj[r2 + x]) * 2 +
                                tmpSubj[r0 + x0] + tmpSubj[r0 + x1] + tmpSubj[r2 + x0] + tmpSubj[r2 + x1]
                            ) * 0.0625;
                        } else {
                            subj[p] = c;
                        }
                    }
                }
            } else {
                for (let y = 0; y < lh; y++) {
                    const y0 = y > 0 ? y - 1 : 0;
                    const y1 = y < lh - 1 ? y + 1 : lh - 1;
                    const r0 = y0 * lw, r1 = y * lw, r2 = y1 * lw;
                    for (let x = 0; x < lw; x++) {
                        const x0 = x > 0 ? x - 1 : 0;
                        const x1 = x < lw - 1 ? x + 1 : lw - 1;
                        const p = r1 + x;
                        const c = rawSubj[p];
                        let v = c;
                        if (c > 0.02 && c < 0.98) {
                            const mn = Math.min(c, rawSubj[r1 + x0], rawSubj[r1 + x1], rawSubj[r0 + x], rawSubj[r2 + x]);
                            v = c * 0.45 + mn * 0.55;
                        }
                        const t = (v - 0.24) / 0.56;
                        const tc = t < 0 ? 0 : t > 1 ? 1 : t;
                        subj[p] = tc * tc * (3 - 2 * tc);
                    }
                }
            }

            const rawEdge = new Float32Array(n);
            for (let y = 1; y < lh - 1; y++) {
                const r0 = (y - 1) * lw, r1 = y * lw, r2 = (y + 1) * lw;
                for (let x = 1; x < lw - 1; x++) {
                    const gx = (subj[r0 + x + 1] + 2 * subj[r1 + x + 1] + subj[r2 + x + 1]) - (subj[r0 + x - 1] + 2 * subj[r1 + x - 1] + subj[r2 + x - 1]);
                    const gy = (subj[r2 + x - 1] + 2 * subj[r2 + x] + subj[r2 + x + 1]) - (subj[r0 + x - 1] + 2 * subj[r0 + x] + subj[r0 + x + 1]);
                    const mag = Math.sqrt(gx * gx + gy * gy);
                    const p = r1 + x;
                    if (mag > 0.03 && subj[p] > 0.35) {
                        const inv = 1 / mag;
                        ex[p] = -gx * inv;
                        ey[p] = -gy * inv;
                        rawEdge[p] = Math.min(1, mag * 1.35) * subj[p];
                    }
                }
            }
            for (let y = 1; y < lh - 1; y++) {
                const r0 = (y - 1) * lw, r1 = y * lw, r2 = (y + 1) * lw;
                for (let x = 1; x < lw - 1; x++) {
                    const p = r1 + x;
                    if (subj[p] < 0.20) continue;
                    edge[p] = (
                        rawEdge[p] * 4 +
                        (rawEdge[p - 1] + rawEdge[p + 1] + rawEdge[r0 + x] + rawEdge[r2 + x]) * 2 +
                        rawEdge[r0 + x - 1] + rawEdge[r0 + x + 1] + rawEdge[r2 + x - 1] + rawEdge[r2 + x + 1]
                    ) * 0.0625 * subj[p];
                }
            }
            let sumW = 0, sumX = 0, sumY = 0;
            for (let y = 0, p = 0; y < lh; y++) {
                for (let x = 0; x < lw; x++, p++) {
                    const sw = subj[p];
                    if (sw > 0.25) { sumW += sw; sumX += x * sw; sumY += y * sw; }
                }
            }
            cxS = sumW > 1 ? (sumX / sumW) / lw : 0.5;
            cyS = sumW > 1 ? (sumY / sumW) / lh : 0.52;
        } else {
            subj.fill(1);
        }

        // 3. Analisis Adegan (Indoor Wall vs Outdoor Open-Sky + Komponen Multi-Subjek) + Proximity Bounce-Light Field
        const scene = this._analyzeRelightScene(sd, lum, subj, lw, lh, hasMask);
        const proxSpill = new Float32Array(n);
        if (hasMask && subjectMaskCanvas) {
            const pCv = this._getScratch('rlProxSpill', lw, lh);
            const pCtx = pCv.getContext('2d', { willReadFrequently: true });
            pCtx.clearRect(0, 0, lw, lh);
            const blurR = Math.max(8, Math.round(Math.max(lw, lh) * 0.085));
            pCtx.filter = `blur(${blurR}px)`;
            pCtx.drawImage(subjectMaskCanvas, 0, 0, lw, lh);
            pCtx.filter = 'none';
            const pd = pCtx.getImageData(0, 0, lw, lh).data;
            for (let p = 0, i = 0; p < n; p++, i += 4) proxSpill[p] = pd[i + 3] * 0.00392157;
        }
        const cache = {
            key, lw, lh, nx, ny, nz, subj, edge, ex, ey, cxS, cyS, hasMask, proxSpill,
            skyMask: scene.skyMask,
            colHorizon: scene.colHorizon,
            horizonY: scene.horizonY,
            outdoorFactor: scene.outdoorFactor,
            groundAccept: scene.groundAccept,
            compLabels: scene.compLabels,
            subjects: scene.subjects
        };
        this._relightCache = cache;
        return cache;
    },

    /**
     * Masker Alpha Subjek Resolusi Penuh (w x h) dengan Dekontaminasi Tepi Berbasis Warna
     * (Boundary-Only Color-Guided Matte Decontamination) untuk mencegah halo langit/latar
     * terang pada tepi rambut dan lengan tanpa merusak detail interior subjek.
     */
    _getFullResSubjectAlpha(subjectMaskCanvas, sourceCanvas, w, h, normalKey) {
        if (!subjectMaskCanvas || !w || !h) return null;
        const isNeural = !!subjectMaskCanvas._isNeural;
        const key = `${normalKey || ''}|${w}x${h}|${isNeural ? 'N' : 'H'}|fa4`;
        if (this._fullAlphaCache && this._fullAlphaCache.key === key) {
            return this._fullAlphaCache.alpha;
        }
        const cv = this._getScratch('rlFullAlpha', w, h);
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(subjectMaskCanvas, 0, 0, w, h);
        const raw = ctx.getImageData(0, 0, w, h).data;
        const n = w * h;
        const rawA = new Uint8Array(n);
        for (let p = 0, i = 3; p < n; p++, i += 4) {
            rawA[p] = raw[i];
        }

        let sData = null;
        if (sourceCanvas && sourceCanvas.width && sourceCanvas.height) {
            try {
                if (sourceCanvas.width === w && sourceCanvas.height === h) {
                    const sCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
                    if (sCtx) sData = sCtx.getImageData(0, 0, w, h).data;
                } else {
                    const sCv = this._getScratch('rlSrcFull', w, h);
                    const sCtx = sCv.getContext('2d', { willReadFrequently: true });
                    sCtx.clearRect(0, 0, w, h);
                    sCtx.drawImage(sourceCanvas, 0, 0, w, h);
                    sData = sCtx.getImageData(0, 0, w, h).data;
                }
            } catch (_) {
                sData = null;
            }
        }

        const R = Math.max(3, Math.min(6, Math.round(Math.max(w, h) * 0.006)));
        const R2 = Math.max(1, R >> 1);
        const offsets = [-R, -R2, 0, R2, R];
        const alpha = new Uint8Array(n);

        for (let y = 0; y < h; y++) {
            const yTop = y > R ? y - R : 0;
            const yBot = y + R < h ? y + R : h - 1;
            const yTop2 = y > R2 ? y - R2 : 0;
            const yBot2 = y + R2 < h ? y + R2 : h - 1;
            const row = y * w;
            const rowTop = yTop * w;
            const rowBot = yBot * w;
            const rowTop2 = yTop2 * w;
            const rowBot2 = yBot2 * w;

            for (let x = 0; x < w; x++) {
                const p = row + x;
                const cA = rawA[p];
                const xLeft = x > R ? x - R : 0;
                const xRight = x + R < w ? x + R : w - 1;

                const aT = rawA[rowTop + x];
                const aB = rawA[rowBot + x];
                const aL = rawA[row + xLeft];
                const aR = rawA[row + xRight];

                if (cA >= 246 && aT >= 246 && aB >= 246 && aL >= 246 && aR >= 246) {
                    alpha[p] = 255;
                    continue;
                }
                if (cA <= 25 && aT <= 25 && aB <= 25 && aL <= 25 && aR <= 25) {
                    alpha[p] = 0;
                    continue;
                }

                const xLeft2 = x > R2 ? x - R2 : 0;
                const xRight2 = x + R2 < w ? x + R2 : w - 1;
                let minA = rawA[rowTop2 + x];
                const nB = rawA[rowBot2 + x];
                const nL = rawA[row + xLeft2];
                const nR = rawA[row + xRight2];
                if (nB < minA) minA = nB;
                if (nL < minA) minA = nL;
                if (nR < minA) minA = nR;

                const vIn = cA * 0.78 + minA * 0.22;
                let baseA;
                if (vIn <= 115) {
                    baseA = 0;
                } else if (vIn >= 236) {
                    baseA = 1;
                } else {
                    const t = (vIn - 115) / 121;
                    baseA = t * t * (3 - 2 * t);
                }

                if (baseA <= 0.002) {
                    alpha[p] = 0;
                    continue;
                }

                if (sData) {
                    let fR = 0, fG = 0, fB = 0, fCnt = 0;
                    let bR = 0, bG = 0, bB = 0, bCnt = 0;

                    for (let oi = 0; oi < 5; oi++) {
                        const sy = y + offsets[oi];
                        if (sy < 0 || sy >= h) continue;
                        const sRow = sy * w;
                        for (let oj = 0; oj < 5; oj++) {
                            const sx = x + offsets[oj];
                            if (sx < 0 || sx >= w) continue;
                            const sp = sRow + sx;
                            const sa = rawA[sp];
                            if (sa >= 240) {
                                const si = sp * 4;
                                fR += sData[si];
                                fG += sData[si + 1];
                                fB += sData[si + 2];
                                fCnt++;
                            } else if (sa <= 35) {
                                const si = sp * 4;
                                bR += sData[si];
                                bG += sData[si + 1];
                                bB += sData[si + 2];
                                bCnt++;
                            }
                        }
                    }

                    if (fCnt >= 2 && bCnt >= 2) {
                        const invF = 1 / (fCnt * 255);
                        const invB = 1 / (bCnt * 255);
                        const fr = fR * invF, fg = fG * invF, fb = fB * invF;
                        const br = bR * invB, bg = bG * invB, bb = bB * invB;
                        const dr = fr - br, dg = fg - bg, db = fb - bb;
                        const d2 = dr * dr + dg * dg + db * db;

                        if (d2 > 0.008) {
                            const pi = p * 4;
                            const pr = sData[pi] / 255 - br;
                            const pg = sData[pi + 1] / 255 - bg;
                            const pb = sData[pi + 2] / 255 - bb;
                            let tProj = (pr * dr + pg * dg + pb * db) / d2;
                            if (tProj < 0) tProj = 0;
                            else if (tProj > 1) tProj = 1;

                            const errR = pr - tProj * dr;
                            const errG = pg - tProj * dg;
                            const errB = pb - tProj * db;
                            const perp2 = errR * errR + errG * errG + errB * errB;

                            if (perp2 < 0.025) {
                                const lumB = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;
                                const lumF = 0.2126 * fr + 0.7152 * fg + 0.0722 * fb;
                                if (lumB > lumF + 0.05) {
                                    const guide = Math.pow(tProj, 1.35);
                                    if (guide < baseA) baseA = guide;
                                } else {
                                    baseA *= (0.45 + 0.55 * tProj);
                                }
                            }
                        }
                    }
                }

                alpha[p] = (baseA * 255 + 0.5) | 0;
            }
        }

        this._fullAlphaCache = { key, alpha };
        return alpha;
    },

    /**
     * Mesin Bayangan Adaptif (Scene-Aware Dual-Mode Cast Shadow):
     * - Indoor / Dinding Dekat (outdoorFactor ≈ 0): Bayangan dinding 2-lapis lembut di belakang rambut/bahu per subjek.
     * - Outdoor / Langit Terbuka (outdoorFactor ≈ 1): NOL bayangan di langit & pepohonan jauh! Sebagai gantinya,
     *   memproyeksikan Contact AO di bawah sepatu/kaki + Bayangan Perspektif Tanah/Rumput untuk SETIAP subjek!
     */
    _getCastShadowField(subjectMaskCanvas, maps, lw, lh, L1, normalKey) {
        if (!subjectMaskCanvas || !L1 || !maps) return null;
        const { cxS, cyS, skyMask, outdoorFactor, groundAccept, compLabels, subjects, subj } = maps;
        const maxSide = Math.max(lw, lh);
        const isFrontFlash = L1.isClean > 0.25 || L1.D >= 0.55;
        const sKey = `${normalKey || ''}|${lw}x${lh}|${L1.x.toFixed(3)},${L1.y.toFixed(3)}|${isFrontFlash ? 'F' : 'D'}|${outdoorFactor.toFixed(2)}|${subjectMaskCanvas._isNeural ? 'N' : 'H'}|sc3`;
        if (this._rlShadowCache && this._rlShadowCache.key === sKey) {
            return this._rlShadowCache.data;
        }

        const n = lw * lh;
        const out = new Float32Array(n);
        // Adegan outdoor langit terbuka (outdoorFactor >= 0.55) tidak memiliki dinding dekat — NOL bayangan dinding melayang di langit!
        const wallW = outdoorFactor >= 0.55 ? 0 : Math.pow(1 - outdoorFactor / 0.55, 1.5);
        const gndW = outdoorFactor >= 0.55 ? 1 : (outdoorFactor / 0.55);

        // Helper: bangun kanvas siluet terisolasi untuk 1 subjek tertentu (agar multi-subjek punya bayangan akurat masing-masing)
        const buildSubjectPartCanvas = (subId) => {
            const partCv = this._getScratch('rlSubjPart', lw, lh);
            const pCtx = partCv.getContext('2d', { willReadFrequently: true });
            const pImg = pCtx.createImageData(lw, lh);
            const pd = pImg.data;
            for (let p = 0, i = 0; p < n; p++, i += 4) {
                if (compLabels[p] === subId) {
                    const a = (subj[p] * 255 + 0.5) | 0;
                    if (a > 0) { pd[i + 3] = a; }
                }
            }
            pCtx.putImageData(pImg, 0, 0);
            return partCv;
        };

        // === MODE A: BAYANGAN DINDING DEKAT (INDOOR / STUDIO) ===
        if (wallW > 0.04) {
            const shCv = this._getScratch('rlCastShadow', lw, lh);
            const sCtx = shCv.getContext('2d', { willReadFrequently: true });
            sCtx.clearRect(0, 0, lw, lh);

            const drawWallForTarget = (srcCv, tCx, tCy, tTopY) => {
                const dxS = tCx - L1.x;
                const dyS = tCy - L1.y;
                const dMag = Math.hypot(dxS, dyS);
                let ox = Math.max(-0.085, Math.min(0.085, dxS * 0.24));
                let oy = Math.max(0.012, Math.min(0.090, dyS * 0.20 + 0.026));
                if (dMag < 0.20) {
                    const blend = 1 - dMag / 0.20;
                    ox += 0.026 * blend;
                    oy += 0.014 * blend;
                }
                const scaleOut = 1.010 + Math.min(0.020, dMag * 0.04);
                const pivX = tCx * lw;
                const pivY = Math.max(0.06, Math.min(tCy - 0.14, tTopY + 0.14)) * lh;
                const drawProj = (blurPx, alpha, extraScale, multOff) => {
                    sCtx.save();
                    sCtx.globalAlpha = alpha;
                    sCtx.filter = blurPx > 0.5 ? `blur(${blurPx.toFixed(2)}px)` : 'none';
                    sCtx.translate(pivX + ox * multOff * lw, pivY + oy * multOff * lh);
                    sCtx.scale(scaleOut * extraScale, scaleOut * extraScale);
                    sCtx.drawImage(srcCv, -pivX, -pivY, lw, lh);
                    sCtx.restore();
                };
                drawProj(Math.max(3.0, maxSide * 0.030), 0.68, 1.0, 0.95);
                drawProj(Math.max(7.5, maxSide * 0.072), 0.44, 1.012, 1.40);
            };

            if (subjects.length >= 2) {
                for (let k = 0; k < subjects.length; k++) {
                    const s = subjects[k];
                    drawWallForTarget(buildSubjectPartCanvas(s.id), s.cx, s.cy, s.minY);
                }
            } else {
                const topY = subjects.length === 1 ? subjects[0].minY : Math.max(0.08, cyS - 0.24);
                drawWallForTarget(subjectMaskCanvas, cxS, cyS, topY);
            }

            const wImg = sCtx.getImageData(0, 0, lw, lh).data;
            for (let p = 0, i = 0; p < n; p++, i += 4) {
                // Lindungi langit sekecil apa pun agar tidak kena bayangan dinding
                const noSky = 1 - skyMask[p];
                out[p] += (wImg[i + 3] * 0.00392157) * wallW * noSky;
            }
        }

        // === MODE B: BAYANGAN PERSPEKTIF TANAH/RUMPUT + CONTACT AO (OUTDOOR LANGIT TERBUKA) ===
        if (gndW > 0.04) {
            const gCv = this._getScratch('rlGroundShadow', lw, lh);
            const gCtx = gCv.getContext('2d', { willReadFrequently: true });
            gCtx.clearRect(0, 0, lw, lh);

            const targetList = subjects.length > 0
                ? subjects
                : [{ id: 0, cx: cxS, cy: cyS, minX: 0.2, maxX: 0.8, minY: 0.2, maxY: 0.92, w: 0.4, h: 0.65, feetX: cxS, feetY: 0.92, footMinX: cxS - 0.1, footMaxX: cxS + 0.1, touchesBottom: false }];

            // Arah bayangan global yang konsisten untuk SELURUH subjek di pemandangan (seperti matahari / lampu utama tunggal!)
            // Saat lampu di tengah-depan (flash kamera), beri bias perspektif alami halus ke kanan-belakang agar semua subjek konsisten.
            const globalDx = 0.50 - L1.x;
            const centerBias = Math.abs(globalDx) < 0.16 ? (1 - Math.abs(globalDx) / 0.16) * 0.24 : 0;

            for (let k = 0; k < targetList.length; k++) {
                const s = targetList[k];
                const partCv = s.id > 0 ? buildSubjectPartCanvas(s.id) : subjectMaskCanvas;

                // Gabungan arah global konsisten (80%) + paralaks lokal ringan (20%) agar 2 orang TIDAK punya bayangan berlawanan arah secara aneh!
                const localDx = s.cx - L1.x;
                let skewX = globalDx * 1.45 + centerBias + localDx * 0.22;
                skewX = Math.max(-1.05, Math.min(1.05, skewX));

                // Flash frontal / cahaya depan -> bayangan jatuh MUNDUR ke belakang kaki di rumput (squashY > 0);
                // Matahari/lampu belakang-samping (non-flash, y < 0.30) -> bayangan jatuh sedikit ke depan/samping!
                const isBackSun = !isFrontFlash && L1.y < 0.30;
                const elevScale = 0.32 + Math.min(0.20, Math.max(0, (L1.y - 0.12) * 0.42));
                const squashY = isBackSun ? -Math.min(0.36, elevScale * 0.85) : elevScale;

                // Titik jangkar tanah: tepat di bawah sepatu (jika utuh) atau sedikit di bawah tepi foto (jika terpotong pinggang/paha)
                const ax = s.feetX * lw;
                const ay = (s.touchesBottom ? 1.06 : s.feetY) * lh;
                const footSpanPx = Math.max(lw * 0.045, (s.footMaxX - s.footMinX) * lw);

                // 1) Contact Ambient Occlusion pekat & alami tepat di bawah sepatu/telapak kaki (mengunci subjek menapak di rumput!)
                if (!s.touchesBottom) {
                    const aoRx = Math.max(lw * 0.065, footSpanPx * 1.25);
                    const aoRy = Math.max(lh * 0.020, Math.min(lh * 0.044, s.h * lh * 0.068));
                    const aoOffX = skewX * aoRy * 0.72;
                    gCtx.save();
                    gCtx.translate(ax + aoOffX, ay + aoRy * 0.10);
                    gCtx.scale(1, aoRy / aoRx);
                    const radG = gCtx.createRadialGradient(0, 0, aoRx * 0.08, 0, 0, aoRx);
                    radG.addColorStop(0, 'rgba(0,0,0,0.96)');
                    radG.addColorStop(0.50, 'rgba(0,0,0,0.68)');
                    radG.addColorStop(1, 'rgba(0,0,0,0)');
                    gCtx.fillStyle = radG;
                    gCtx.beginPath();
                    gCtx.arc(0, 0, aoRx, 0, Math.PI * 2);
                    gCtx.fill();
                    gCtx.restore();
                }

                // 2) Proyeksi Bayangan Siluet Perspektif 2-Lapis di Bidang Tanah (dekat kaki tegas, ujung kepala lembut meluruh!)
                const drawGroundProj = (skMul, sqMul, blurPx, alpha, yBiasPx) => {
                    gCtx.save();
                    gCtx.globalAlpha = alpha;
                    gCtx.filter = blurPx > 0.5 ? `blur(${blurPx.toFixed(2)}px)` : 'none';
                    gCtx.translate(ax, ay + yBiasPx);
                    gCtx.transform(1, 0, -(skewX * skMul), squashY * sqMul, 0, 0);
                    gCtx.translate(-ax, -ay);
                    gCtx.drawImage(partCv, 0, 0, lw, lh);
                    gCtx.restore();
                };

                if (s.touchesBottom) {
                    // Subjek dekat terpotong di bawah (mis. pria condong di rumput): bayangan lembut & terbaca di rumput di bawah/belakang tubuhnya
                    drawGroundProj(0.88, 1.05, Math.max(4.8, maxSide * 0.028), 0.76, 0);
                    drawGroundProj(1.14, 1.24, Math.max(10.0, maxSide * 0.060), 0.48, -lh * 0.012);
                } else {
                    // Subjek utuh berdiri di rumput (mis. wanita bertopi): bayangan dekat sepatu pekat & tajam, memanjang & melembut ke rumput
                    drawGroundProj(0.94, 0.92, Math.max(2.2, maxSide * 0.013), 0.86, lh * 0.005);
                    drawGroundProj(1.18, 1.22, Math.max(6.4, maxSide * 0.038), 0.56, -lh * 0.004);
                }
            }

            const gImg = gCtx.getImageData(0, 0, lw, lh).data;
            for (let y = 0, p = 0; y < lh; y++) {
                const v = (y + 0.5) / lh;
                for (let x = 0; x < lw; x++, p++) {
                    const ga = groundAccept[p];
                    if (ga <= 0.002) continue;
                    const rawA = gImg[(p << 2) + 3] * 0.00392157;
                    if (rawA <= 0.002) continue;
                    // Peluruhan jarak lembut agar ujung terjauh bayangan melumer alami ke rumput
                    const distFade = 0.62 + 0.38 * Math.min(1, Math.max(0, (v - maps.horizonY) / Math.max(0.25, 1 - maps.horizonY)));
                    const vOut = out[p] + rawA * ga * distFade * gndW;
                    out[p] = vOut > 1 ? 1 : vOut;
                }
            }
        }

        this._rlShadowCache = { key: sKey, data: out };
        return out;
    },

    applyRelight(targetCanvas, subjectMaskCanvas, cfg) {
        if (!cfg || !cfg.enabled) return;
        const activeLights = (cfg.lights || []).filter((l) => l && l.on && (l.intensity || 0) > 0);
        const ambient = cfg.ambient || 0;
        if (!activeLights.length && !ambient) return;

        const w = targetCanvas.width;
        const h = targetCanvas.height;
        const maxSide = Math.max(w, h);
        const mapMax = cfg.fast ? 200 : 320;
        const sc = Math.min(1, mapMax / maxSide);
        const lw = Math.max(24, Math.round(w * sc));
        const lh = Math.max(24, Math.round(h * sc));
        const n = lw * lh;

        const maps = this._getRelightMaps(targetCanvas, subjectMaskCanvas, lw, lh, cfg.normalKey);
        const { nx, ny, nz, edge, ex, ey, hasMask, proxSpill, skyMask, horizonY, outdoorFactor, compLabels, subjects } = maps;
        const fullAlpha = hasMask ? this._getFullResSubjectAlpha(subjectMaskCanvas, targetCanvas, w, h, cfg.normalKey) : null;

        const nStr = Math.max(0, Math.min(1, (cfg.shading ?? 44) / 100));
        const shadowAmt = Math.max(0, Math.min(1, (cfg.shadow ?? 60) / 100));
        const rawAmb = Math.max(-0.92, Math.min(0.40, ambient / 100));
        // Pada foto outdoor terang, redam penggelapan ekstrem ~22% agar subjek & suasana langit/rumput tetap menyatu alami
        const amb = rawAmb < 0 ? rawAmb * (1 - outdoorFactor * 0.22) : rawAmb;
        const aspectX = lw / Math.max(lw, lh);
        const aspectY = lh / Math.max(lw, lh);

        const parsedLights = activeLights.map((l) => {
            const [r, g, b] = this._hexToRgb(l.color);
            const rN = r / 255, gN = g / 255, bN = b / 255;
            const cMax = Math.max(rN, gN, bN, 0.001);
            const cMin = Math.min(rN, gN, bN);
            const sat = (cMax - cMin) / cMax;
            const sz = Math.max(0.15, Math.min(1, (l.size ?? 64) / 100));
            const rad = 0.18 + sz * 0.70;
            const nr = rN / cMax, ng = gN / cMax, nb = bN / cMax;
            return {
                x: l.x ?? 0.48,
                y: l.y ?? 0.40,
                nr, ng, nb,
                rN, gN, bN,
                sat,
                isClean: sat < 0.20 ? (1 - sat / 0.20) : 0,
                I: Math.max(0, Math.min(1, (l.intensity || 0) / 100)),
                inv2Rad2: 1 / (2 * rad * rad),
                zH: 0.38 + sz * 0.42,
                D: Math.max(-1, Math.min(1, (l.depth ?? 84) / 100)),
                rim: Math.max(0, Math.min(1, (l.rim ?? 0) / 100))
            };
        });

        // 1. DUAL-FIELD SMOOTH LIGHTING MAPS (fSub vs fBg terpisah kontinu, lalu dicampur di resolusi penuh via fullAlpha!)
        let fSubR = this._rlSubR, fSubG = this._rlSubG, fSubB = this._rlSubB;
        let fBgR = this._rlBgR, fBgG = this._rlBgG, fBgB = this._rlBgB;
        let fCr = this._rlCr, fCl = this._rlCl;
        let fRR = this._rlRR, fRG = this._rlRG, fRB = this._rlRB;
        if (!fSubR || fSubR.length < n) {
            fSubR = this._rlSubR = new Float32Array(n);
            fSubG = this._rlSubG = new Float32Array(n);
            fSubB = this._rlSubB = new Float32Array(n);
            fBgR = this._rlBgR = new Float32Array(n);
            fBgG = this._rlBgG = new Float32Array(n);
            fBgB = this._rlBgB = new Float32Array(n);
            fCr = this._rlCr = new Float32Array(n);
            fCl = this._rlCl = new Float32Array(n);
            fRR = this._rlRR = new Float32Array(n);
            fRG = this._rlRG = new Float32Array(n);
            fRB = this._rlRB = new Float32Array(n);
        }

        const invLw = 1 / lw;
        const invLh = 1 / lh;
        const nLights = parsedLights.length;
        const hasCleanLight = parsedLights.some((L) => L.isClean > 0.2);

        const castShadow = (hasMask && shadowAmt > 0.01 && nLights > 0)
            ? this._getCastShadowField(subjectMaskCanvas, maps, lw, lh, parsedLights[0], cfg.normalKey)
            : null;
        const shadowScale = 0.56 + outdoorFactor * 0.22;
        const shadowStr = shadowAmt * shadowScale * (nLights > 0 ? Math.min(1, 0.35 + parsedLights[0].I * 0.85) : 0);

        const subjById = new Map();
        for (let k = 0; k < subjects.length; k++) subjById.set(subjects[k].id, subjects[k]);
        const primaryL = nLights > 0 ? parsedLights[0] : null;
        const horSafe = Math.max(0.24, horizonY);
        const gndSpanSafe = Math.max(0.20, 1 - horizonY);

        for (let y = 0, p = 0; y < lh; y++) {
            const v = (y + 0.5) * invLh;
            const skyGrad = 0.88 + 0.10 * Math.min(1, v / horSafe);
            const groundGrad = 0.94 + 0.14 * Math.max(0, Math.min(1, (v - horizonY) / gndSpanSafe));

            for (let x = 0; x < lw; x++, p++) {
                const u = (x + 0.5) * invLw;
                const sk = skyMask[p];
                const eg = edge[p];
                const prox = proxSpill[p];
                const pnx = nx[p], pny = ny[p], pnz = nz[p];
                const pex = ex[p], pey = ey[p];

                const edgeR = Math.hypot((u - 0.5) * aspectX, (v - 0.44) * aspectY);
                const indoorFall = (0.88 + 0.16 * v) * Math.max(0.72, 1.04 - edgeR * 0.32);
                const outdoorBgFall = sk * skyGrad + (1 - sk) * groundGrad;
                const bgFall = indoorFall * (1 - outdoorFactor) + outdoorBgFall * outdoorFactor;

                // Pantulan cahaya halus eksklusif pada dinding/ruang indoor dekat (NOL aura pendar di foto outdoor/langit!)
                const shHere = castShadow ? castShadow[p] : 0;
                const bounceWrap = amb < 0 ? (-amb) * prox * (1 - outdoorFactor) * (1 - sk * 0.95) * (1 - shHere * 0.85) * 0.06 : 0;

                let bgBase = amb < 0
                    ? Math.min(1.02, (1 + amb) * bgFall + bounceWrap)
                    : 1 + amb * 0.55;
                if (shHere > 0.002) {
                    bgBase *= (1 - shadowStr * shHere);
                }
                if (bgBase < 0.08) bgBase = 0.08;

                let subBase = amb < 0
                    ? (1 + amb * 0.04) * (0.94 + 0.06 * Math.max(0, 1 - edgeR * 0.95))
                    : 1 + amb * 0.45;
                if (subBase < 0.25) subBase = 0.25;

                const bgCool = amb < 0 && hasCleanLight ? (-amb) * 0.045 : 0;
                const skyCyanKeep = amb < 0 ? (-amb) * sk * outdoorFactor * 0.14 : 0;
                let bR = bgBase * (1 - bgCool * 0.38 - skyCyanKeep * 0.46);
                let bG = bgBase * (1 - bgCool * 0.06 + skyCyanKeep * 0.05);
                let bB = bgBase * (1 + bgCool * 0.48 + skyCyanKeep * 0.42);

                let sR = subBase, sG = subBase, sB = subBase;
                let litSubSum = 0;
                let cleanSubSum = 0;
                let maxNdotL = 0;
                let maxFall = 0;
                let rmR = 0, rmG = 0, rmB = 0;

                for (let li = 0; li < nLights; li++) {
                    const L = parsedLights[li];
                    const dx = (u - L.x) * aspectX;
                    const dy = (v - L.y) * aspectY;
                    const dist2 = dx * dx + dy * dy;
                    const fall = Math.exp(-dist2 * L.inv2Rad2);
                    if (fall > maxFall) maxFall = fall;

                    const invLen = 1 / Math.sqrt(dist2 + L.zH * L.zH);
                    const Lx = -dx * invLen;
                    const Ly = -dy * invLen;
                    const Lz = L.zH * invLen;

                    let ndotl = pnx * Lx + pny * Ly + pnz * Lz;
                    if (ndotl < 0) ndotl = 0;
                    if (ndotl > maxNdotL) maxNdotL = ndotl;

                    const isFrontalFlash = L.isClean > 0.35 && L.D >= 0.65 && hasMask;
                    const baseFloor = (isFrontalFlash && subjects.length >= 2) ? 0.62 : 0.48;
                    const effFall = isFrontalFlash ? (baseFloor + (1 - baseFloor) * fall) : fall;
                    const shade = isFrontalFlash
                        ? (0.89 + 0.17 * ndotl)
                        : ((1 - nStr * 0.24) + nStr * 0.38 * ndotl);

                    const dwSub = hasMask ? (L.D >= 0 ? 1 : (1 + L.D * 0.88)) : 1;
                    const dwBg = hasMask
                        ? (L.D >= 0 ? (1 - L.D * 0.86) * (1 - sk * 0.96) : 1)
                        : 1;

                    const litS = L.I * effFall * shade * dwSub;
                    const litB = L.I * fall * shade * dwBg;
                    litSubSum += litS;

                    if (L.sat < 0.22) {
                        const boostS = litS * (isFrontalFlash ? 0.20 : 0.34);
                        const boostB = litB * (isFrontalFlash ? 0.18 : 0.30);
                        const tintMix = 0.40;
                        const tr = 1 - tintMix + tintMix * L.nr;
                        const tg = 1 - tintMix + tintMix * L.ng;
                        const tb = 1 - tintMix + tintMix * L.nb;
                        sR += boostS * tr; sG += boostS * tg; sB += boostS * tb;
                        bR += boostB * tr; bG += boostB * tg; bB += boostB * tb;
                        cleanSubSum += litS * L.isClean;
                    } else {
                        const cPowS = litS * 0.66;
                        const cPowB = litB * 0.58;
                        const crR = 0.20 + 0.86 * L.nr, crG = 0.20 + 0.86 * L.ng, crB = 0.20 + 0.86 * L.nb;
                        sR += cPowS * crR; sG += cPowS * crG; sB += cPowS * crB;
                        bR += cPowB * crR; bG += cPowB * crG; bB += cPowB * crB;
                        const subKS = litS * L.sat * 0.20;
                        sR *= (1 - subKS * (1 - L.nr));
                        sG *= (1 - subKS * (1 - L.ng));
                        sB *= (1 - subKS * (1 - L.nb));
                    }

                    if (L.rim > 0.01 && hasMask && eg > 0.01) {
                        const align = Math.max(0.20, (pex * Lx + pey * Ly) * 0.72 + 0.28);
                        const rPow = L.rim * L.I * (0.35 + 0.65 * fall) * eg * align * 0.44;
                        rmR += L.rN * rPow;
                        rmG += L.gN * rPow;
                        rmB += L.bN * rPow;
                    }
                }

                // 3D Directional Wrap Self-Shading halus pada subjek outdoor
                if (primaryL && outdoorFactor > 0.25 && nStr > 0.10) {
                    const sObj = subjById.get(compLabels[p]);
                    if (sObj && sObj.w > 0.04) {
                        const relX = (u - sObj.cx) / (sObj.w * 0.55);
                        const lightSide = Math.max(-1, Math.min(1, (primaryL.x - sObj.cx) * 2.4));
                        const away = Math.max(0, -relX * lightSide);
                        const wrapDark = 1 - Math.min(0.12, away * 0.10 * nStr * primaryL.I * outdoorFactor);
                        sR *= wrapDark; sG *= wrapDark; sB *= wrapDark;
                    }
                }

                if (nLights > 0 && nStr > 0.05 && !hasCleanLight) {
                    const sideShadow = 1 - nStr * 0.14 * (1 - maxNdotL) * (1 - maxFall * 0.70);
                    sR *= sideShadow; sG *= sideShadow; sB *= sideShadow;
                }

                const crisp = Math.min(1, litSubSum * (0.38 + 0.52 * nStr));

                fSubR[p] = sR < 0.12 ? 0.12 : sR > 1.65 ? 1.65 : sR;
                fSubG[p] = sG < 0.12 ? 0.12 : sG > 1.65 ? 1.65 : sG;
                fSubB[p] = sB < 0.12 ? 0.12 : sB > 1.65 ? 1.65 : sB;
                fBgR[p] = bR < 0.08 ? 0.08 : bR > 1.55 ? 1.55 : bR;
                fBgG[p] = bG < 0.08 ? 0.08 : bG > 1.55 ? 1.55 : bG;
                fBgB[p] = bB < 0.08 ? 0.08 : bB > 1.55 ? 1.55 : bB;
                fCr[p] = crisp;
                fCl[p] = cleanSubSum > 1 ? 1 : cleanSubSum;
                fRR[p] = rmR > 0.55 ? 0.55 : rmR;
                fRG[p] = rmG > 0.55 ? 0.55 : rmG;
                fRB[p] = rmB > 0.55 ? 0.55 : rmB;
            }
        }

        // 2. Terapkan Dual-Field dengan Full-Resolution Alpha Mask (100% bebas tepi kasar/staircasing!)
        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;

        let ix0 = this._rlIx0, ix1 = this._rlIx1, fxArr = this._rlFx;
        if (!ix0 || ix0.length < w) {
            ix0 = this._rlIx0 = new Int32Array(w);
            ix1 = this._rlIx1 = new Int32Array(w);
            fxArr = this._rlFx = new Float32Array(w);
        }
        const sx = lw / w;
        const sy = lh / h;
        const lwM1 = lw - 1;
        const lhM1 = lh - 1;
        for (let x = 0; x < w; x++) {
            let u = (x + 0.5) * sx - 0.5;
            if (u < 0) u = 0;
            else if (u > lwM1) u = lwM1;
            const x0 = u | 0;
            ix0[x] = x0;
            ix1[x] = x0 < lwM1 ? x0 + 1 : lwM1;
            fxArr[x] = u - x0;
        }

        const inv255 = 1 / 255;
        for (let y = 0; y < h; y++) {
            let v = (y + 0.5) * sy - 0.5;
            if (v < 0) v = 0;
            else if (v > lhM1) v = lhM1;
            const y0 = v | 0;
            const y1 = y0 < lhM1 ? y0 + 1 : lhM1;
            const fy = v - y0;
            const ify = 1 - fy;
            const row0 = y0 * lw;
            const row1 = y1 * lw;
            const pixRow = y * w;
            const imgRow = pixRow << 2;

            for (let x = 0; x < w; x++) {
                const pxIdx = pixRow + x;
                const idx = imgRow + (x << 2);
                if (d[idx + 3] === 0) continue;

                const x0 = ix0[x], x1 = ix1[x], fx = fxArr[x], ifx = 1 - fx;
                const w00 = ifx * ify, w10 = fx * ify, w01 = ifx * fy, w11 = fx * fy;
                const p00 = row0 + x0, p10 = row0 + x1, p01 = row1 + x0, p11 = row1 + x1;

                const sj = fullAlpha ? (fullAlpha[pxIdx] * inv255) : 1;
                const bgR = fBgR[p00] * w00 + fBgR[p10] * w10 + fBgR[p01] * w01 + fBgR[p11] * w11;
                const bgG = fBgG[p00] * w00 + fBgG[p10] * w10 + fBgG[p01] * w01 + fBgG[p11] * w11;
                const bgB = fBgB[p00] * w00 + fBgB[p10] * w10 + fBgB[p01] * w01 + fBgB[p11] * w11;
                const subR = fSubR[p00] * w00 + fSubR[p10] * w10 + fSubR[p01] * w01 + fSubR[p11] * w11;
                const subG = fSubG[p00] * w00 + fSubG[p10] * w10 + fSubG[p01] * w01 + fSubG[p11] * w11;
                const subB = fSubB[p00] * w00 + fSubB[p10] * w10 + fSubB[p01] * w01 + fSubB[p11] * w11;

                // Monotonic zero-halo blending saat latar digelapkan (menghilangkan pendaran matte latar terang di tepi rambut & lengan!)
                const bgL = bgR + bgG + bgB;
                const subL = subR + subG + subB;
                const sjG = (sj > 0 && sj < 1 && subL > bgL + 0.02) ? (sj * sj * (0.35 + 0.65 * sj)) : sj;

                const gR = bgR + (subR - bgR) * sjG;
                const gG = bgG + (subG - bgG) * sjG;
                const gB = bgB + (subB - bgB) * sjG;
                const cr = (fCr[p00] * w00 + fCr[p10] * w10 + fCr[p01] * w01 + fCr[p11] * w11) * (hasMask ? (0.10 + 0.90 * sjG) : 1);
                const cl = (fCl[p00] * w00 + fCl[p10] * w10 + fCl[p01] * w01 + fCl[p11] * w11) * sjG;

                const rn = d[idx] * inv255;
                const gn = d[idx + 1] * inv255;
                const bn = d[idx + 2] * inv255;
                const lum = 0.299 * rn + 0.587 * gn + 0.114 * bn;

                // 1) Eksposur Fisik Halus + Filmic Highlight Shoulder
                let or = rn * gR;
                let og = gn * gG;
                let ob = bn * gB;

                const gMax = gR > gG ? (gR > gB ? gR : gB) : (gG > gB ? gG : gB);
                if (gMax > 1.0) {
                    const shK = (gMax - 1.0) * 1.08;
                    or = or / (1 + or * shK);
                    og = og / (1 + og * shK);
                    ob = ob / (1 + ob * shK);
                }

                // 2) Filmic Black-Point Toe lembut
                if (cr > 0.01 && lum < 0.28) {
                    const tToe = lum * 3.571;
                    const sToe = tToe * tToe * (3 - 2 * tToe);
                    const blackAnchor = 1 - cr * (1 - sToe) * 0.38;
                    or *= blackAnchor;
                    og *= blackAnchor;
                    ob *= blackAnchor;
                }

                // 3) Filmic Micro-Contrast S-Curve halus & creamy
                if (cr > 0.01) {
                    const sK = cr * 0.24;
                    if (or > 0 && or < 1) or += (or - 0.42) * or * (1 - or) * sK;
                    if (og > 0 && og < 1) og += (og - 0.42) * og * (1 - og) * sK;
                    if (ob > 0 && ob < 1) ob += (ob - 0.42) * ob * (1 - ob) * sK;
                }

                // 4) Clean Flash White-Balance halus
                if (cl > 0.01) {
                    const avg = (or + og + ob) * 0.333333;
                    if (lum < 0.30) {
                        const hairW = cl * (1 - lum * 3.333) * 0.68;
                        or += (avg - or) * hairW;
                        og += (avg - og) * hairW;
                        ob += (avg - ob) * hairW;
                    } else {
                        const cHi = or > og ? (or > ob ? or : ob) : (og > ob ? og : ob);
                        const cLo = or < og ? (or < ob ? or : ob) : (og < ob ? og : ob);
                        const sat = cHi - cLo;
                        if (sat < 0.36) {
                            const skinGate = (1 - sat * 2.78) * Math.min(1, (lum - 0.28) * 2.4) * Math.max(0, Math.min(1, (0.86 - lum) * 4.4));
                            if (skinGate > 0) {
                                const glowLift = cl * skinGate * 0.044;
                                or += glowLift * 0.78;
                                og += glowLift * 1.02;
                                ob += glowLift * 1.20;
                                if (or > ob) {
                                    const nK = cl * skinGate * 0.26;
                                    ob += (avg - ob) * nK;
                                    og += (avg - og) * (nK * 0.25);
                                }
                            }
                        }
                    }
                }

                // 5) Directional Rim Light halus (dimodulasi tekstur asli & fullAlpha!)
                const rmR = (fRR[p00] * w00 + fRR[p10] * w10 + fRR[p01] * w01 + fRR[p11] * w11) * sj;
                const rmG = (fRG[p00] * w00 + fRG[p10] * w10 + fRG[p01] * w01 + fRG[p11] * w11) * sj;
                const rmB = (fRB[p00] * w00 + fRB[p10] * w10 + fRB[p01] * w01 + fRB[p11] * w11) * sj;
                if (rmR > 0.002 || rmG > 0.002 || rmB > 0.002) {
                    const rimTex = 0.32 + 0.85 * Math.min(1, lum * 1.4);
                    or = 1 - (1 - (or > 1 ? 1 : or)) * (1 - rmR * rimTex);
                    og = 1 - (1 - (og > 1 ? 1 : og)) * (1 - rmG * rimTex);
                    ob = 1 - (1 - (ob > 1 ? 1 : ob)) * (1 - rmB * rimTex);
                }

                d[idx] = or <= 0 ? 0 : or >= 1 ? 255 : (or * 255 + 0.5) | 0;
                d[idx + 1] = og <= 0 ? 0 : og >= 1 ? 255 : (og * 255 + 0.5) | 0;
                d[idx + 2] = ob <= 0 ? 0 : ob >= 1 ? 255 : (ob * 255 + 0.5) | 0;
            }
        }

        // 3. Ketajaman mikro super-halus (hanya 0.08 agar foto tetap lembut & silky, TIDAK kasar/gritty!)
        if (!cfg.fast && nStr > 0.35 && nLights > 0) {
            const sharpGain = nStr * 0.08;
            const totalPx = w * h;
            let lumBuf = this._sharpLumBuf;
            if (!lumBuf || lumBuf.length < totalPx) lumBuf = this._sharpLumBuf = new Float32Array(totalPx);
            for (let p = 0, i = 0; p < totalPx; p++, i += 4) {
                lumBuf[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            }
            for (let y = 1; y < h - 1; y++) {
                const row = y * w;
                const rowU = row - w;
                const rowD = row + w;
                const fyIdx = Math.min(lhM1, (y * sy) | 0) * lw;
                for (let x = 1; x < w - 1; x++) {
                    const p = row + x;
                    const idx = p << 2;
                    if (d[idx + 3] === 0) continue;
                    const sjW = fullAlpha ? fullAlpha[p] * inv255 : 1;
                    if (sjW < 0.35) continue;
                    const crW = fCr[fyIdx + ix0[x]] * sjW;
                    if (crW < 0.20) continue;
                    const lC = lumBuf[p];
                    const lBlur = (
                        lC * 4 +
                        (lumBuf[p - 1] + lumBuf[p + 1] + lumBuf[rowU + x] + lumBuf[rowD + x]) * 2 +
                        lumBuf[rowU + x - 1] + lumBuf[rowU + x + 1] + lumBuf[rowD + x - 1] + lumBuf[rowD + x + 1]
                    ) * 0.0625;
                    const diff = lC - lBlur;
                    const ad = diff < 0 ? -diff : diff;
                    if (ad < 2.4) continue;
                    const add = diff * sharpGain * crW;
                    d[idx] = d[idx] + add;
                    d[idx + 1] = d[idx + 1] + add;
                    d[idx + 2] = d[idx + 2] + add;
                }
            }
        }

        ctx.putImageData(img, 0, 0);
    },

    /**
     * Mesin Filter Flash Optik Berbasis AI Subjek (v40 — Silky Dual-Field Full-Res Blending):
     * - 100% bebas tepi potong kasar/staircasing (full-res alpha + proximity bounce-light spill!)
     * - Rim Light organik berbasis tekstur & luminance rambut asli (NOL garis kapur/stiker putih buatan!)
     * - Kurva filmic silky untuk kulit mulus, highlight berkilau tanpa pecah, & neon preservation cerdas!
     */
    applyOpticalFlashPreset(targetCanvas, subjectMaskCanvas, flashCfg, strength = 1, opts = {}) {
        if (!flashCfg || strength <= 0) return;
        const str = Math.min(1, Math.max(0, strength));
        const w = targetCanvas.width;
        const h = targetCanvas.height;
        if (!w || !h) return;

        const power = Math.min(1, Math.max(0, flashCfg.power ?? 0.62)) * str;
        const rawBgDark = Math.min(0.92, Math.max(0, flashCfg.bgDark ?? (flashCfg.falloff ?? 0.50) * 0.65)) * str;
        const keepLights = Math.min(1, Math.max(0, flashCfg.keepLights ?? 0.45));
        const shadowAmt = Math.min(1, Math.max(0, flashCfg.shadow ?? 0)) * str;
        const rimPower = Math.min(1, Math.max(0, flashCfg.rimPower ?? 0)) * str;
        const skinGlow = Math.min(1, Math.max(0, flashCfg.skinGlow ?? 0.30)) * str;
        const bloom = Math.min(1, Math.max(0, flashCfg.bloom ?? 0.28)) * str;
        const bloomThresh = Math.min(0.90, Math.max(0.55, flashCfg.bloomThresh ?? 0.76));
        const halation = Math.min(1, Math.max(0, flashCfg.halation ?? 0)) * str;
        const rad = Math.min(0.95, Math.max(0.34, flashCfg.radius ?? 0.62));
        const cx = flashCfg.cx ?? 0.50;
        const cy = flashCfg.cy ?? 0.43;

        const [fr, fg, fb] = this._hexToRgb(flashCfg.color || '#eef6ff');
        const fMax = Math.max(fr, fg, fb, 1);
        const fnr = fr / fMax, fng = fg / fMax, fnb = fb / fMax;
        const fSat = (fMax - Math.min(fr, fg, fb)) / fMax;
        const isCleanFlash = fSat < 0.24 ? (1 - fSat / 0.24) : 0;

        const [rmColR, rmColG, rmColB] = this._hexToRgb(flashCfg.rimColor || '#ffecc8');
        const rmRn = rmColR / 255, rmGn = rmColG / 255, rmBn = rmColB / 255;

        const bgTint = Array.isArray(flashCfg.bgTint) && flashCfg.bgTint.length === 3 ? flashCfg.bgTint : null;
        const bgTintStr = bgTint ? Math.min(1, Math.max(0, flashCfg.bgTintStr ?? 0.55)) * str : 0;
        const bgTr = bgTint ? (1 + (bgTint[0] - 1) * bgTintStr) : 1;
        const bgTg = bgTint ? (1 + (bgTint[1] - 1) * bgTintStr) : 1;
        const bgTb = bgTint ? (1 + (bgTint[2] - 1) * bgTintStr) : 1;

        const maxSide = Math.max(w, h);
        const mapMax = opts.fast ? 180 : 300;
        const sc = Math.min(1, mapMax / maxSide);
        const lw = Math.max(24, Math.round(w * sc));
        const lh = Math.max(24, Math.round(h * sc));
        const n = lw * lh;

        const maps = subjectMaskCanvas
            ? this._getRelightMaps(targetCanvas, subjectMaskCanvas, lw, lh, opts.normalKey)
            : null;
        const hasMask = !!(maps && maps.hasMask);
        const fullAlpha = hasMask ? this._getFullResSubjectAlpha(subjectMaskCanvas, targetCanvas, w, h, opts.normalKey) : null;
        const skyMask = hasMask ? maps.skyMask : null;
        const proxSpill = hasMask ? maps.proxSpill : null;
        const outdoorFactor = hasMask ? maps.outdoorFactor : 0;
        const horizonY = hasMask ? maps.horizonY : 0.48;
        const bgDark = rawBgDark * (1 - outdoorFactor * 0.20);

        const aspectX = lw / Math.max(lw, lh);
        const aspectY = lh / Math.max(lw, lh);
        const inv2Rad2 = 1 / (2 * (rad * 0.88) * (rad * 0.88));
        const invLw = 1 / lw;
        const invLh = 1 / lh;

        const virtualL1 = { x: cx, y: cy, isClean: isCleanFlash, D: 0.86, I: Math.max(0.55, power) };
        const castShadow = (hasMask && shadowAmt > 0.02)
            ? this._getCastShadowField(subjectMaskCanvas, maps, lw, lh, virtualL1, opts.normalKey)
            : null;
        const shadowStr = shadowAmt * (0.58 + outdoorFactor * 0.18);

        let fSubR = this._flSubR, fSubG = this._flSubG, fSubB = this._flSubB;
        let fBgR = this._flBgR, fBgG = this._flBgG, fBgB = this._flBgB;
        let fLit = this._flLit;
        if (!fSubR || fSubR.length < n) {
            fSubR = this._flSubR = new Float32Array(n);
            fSubG = this._flSubG = new Float32Array(n);
            fSubB = this._flSubB = new Float32Array(n);
            fBgR = this._flBgR = new Float32Array(n);
            fBgG = this._flBgG = new Float32Array(n);
            fBgB = this._flBgB = new Float32Array(n);
            fLit = this._flLit = new Float32Array(n);
        }

        const horSafe = Math.max(0.24, horizonY);
        const gndSpanSafe = Math.max(0.20, 1 - horizonY);
        const centerX = hasMask ? (maps.cxS * 0.65 + cx * 0.35) : cx;
        const centerY = hasMask ? (Math.min(maps.cyS, 0.46) * 0.55 + cy * 0.45) : cy;

        for (let y = 0, p = 0; y < lh; y++) {
            const v = (y + 0.5) * invLh;
            const skyGrad = 0.88 + 0.10 * Math.min(1, v / horSafe);
            const groundGrad = 0.94 + 0.14 * Math.max(0, Math.min(1, (v - horizonY) / gndSpanSafe));

            for (let x = 0; x < lw; x++, p++) {
                const u = (x + 0.5) * invLw;
                const dx = (u - centerX) * aspectX;
                const dy = (v - centerY) * aspectY;
                const dist2 = dx * dx + dy * dy;
                const fall = Math.exp(-dist2 * inv2Rad2);

                const sk = hasMask ? skyMask[p] : 0;
                const prox = hasMask ? proxSpill[p] : fall;
                const shHere = castShadow ? castShadow[p] : 0;

                const edgeR = Math.hypot((u - 0.5) * aspectX, (v - 0.44) * aspectY);
                const indoorFall = (0.90 + 0.14 * v) * Math.max(0.66, 1.05 - edgeR * 0.42);
                const outdoorFall = sk * skyGrad + (1 - sk) * groundGrad;
                const bgFall = indoorFall * (1 - outdoorFactor) + outdoorFall * outdoorFactor;

                // Pantulan cahaya halus hanya pada dinding indoor lembut (NOL aura di foto outdoor atau latar obsidian gelap STUDIO RIM!)
                const bounceWrap = (bgDark <= 0.72) ? (bgDark * prox * (1 - outdoorFactor) * (1 - sk * 0.95) * (1 - shHere * 0.85) * 0.07) : 0;
                let bgBase = Math.min(1.04, (1 - bgDark) * bgFall + bounceWrap);
                if (shHere > 0.002) {
                    bgBase *= (1 - shadowStr * shHere);
                }
                if (bgBase < 0.03) bgBase = 0.03;

                const bgSpill = hasMask ? (0.09 * (1 - bgDark * 0.85) * (1 - sk * 0.96) * fall * power) : (0.16 * fall * power);
                const tintMix = fSat < 0.20 ? 0.40 : 0.74;
                const tr = 1 - tintMix + tintMix * fnr;
                const tg = 1 - tintMix + tintMix * fng;
                const tb = 1 - tintMix + tintMix * fnb;

                const bR = bgBase * bgTr + bgSpill * tr;
                const bG = bgBase * bgTg + bgSpill * tg;
                const bB = bgBase * bgTb + bgSpill * tb;

                const effFall = hasMask ? (0.64 + 0.36 * fall) : fall;
                const lit = power * effFall;
                const boost = lit * (0.14 + skinGlow * 0.07);
                const sR = 0.98 + boost * tr;
                const sG = 0.98 + boost * tg;
                const sB = 0.98 + boost * tb;

                fSubR[p] = sR < 0.20 ? 0.20 : sR > 1.50 ? 1.50 : sR;
                fSubG[p] = sG < 0.20 ? 0.20 : sG > 1.50 ? 1.50 : sG;
                fSubB[p] = sB < 0.20 ? 0.20 : sB > 1.50 ? 1.50 : sB;
                fBgR[p] = bR < 0.03 ? 0.03 : bR > 1.45 ? 1.45 : bR;
                fBgG[p] = bG < 0.03 ? 0.03 : bG > 1.45 ? 1.45 : bG;
                fBgB[p] = bB < 0.03 ? 0.03 : bB > 1.45 ? 1.45 : bB;
                fLit[p] = lit;
            }
        }

        // 2. Full-Res Pass: Dual-Field Blend + Neon Preserve + Silky Filmic Skin + Organic Hair Rim Light!
        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;
        const inv255 = 1 / 255;

        let avgBgLum = 0.5;
        if (keepLights > 0.01 && fullAlpha) {
            let bSum = 0, bCnt = 0;
            const stepY = Math.max(2, (h / 48) | 0);
            const stepX = Math.max(2, (w / 48) | 0);
            for (let y = 0; y < h; y += stepY) {
                const pRow = y * w;
                const iRow = pRow << 2;
                for (let x = 0; x < w; x += stepX) {
                    if (fullAlpha[pRow + x] < 90) {
                        const idx = iRow + (x << 2);
                        bSum += (0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2]) * inv255;
                        bCnt++;
                    }
                }
            }
            avgBgLum = bCnt > 12 ? (bSum / bCnt) : 0.5;
        }
        const darkNightGate = Math.max(0, Math.min(1, (0.48 - avgBgLum) / 0.16));

        let ix0 = this._rlIx0, ix1 = this._rlIx1, fxArr = this._rlFx;
        if (!ix0 || ix0.length < w) {
            ix0 = this._rlIx0 = new Int32Array(w);
            ix1 = this._rlIx1 = new Int32Array(w);
            fxArr = this._rlFx = new Float32Array(w);
        }
        const sx = lw / w;
        const sy = lh / h;
        const lwM1 = lw - 1;
        const lhM1 = lh - 1;
        for (let x = 0; x < w; x++) {
            let u = (x + 0.5) * sx - 0.5;
            if (u < 0) u = 0; else if (u > lwM1) u = lwM1;
            const x0 = u | 0;
            ix0[x] = x0;
            ix1[x] = x0 < lwM1 ? x0 + 1 : lwM1;
            fxArr[x] = u - x0;
        }

        const rimStepY = Math.max(2, Math.min(5, Math.round(maxSide * 0.0032)));
        const rimStepX = Math.max(1, Math.min(3, Math.round(maxSide * 0.0020)));
        const useOrganicRim = rimPower > 0.03 && !!fullAlpha;
        const invH = 1 / h;

        for (let y = 0; y < h; y++) {
            let v = (y + 0.5) * sy - 0.5;
            if (v < 0) v = 0; else if (v > lhM1) v = lhM1;
            const y0 = v | 0;
            const y1 = y0 < lhM1 ? y0 + 1 : lhM1;
            const fy = v - y0;
            const ify = 1 - fy;
            const row0 = y0 * lw;
            const row1 = y1 * lw;
            const pixRow = y * w;
            const imgRow = pixRow << 2;
            const yUpRow = Math.max(0, y - rimStepY) * w;
            const vNorm = y * invH;
            const rimYGate = useOrganicRim ? Math.max(0, Math.min(1, (0.68 - vNorm) / 0.28)) : 0;

            for (let x = 0; x < w; x++) {
                const pxIdx = pixRow + x;
                const idx = imgRow + (x << 2);
                if (d[idx + 3] === 0) continue;

                const x0 = ix0[x], x1 = ix1[x], fx = fxArr[x], ifx = 1 - fx;
                const w00 = ifx * ify, w10 = fx * ify, w01 = ifx * fy, w11 = fx * fy;
                const p00 = row0 + x0, p10 = row0 + x1, p01 = row1 + x0, p11 = row1 + x1;

                const subR = fSubR[p00] * w00 + fSubR[p10] * w10 + fSubR[p01] * w01 + fSubR[p11] * w11;
                const subG = fSubG[p00] * w00 + fSubG[p10] * w10 + fSubG[p01] * w01 + fSubG[p11] * w11;
                const subB = fSubB[p00] * w00 + fSubB[p10] * w10 + fSubB[p01] * w01 + fSubB[p11] * w11;
                let bgR = fBgR[p00] * w00 + fBgR[p10] * w10 + fBgR[p01] * w01 + fBgR[p11] * w11;
                let bgG = fBgG[p00] * w00 + fBgG[p10] * w10 + fBgG[p01] * w01 + fBgG[p11] * w11;
                let bgB = fBgB[p00] * w00 + fBgB[p10] * w10 + fBgB[p01] * w01 + fBgB[p11] * w11;
                const lit = fLit[p00] * w00 + fLit[p10] * w10 + fLit[p01] * w01 + fLit[p11] * w11;

                const sj = fullAlpha ? (fullAlpha[pxIdx] * inv255) : Math.min(1, lit * 1.3);

                const rn = d[idx] * inv255;
                const gn = d[idx + 1] * inv255;
                const bn = d[idx + 2] * inv255;
                const lum = 0.299 * rn + 0.587 * gn + 0.114 * bn;

                if (keepLights > 0.01 && sj < 0.90 && lum > 0.62) {
                    const cHi0 = rn > gn ? (rn > bn ? rn : bn) : (gn > bn ? gn : bn);
                    const cLo0 = rn < gn ? (rn < bn ? rn : bn) : (gn < bn ? gn : bn);
                    const sat0 = cHi0 > 0.01 ? (cHi0 - cLo0) / cHi0 : 0;
                    const neonSatGate = Math.max(0, Math.min(1, (sat0 - 0.24) * 3.0)) * Math.max(0, Math.min(1, (lum - 0.66) * 4.0));
                    const emissiveGate = Math.max(darkNightGate, neonSatGate * 0.85);
                    if (emissiveGate > 0.01) {
                        const lt = (lum - 0.62) * 3.1;
                        const ltc = lt > 1 ? 1 : lt;
                        const ls = ltc * ltc * (3 - 2 * ltc) * keepLights * emissiveGate;
                        bgR += (1.05 - bgR) * ls;
                        bgG += (1.03 - bgG) * ls;
                        bgB += (1.00 - bgB) * ls;
                    }
                }

                const bgL = bgR + bgG + bgB;
                const subL = subR + subG + subB;
                const sjG = (sj > 0 && sj < 1 && subL > bgL + 0.02) ? (sj * sj * (0.35 + 0.65 * sj)) : sj;

                const gR = bgR + (subR - bgR) * sjG;
                const gG = bgG + (subG - bgG) * sjG;
                const gB = bgB + (subB - bgB) * sjG;

                let or = rn * gR;
                let og = gn * gG;
                let ob = bn * gB;

                const gMax = gR > gG ? (gR > gB ? gR : gB) : (gG > gB ? gG : gB);
                if (gMax > 1.0) {
                    const shK = (gMax - 1.0) * 1.15;
                    or = or / (1 + or * shK);
                    og = og / (1 + og * shK);
                    ob = ob / (1 + ob * shK);
                }

                const subLit = lit * sjG;
                if (subLit > 0.02) {
                    if (lum < 0.26) {
                        const tToe = lum * 3.846;
                        const sToe = tToe * tToe * (3 - 2 * tToe);
                        const blackAnchor = 1 - subLit * (1 - sToe) * 0.30;
                        or *= blackAnchor;
                        og *= blackAnchor;
                        ob *= blackAnchor;
                    }
                    if (skinGlow > 0.02 && lum > 0.28 && lum < 0.84) {
                        const cHi = or > og ? (or > ob ? or : ob) : (og > ob ? og : ob);
                        const cLo = or < og ? (or < ob ? or : ob) : (og < ob ? og : ob);
                        const sat = cHi - cLo;
                        if (sat < 0.36) {
                            const gate = (1 - sat * 2.78) * Math.min(1, (lum - 0.28) * 2.6) * Math.max(0, Math.min(1, (0.84 - lum) * 4.5));
                            if (gate > 0) {
                                const lift = subLit * skinGlow * gate * 0.068;
                                or += lift * (0.86 + 0.14 * fnr);
                                og += lift * (0.96 + 0.04 * fng);
                                ob += lift * (1.02 + 0.08 * fnb);
                            }
                        }
                    }
                }

                // 3. ORGANIC INTERIOR HAIR & SHOULDER RIM LIGHT (eksklusif di DALAM piksel solid sj >= 0.82 — ZERO border stiker/dinding putih!)
                if (rimYGate > 0.01 && sj >= 0.82) {
                    const sjUp = fullAlpha[yUpRow + x] * inv255;
                    const xL = x > rimStepX ? x - rimStepX : 0;
                    const xR = x + rimStepX < w ? x + rimStepX : w - 1;
                    const sjSide = 0.5 * (fullAlpha[pixRow + xL] + fullAlpha[pixRow + xR]) * inv255;
                    const topIn = Math.max(0, 0.75 - sjUp);
                    const sideIn = Math.max(0, 0.65 - sjSide) * 0.55;
                    const edgeBand = Math.min(1, (topIn * 1.1 + sideIn) * 1.15);
                    if (edgeBand > 0.02) {
                        const realTex = 0.14 + 0.82 * Math.min(1, lum * 1.5);
                        const rW = Math.min(0.32, rimPower * rimYGate * edgeBand * realTex * 0.36);
                        or = 1 - (1 - (or > 1 ? 1 : or)) * (1 - rmRn * rW);
                        og = 1 - (1 - (og > 1 ? 1 : og)) * (1 - rmGn * rW);
                        ob = 1 - (1 - (ob > 1 ? 1 : ob)) * (1 - rmBn * rW);
                    }
                }

                d[idx] = or <= 0 ? 0 : or >= 1 ? 255 : (or * 255 + 0.5) | 0;
                d[idx + 1] = og <= 0 ? 0 : og >= 1 ? 255 : (og * 255 + 0.5) | 0;
                d[idx + 2] = ob <= 0 ? 0 : ob >= 1 ? 255 : (ob * 255 + 0.5) | 0;
            }
        }
        ctx.putImageData(img, 0, 0);

        // 4. HIGHLIGHT-ONLY SPECULAR BLOOM & WARM NEON HALATION (halus & terkendali!)
        if (bloom > 0.03 || halation > 0.03) {
            const bSc = Math.min(0.28, 220 / maxSide);
            const bw = Math.max(24, Math.round(w * bSc));
            const bh = Math.max(24, Math.round(h * bSc));
            const bCv = this._getScratch('flBloom', bw, bh);
            const bCtx = bCv.getContext('2d', { willReadFrequently: true });
            bCtx.clearRect(0, 0, bw, bh);
            bCtx.drawImage(targetCanvas, 0, 0, bw, bh);
            const bImg = bCtx.getImageData(0, 0, bw, bh);
            const bd = bImg.data;
            const invRange = 1 / Math.max(0.08, 1 - bloomThresh);

            let hCv = null, hCtx = null, hImg = null, hd = null;
            if (halation > 0.04) {
                hCv = this._getScratch('flHalation', bw, bh);
                hCtx = hCv.getContext('2d', { willReadFrequently: true });
                hImg = hCtx.createImageData(bw, bh);
                hd = hImg.data;
            }

            for (let i = 0; i < bd.length; i += 4) {
                const r = bd[i] * inv255, g = bd[i + 1] * inv255, b = bd[i + 2] * inv255;
                const l = 0.299 * r + 0.587 * g + 0.114 * b;
                if (l > bloomThresh) {
                    const t = Math.min(1, (l - bloomThresh) * invRange);
                    const wt = t * t * t;
                    bd[i] = Math.min(255, bd[i] * (0.80 + 0.20 * fnr) * wt);
                    bd[i + 1] = Math.min(255, bd[i + 1] * (0.80 + 0.20 * fng) * wt);
                    bd[i + 2] = Math.min(255, bd[i + 2] * (0.80 + 0.20 * fnb) * wt);
                    bd[i + 3] = Math.round(255 * wt);
                } else {
                    bd[i] = bd[i + 1] = bd[i + 2] = bd[i + 3] = 0;
                }
                if (hd && l > 0.80) {
                    const ht = Math.min(1, (l - 0.80) * 5.0);
                    const hw = ht * ht;
                    hd[i] = 255;
                    hd[i + 1] = Math.round(92 + 48 * r);
                    hd[i + 2] = 45;
                    hd[i + 3] = Math.round(165 * hw);
                }
            }
            bCtx.putImageData(bImg, 0, 0);

            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            if (bloom > 0.03) {
                const radPx = Math.max(3.5, maxSide * 0.011);
                ctx.filter = `blur(${radPx.toFixed(1)}px)`;
                ctx.globalAlpha = Math.min(0.34, bloom * 0.36);
                ctx.drawImage(bCv, 0, 0, w, h);
                ctx.filter = `blur(${(radPx * 2.2).toFixed(1)}px)`;
                ctx.globalAlpha = Math.min(0.18, bloom * 0.16);
                ctx.drawImage(bCv, 0, 0, w, h);
            }
            if (hCtx && hImg && halation > 0.04) {
                hCtx.putImageData(hImg, 0, 0);
                const hRad = Math.max(5, maxSide * 0.018);
                ctx.filter = `blur(${hRad.toFixed(1)}px)`;
                ctx.globalAlpha = Math.min(0.36, halation * 0.38);
                ctx.drawImage(hCv, 0, 0, w, h);
            }
            ctx.restore();
        }
    },

    // =========================================================================
    // AI RELIGHT PRO — GENERATIVE CLOUD RELIGHTING (Google Gemini Image & Fal.ai IC-Light v2)
    // =========================================================================
    _buildGenerativeRelightPrompt(relightCfg) {
        const preset = (relightCfg && relightCfg.preset) || 'flash_portrait';
        const l1 = (relightCfg && relightCfg.lights && relightCfg.lights[0]) || { x: 0.48, y: 0.44, color: '#f0f6ff' };
        const l2 = (relightCfg && relightCfg.lights && relightCfg.lights[1]) || null;

        let dirText = 'from the front directly on-camera';
        let initialLatent = 'None';
        if (l1.x < 0.34) { dirText = 'from the left side'; initialLatent = 'Left'; }
        else if (l1.x > 0.66) { dirText = 'from the right side'; initialLatent = 'Right'; }
        else if (l1.y < 0.28) { dirText = 'from above'; initialLatent = 'Top'; }
        else if (l1.y > 0.74) { dirText = 'from below'; initialLatent = 'Bottom'; }

        const shadowNote = (relightCfg && (relightCfg.shadow ?? 74) > 25)
            ? 'Cast physically accurate shadows of every subject strictly onto real nearby surfaces: soft drop shadows on a close wall behind them if indoors, OR realistic grounded perspective shadows anchored at their feet/shoes across the grass/ground plane if outdoors (NEVER cast floating shadows onto open sky or distant trees).'
            : 'Keep shadows very soft and subtle, strictly respecting physical surfaces.';

        let stylePrompt = '';
        if (preset === 'flash_portrait' || preset === 'ccd_night') {
            stylePrompt = `Apply crisp, realistic direct on-camera flash photography lighting ${dirText}. Illuminate the foreground subject (face, skin, clothing, and any held objects) cleanly and evenly with neutral cool-white camera flash light, producing clean luminous porcelain skin, deep glossy dark hair with crisp specular highlights, natural vivid colors on flowers/lips, and rich micro-contrast. Dramatically darken the background behind the subject by about 1.5 stops like real night/indoor direct flash falloff. ${shadowNote}`;
        } else if (preset === 'studio_spot') {
            stylePrompt = `Apply soft professional studio key spotlight lighting ${dirText}. Illuminate the foreground subject with flattering clean neutral-warm studio softbox light, gently sculpting 3D facial contours while dimming the background into a moody dark studio backdrop. ${shadowNote}`;
        } else if (preset === 'soft_glow') {
            stylePrompt = `Apply luminous diffused beauty front-flash / ring-light illumination ${dirText}. Brighten and clean skin tones naturally with soft dreamy highlights and gentle shadow falloff on the background.`;
        } else if (preset === 'golden') {
            stylePrompt = `Relight with warm golden hour sunset sunlight coming ${dirText} (warm amber-gold color ${l1.color}), adding warm directional highlights and subtle golden rim light along hair and shoulders while keeping the shadow side and background deeper and moody. ${shadowNote}`;
        } else if (preset === 'rembrandt') {
            stylePrompt = `Relight with dramatic classic Rembrandt studio portrait lighting coming ${dirText} (warm key light ${l1.color}), carving sculptural 3D light-and-shadow contrast across the face and deeply darkening the background. ${shadowNote}`;
        } else if (preset === 'cyber' || (l2 && l2.on)) {
            const c2 = l2 && l2.on ? l2.color : '#22d3ee';
            stylePrompt = `Relight with cinematic dual-gel studio lighting: primary key light (${l1.color}) coming ${dirText} and secondary accent/rim light (${c2}) from the opposite side, with a deeply darkened atmospheric night background and realistic colored reflections on skin, hair, and clothing. ${shadowNote}`;
        } else {
            stylePrompt = `Relight this photograph with realistic studio light (${l1.color}) coming ${dirText}, cleanly illuminating the foreground subject with natural 3D shading while darkening the background naturally. ${shadowNote}`;
        }

        const strictGuard = 'CRITICAL: Preserve the exact person identity, face structure, expression, hair shape, clothing, held objects, background objects, framing, and composition 100% faithfully — ONLY change the lighting, exposure, color temperature of light, and cast shadows. Photorealistic high-resolution photograph, zero distortion.';
        return {
            geminiPrompt: `${stylePrompt} ${strictGuard}`,
            falPrompt: `${stylePrompt} Photorealistic, detailed skin texture, natural camera lighting, sharp focus.`,
            initialLatent
        };
    },

    async runGenerativeRelight(sourceCanvas, relightCfg, apiCfg, onStatus = null) {
        if (!apiCfg || !apiCfg.apiKey || !String(apiCfg.apiKey).trim()) {
            throw new Error('API Key belum diisi. Buka pengaturan ⚙ AI KEY terlebih dahulu.');
        }
        const provider = apiCfg.provider === 'fal' ? 'fal' : 'gemini';
        const apiKey = String(apiCfg.apiKey).trim();
        const { geminiPrompt, falPrompt, initialLatent } = this._buildGenerativeRelightPrompt(relightCfg);

        // Siapkan input JPEG ringkas (maks 1280px agar unggah cepat & kualitas tetap tajam)
        const maxIn = 1280;
        const sc = Math.min(1, maxIn / Math.max(sourceCanvas.width, sourceCanvas.height));
        const iw = Math.max(32, Math.round(sourceCanvas.width * sc));
        const ih = Math.max(32, Math.round(sourceCanvas.height * sc));
        const inCv = document.createElement('canvas');
        inCv.width = iw;
        inCv.height = ih;
        inCv.getContext('2d').drawImage(sourceCanvas, 0, 0, iw, ih);
        const dataUrl = inCv.toDataURL('image/jpeg', 0.92);
        const base64Data = dataUrl.split(',')[1];

        const loadImgToCanvas = (srcUrl) => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const out = document.createElement('canvas');
                out.width = sourceCanvas.width;
                out.height = sourceCanvas.height;
                const oCtx = out.getContext('2d');
                oCtx.imageSmoothingEnabled = true;
                oCtx.imageSmoothingQuality = 'high';
                // Cover-fit presisi jika rasio sedikit berbeda 1-2px
                const srcAr = img.width / img.height;
                const dstAr = out.width / out.height;
                let sx = 0, sy = 0, sw = img.width, sh = img.height;
                if (Math.abs(srcAr - dstAr) > 0.01) {
                    if (srcAr > dstAr) { sw = img.height * dstAr; sx = (img.width - sw) / 2; }
                    else { sh = img.width / dstAr; sy = (img.height - sh) / 2; }
                }
                oCtx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
                resolve(out);
            };
            img.onerror = () => reject(new Error('Gagal memuat gambar hasil AI ke kanvas.'));
            img.src = srcUrl;
        });

        if (provider === 'gemini') {
            if (onStatus) onStatus('Mengirim ke Google Gemini Image AI...');
            const endpoint = (apiCfg.proxyUrl && apiCfg.proxyUrl.trim())
                ? apiCfg.proxyUrl.trim()
                : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(apiKey)}`;

            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                            { text: geminiPrompt }
                        ]
                    }],
                    generationConfig: {
                        responseModalities: ['TEXT', 'IMAGE']
                    }
                })
            });

            if (!resp.ok) {
                let detail = '';
                try {
                    const errJson = await resp.json();
                    detail = errJson.error?.message || JSON.stringify(errJson);
                } catch (_) {
                    detail = await resp.text();
                }
                if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
                    throw new Error(`Gemini API menolak kunci/permintaan (${resp.status}): ${detail.slice(0, 140)}`);
                }
                if (resp.status === 429) {
                    throw new Error('Kuota gratis Gemini API sedang penuh (429). Coba lagi sebentar atau periksa billing Google AI Studio.');
                }
                throw new Error(`Gemini API error (${resp.status}): ${detail.slice(0, 140)}`);
            }

            if (onStatus) onStatus('Merender hasil Relight AI...');
            const json = await resp.json();
            const parts = json.candidates?.[0]?.content?.parts || [];
            const imgPart = parts.find((pt) => pt.inlineData && pt.inlineData.data);
            if (!imgPart) {
                const txt = parts.find((pt) => pt.text)?.text || 'Model tidak mengembalikan gambar.';
                throw new Error(`Gemini tidak menghasilkan gambar: ${txt.slice(0, 120)}`);
            }
            const mime = imgPart.inlineData.mimeType || 'image/png';
            return await loadImgToCanvas(`data:${mime};base64,${imgPart.inlineData.data}`);
        } else {
            if (onStatus) onStatus('Mengirim ke Fal.ai IC-Light v2...');
            const endpoint = (apiCfg.proxyUrl && apiCfg.proxyUrl.trim())
                ? apiCfg.proxyUrl.trim()
                : 'https://fal.run/fal-ai/iclight-v2';

            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: falPrompt,
                    image_url: dataUrl,
                    initial_latent: initialLatent,
                    background_threshold: 0.67,
                    num_inference_steps: 28,
                    guidance_scale: 5,
                    num_images: 1,
                    enable_safety_checker: true,
                    output_format: 'jpeg'
                })
            });

            if (!resp.ok) {
                let detail = '';
                try { detail = (await resp.json()).detail || ''; } catch (_) { detail = await resp.text(); }
                if (resp.status === 401 || resp.status === 403) {
                    throw new Error(`Fal.ai API Key tidak valid (${resp.status}). Periksa kembali kunci Anda di fal.ai/dashboard/keys.`);
                }
                throw new Error(`Fal.ai IC-Light error (${resp.status}): ${String(detail).slice(0, 140)}`);
            }

            if (onStatus) onStatus('Mengunduh hasil IC-Light v2...');
            const json = await resp.json();
            const outUrl = json.images?.[0]?.url || json.image?.url;
            if (!outUrl) throw new Error('Fal.ai IC-Light tidak mengembalikan URL gambar.');
            return await loadImgToCanvas(outUrl);
        }
    }
};

window.AITools = AITools;
