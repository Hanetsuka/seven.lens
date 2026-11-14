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
    }
};

window.AITools = AITools;
