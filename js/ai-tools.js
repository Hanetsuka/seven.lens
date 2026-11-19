/**
 * AI & Smart Effects Engine
 * - Smart Background Removal (Auto Corner Sampling & Magic Wand Flood Fill / Global Chroma Key)
 * - Soft Alpha Edge Feathering
 * - Portrait Bokeh Blur, Chromatic Glitch, dan Film Red Halation
 */

const AITools = {
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
            // Global Color Removal
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
            // Contiguous BFS Flood Fill
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

                    // Hanya ekspansi tetangga jika masih dalam toleransi utama
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
     * Efek RGB Chromatic Aberration / Glitch
     */
    applyChromaticGlitch(sourceCanvas, offsetPx = 8) {
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        const ctx = sourceCanvas.getContext('2d');
        const orig = ctx.getImageData(0, 0, w, h);
        const out = ctx.createImageData(w, h);
        const s = orig.data;
        const d = out.data;

        const shift = Math.max(2, Math.round((w / 800) * offsetPx));

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const leftX = Math.max(0, x - shift);
                const rightX = Math.min(w - 1, x + shift);

                const idxLeft = (y * w + leftX) * 4;
                const idxRight = (y * w + rightX) * 4;

                d[idx] = s[idxLeft];         // Red bergeser ke kiri
                d[idx + 1] = s[idx + 1];     // Green tetap
                d[idx + 2] = s[idxRight + 2];// Blue bergeser ke kanan
                d[idx + 3] = s[idx + 3];
            }
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

        // Buat kanvas mask untuk area highlight
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

        // Gambar kembali dengan efek blur screen
        ctx.save();
        ctx.filter = `blur(${Math.max(6, Math.round(w / 95))}px)`;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(glowCanvas, 0, 0);
        ctx.restore();
    },

    /**
     * Efek Portrait Bokeh (Fokus di subjek tengah, latar belakang kabur lembut)
     */
    applyPortraitBokeh(sourceCanvas) {
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

        // Buat mask radial pada sharpCopy
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext('2d');

        const cx = w * 0.5;
        const cy = h * 0.48;
        const innerR = Math.min(w, h) * 0.25;
        const outerR = Math.min(w, h) * 0.55;

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
     * K-Means cepat di ruang CIELAB untuk memodelkan warna latar/langit
     */
    _kmeansLab(samples, k, iters = 6) {
        if (!samples.length) return [];
        const centers = [];
        const step = Math.max(1, Math.floor(samples.length / k));
        for (let c = 0; c < k; c++) {
            const s = samples[Math.min(samples.length - 1, c * step)];
            centers.push([s[0], s[1], s[2]]);
        }
        const sumL = new Float64Array(k);
        const sumA = new Float64Array(k);
        const sumB = new Float64Array(k);
        const cnt = new Int32Array(k);
        for (let it = 0; it < iters; it++) {
            sumL.fill(0); sumA.fill(0); sumB.fill(0); cnt.fill(0);
            for (let i = 0; i < samples.length; i++) {
                const s = samples[i];
                let best = 0, bestD = 1e18;
                for (let c = 0; c < k; c++) {
                    const dl = s[0] - centers[c][0], da = s[1] - centers[c][1], db = s[2] - centers[c][2];
                    const d = dl * dl + da * da + db * db;
                    if (d < bestD) { bestD = d; best = c; }
                }
                sumL[best] += s[0]; sumA[best] += s[1]; sumB[best] += s[2]; cnt[best]++;
            }
            for (let c = 0; c < k; c++) {
                if (cnt[c] > 0) {
                    centers[c][0] = sumL[c] / cnt[c];
                    centers[c][1] = sumA[c] / cnt[c];
                    centers[c][2] = sumB[c] / cnt[c];
                }
            }
        }
        return centers;
    },

    /**
     * Penghalusan tepi berbasis warna (Edge-Aware Joint Bilateral) agar mask menempel rapi pada kontur objek
     */
    _edgeAwareRefine(mask, L, A, B, w, h, passes = 2) {
        let cur = mask;
        let nxt = new Float32Array(w * h);
        const sigmaC2 = 2 * 18 * 18;
        for (let pass = 0; pass < passes; pass++) {
            for (let y = 0; y < h; y++) {
                const y0 = Math.max(0, y - 2), y1 = Math.min(h - 1, y + 2);
                for (let x = 0; x < w; x++) {
                    const p = y * w + x;
                    const l0 = L[p], a0 = A[p], b0 = B[p];
                    const x0 = Math.max(0, x - 2), x1 = Math.min(w - 1, x + 2);
                    let ws = 0, vs = 0;
                    for (let ny = y0; ny <= y1; ny++) {
                        const row = ny * w;
                        for (let nx = x0; nx <= x1; nx++) {
                            const np = row + nx;
                            const dl = L[np] - l0, da = A[np] - a0, db = B[np] - b0;
                            const wc = Math.exp(-(dl * dl + da * da + db * db) / sigmaC2);
                            ws += wc;
                            vs += cur[np] * wc;
                        }
                    }
                    nxt[p] = ws > 0 ? vs / ws : cur[p];
                }
            }
            const tmp = cur; cur = nxt; nxt = tmp;
        }
        return cur;
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
            d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
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
     * Auto Select Subject (100% Offline, Fast Salient Object Segmentation):
     * Menggunakan Minimum Barrier Distance (MBD) dari tepi + Border K-Means Lab Contrast + Center Prior + Otsu + Edge-Aware Refinement
     */
    detectSubjectMask(sourceCanvas, outW, outH) {
        const maxSide = 160;
        const scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
        const sw = Math.max(16, Math.round(sourceCanvas.width * scale));
        const sh = Math.max(16, Math.round(sourceCanvas.height * scale));
        const n = sw * sh;

        const work = document.createElement('canvas');
        work.width = sw; work.height = sh;
        const wCtx = work.getContext('2d', { willReadFrequently: true });
        wCtx.drawImage(sourceCanvas, 0, 0, sw, sh);
        const data = wCtx.getImageData(0, 0, sw, sh).data;
        const { L, A, B } = this._rgbToLabBuffers(data, n);

        // 1. Minimum Barrier Distance (MBD) dari 4 tepi foto (4 raster sweeps, O(N))
        const dist = new Float32Array(n).fill(1e9);
        const minL = new Float32Array(n), maxL = new Float32Array(n);
        const minA = new Float32Array(n), maxA = new Float32Array(n);
        const minB = new Float32Array(n), maxB = new Float32Array(n);
        for (let p = 0; p < n; p++) {
            minL[p] = maxL[p] = L[p];
            minA[p] = maxA[p] = A[p];
            minB[p] = maxB[p] = B[p];
        }
        for (let x = 0; x < sw; x++) { dist[x] = 0; dist[(sh - 1) * sw + x] = 0; }
        for (let y = 0; y < sh; y++) { dist[y * sw] = 0; dist[y * sw + sw - 1] = 0; }

        const relax = (p, q) => {
            const nl0 = Math.min(minL[q], L[p]), nl1 = Math.max(maxL[q], L[p]);
            const na0 = Math.min(minA[q], A[p]), na1 = Math.max(maxA[q], A[p]);
            const nb0 = Math.min(minB[q], B[p]), nb1 = Math.max(maxB[q], B[p]);
            const d = (nl1 - nl0) + (na1 - na0) * 1.15 + (nb1 - nb0) * 1.15;
            if (d < dist[p]) {
                dist[p] = d;
                minL[p] = nl0; maxL[p] = nl1;
                minA[p] = na0; maxA[p] = na1;
                minB[p] = nb0; maxB[p] = nb1;
            }
        };

        for (let pass = 0; pass < 2; pass++) {
            // Top-Left -> Bottom-Right
            for (let y = 1; y < sh - 1; y++) {
                const row = y * sw;
                for (let x = 1; x < sw - 1; x++) {
                    const p = row + x;
                    relax(p, p - 1); relax(p, p - sw); relax(p, p - sw - 1); relax(p, p - sw + 1);
                }
            }
            // Bottom-Right -> Top-Left
            for (let y = sh - 2; y >= 1; y--) {
                const row = y * sw;
                for (let x = sw - 2; x >= 1; x--) {
                    const p = row + x;
                    relax(p, p + 1); relax(p, p + sw); relax(p, p + sw + 1); relax(p, p + sw - 1);
                }
            }
        }

        // 2. Border Background Color Model (K-Means k=5)
        const borderSamples = [];
        const bw = Math.max(2, Math.round(Math.min(sw, sh) * 0.04));
        for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                if (x < bw || x >= sw - bw || y < bw || y >= sh - bw) {
                    const p = y * sw + x;
                    borderSamples.push([L[p], A[p], B[p]]);
                }
            }
        }
        const bgCenters = this._kmeansLab(borderSamples, 5, 6);
        const bgContrast = new Float32Array(n);
        let maxMbd = 1e-5, maxBg = 1e-5;
        for (let p = 0; p < n; p++) {
            if (dist[p] > maxMbd) maxMbd = dist[p];
            let best = 1e9;
            for (let c = 0; c < bgCenters.length; c++) {
                const dl = L[p] - bgCenters[c][0], da = A[p] - bgCenters[c][1], db = B[p] - bgCenters[c][2];
                const d = Math.sqrt(dl * dl + da * da + db * db);
                if (d < best) best = d;
            }
            bgContrast[p] = best;
            if (best > maxBg) maxBg = best;
        }

        // 3. Gabungkan MBD + Border Contrast + Center Prior lembut
        const sal = new Float32Array(n);
        const cx = sw * 0.5, cy = sh * 0.5;
        const rx2 = 2 * (sw * 0.48) * (sw * 0.48);
        const ry2 = 2 * (sh * 0.48) * (sh * 0.48);
        for (let y = 0, p = 0; y < sh; y++) {
            const dy = y - cy;
            const gy = (dy * dy) / ry2;
            for (let x = 0; x < sw; x++, p++) {
                const dx = x - cx;
                const centerPrior = 0.42 + 0.58 * Math.exp(-((dx * dx) / rx2 + gy));
                const sMbd = Math.min(1, dist[p] / (maxMbd * 0.85));
                const sBg = Math.min(1, bgContrast[p] / (maxBg * 0.78));
                sal[p] = (0.58 * sMbd + 0.42 * sBg) * centerPrior;
            }
        }

        // 4. Otsu's Adaptive Thresholding pada peta saliency
        const hist = new Uint32Array(256);
        for (let p = 0; p < n; p++) hist[Math.min(255, Math.max(0, Math.round(sal[p] * 255)))]++;
        let sumAll = 0;
        for (let i = 0; i < 256; i++) sumAll += i * hist[i];
        let sumB = 0, wB = 0, maxVar = -1, thr = 95;
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
        const tNorm = Math.min(0.68, Math.max(0.18, (thr / 255) * 0.92));

        // 5. Soft thresholding + Edge-aware refinement
        const soft = new Float32Array(n);
        const band = 0.14;
        for (let p = 0; p < n; p++) {
            const v = (sal[p] - (tNorm - band)) / (band * 2);
            const t = Math.min(1, Math.max(0, v));
            soft[p] = t * t * (3 - 2 * t);
        }
        const refined = this._edgeAwareRefine(soft, L, A, B, sw, sh, 2);

        // Kontras akhir agar bagian subjek solid & tepi tetap mulus
        for (let p = 0; p < n; p++) {
            const v = (refined[p] - 0.25) / 0.5;
            const t = Math.min(1, Math.max(0, v));
            refined[p] = t * t * (3 - 2 * t);
        }

        return this._floatMaskToCanvas(refined, sw, sh, outW || sourceCanvas.width, outH || sourceCanvas.height);
    },

    /**
     * Auto Select Sky (100% Offline):
     * Mendeteksi area langit yang terhubung dari tepi atas foto menggunakan model warna Lab + kelancaran tekstur
     */
    detectSkyMask(sourceCanvas, outW, outH) {
        const maxSide = 160;
        const scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
        const sw = Math.max(16, Math.round(sourceCanvas.width * scale));
        const sh = Math.max(16, Math.round(sourceCanvas.height * scale));
        const n = sw * sh;

        const work = document.createElement('canvas');
        work.width = sw; work.height = sh;
        const wCtx = work.getContext('2d', { willReadFrequently: true });
        wCtx.drawImage(sourceCanvas, 0, 0, sw, sh);
        const data = wCtx.getImageData(0, 0, sw, sh).data;
        const { L, A, B } = this._rgbToLabBuffers(data, n);

        // Ambil sampel tepi atas (top 8% tinggi foto)
        const topH = Math.max(3, Math.round(sh * 0.08));
        const topSamples = [];
        for (let y = 0; y < topH; y++) {
            for (let x = 0; x < sw; x++) {
                const p = y * sw + x;
                topSamples.push([L[p], A[p], B[p]]);
            }
        }
        const skyCenters = this._kmeansLab(topSamples, 3, 6);

        // Skor kemiripan langit (warna dekat tepi atas + posisi atas)
        const skyScore = new Float32Array(n);
        for (let y = 0, p = 0; y < sh; y++) {
            const yFrac = y / sh;
            const yPrior = yFrac < 0.55 ? 1 : Math.max(0, 1 - (yFrac - 0.55) / 0.35);
            for (let x = 0; x < sw; x++, p++) {
                let best = 1e9;
                for (let c = 0; c < skyCenters.length; c++) {
                    const dl = L[p] - skyCenters[c][0], da = A[p] - skyCenters[c][1], db = B[p] - skyCenters[c][2];
                    const d = Math.sqrt(dl * dl * 0.7 + da * da + db * db);
                    if (d < best) best = d;
                }
                const colorSim = Math.exp(-(best * best) / (2 * 26 * 26));
                skyScore[p] = colorSim * yPrior;
            }
        }

        // Flood-fill BFS terhubung dari baris paling atas agar objek biru di bawah tidak ikut terseleksi
        const visited = new Uint8Array(n);
        const mask = new Float32Array(n);
        const queue = new Int32Array(n);
        let head = 0, tail = 0;
        for (let x = 0; x < sw; x++) {
            if (skyScore[x] > 0.25) {
                visited[x] = 1;
                queue[tail++] = x;
            }
        }
        while (head < tail) {
            const p = queue[head++];
            mask[p] = Math.min(1, skyScore[p] * 1.25);
            const x = p % sw, y = (p - x) / sw;
            const tryPush = (np) => {
                if (visited[np]) return;
                const dl = L[np] - L[p], da = A[np] - A[p], db = B[np] - B[p];
                const edgeJump = Math.sqrt(dl * dl + da * da + db * db);
                if (skyScore[np] > 0.28 && edgeJump < 24) {
                    visited[np] = 1;
                    queue[tail++] = np;
                }
            };
            if (x > 0) tryPush(p - 1);
            if (x < sw - 1) tryPush(p + 1);
            if (y > 0) tryPush(p - sw);
            if (y < sh - 1) tryPush(p + sw);
        }

        const refined = this._edgeAwareRefine(mask, L, A, B, sw, sh, 2);
        return this._floatMaskToCanvas(refined, sw, sh, outW || sourceCanvas.width, outH || sourceCanvas.height);
    }
};

window.AITools = AITools;
