/**
 * svn.lens — Studio Stickers Library (v51)
 * 12 Transparent AI Studio Stickers (3 Coquette Ribbons + 9 Stemless Macro Flowers)
 * + 7 Stemless Watercolor SVGs + 11 Pure-White Halftone Dot-Art SVGs + 11 Retro Scrapbook SVGs (Total: 41)
 */
(function (root) {
    'use strict';

    const WHITE = '#ffffff';

    const svgUri = (inner, vb = '0 0 160 160') =>
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`);

    function makeGridDots(w, h, step, testFn) {
        let out = '';
        for (let y = step * 0.5; y < h; y += step) {
            const rowIdx = Math.round(y / step);
            const xOff = (rowIdx & 1) ? step * 0.35 : 0;
            for (let x = step * 0.5 + xOff; x < w; x += step) {
                const res = testFn(x, y);
                if (res) {
                    const opAttr = res.op !== undefined ? ` fill-opacity="${res.op.toFixed(2)}"` : '';
                    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${res.r.toFixed(2)}" fill="${WHITE}"${opAttr}/>`;
                }
            }
        }
        return out;
    }

    // 1. Dot Daisy (Pure white halftone 10-petal daisy bloom head, no stem)
    function buildDotDaisy() {
        const cx = 80, cy = 80;
        const dots = makeGridDots(160, 160, 6.2, (x, y) => {
            const dx = x - cx, dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d < 18.5) {
                return { r: 2.35 - (d / 18.5) * 0.65, op: 0.62 + (1 - d / 18.5) * 0.25 };
            }
            if (d < 22.5) return null; // crisp negative space separation ring
            const ang = Math.atan2(dy, dx);
            const lobe = Math.pow(Math.abs(Math.cos(ang * 5)), 0.62);
            const maxR = 25 + lobe * 47;
            if (d <= maxR) {
                const t = (d - 22.5) / Math.max(1, maxR - 22.5);
                return { r: 2.65 - t * 1.15, op: 0.98 - t * 0.12 };
            }
            return null;
        });
        return svgUri(dots);
    }

    // 2. Dot Blossom (Pure white 5-petal sakura halftone flower head, no stem)
    function buildDotBlossom() {
        const cx = 80, cy = 80;
        const dots = makeGridDots(160, 160, 5.9, (x, y) => {
            const dx = x - cx, dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d < 13.5) return { r: 2.2 - (d / 13.5) * 0.5, op: 0.58 + (1 - d / 13.5) * 0.25 };
            if (d < 17) return null;
            const ang = Math.atan2(dy, dx) - Math.PI / 10;
            const wave = Math.max(0, Math.cos(ang * 5));
            const maxR = 24 + Math.pow(wave, 0.46) * 46;
            if (d <= maxR) {
                const t = (d - 17) / Math.max(1, maxR - 17);
                return { r: 2.6 - t * 1.15, op: 0.98 - t * 0.22 };
            }
            return null;
        });
        return svgUri(dots);
    }

    // 3. Dot Tulip (Pure white stemless halftone tulip bloom cup only)
    function buildDotTulip() {
        const dots = makeGridDots(160, 160, 5.8, (x, y) => {
            if (y < 24 || y > 134) return null;
            const ty = (y - 24) / 110;
            const halfW = ty < 0.62
                ? (22 + ty * 38)
                : (46 * Math.sin(((1 - ty) / 0.38) * (Math.PI / 2)) + 6);
            const adx = Math.abs(x - 80);
            if (adx > halfW) return null;
            // Subtle 3-lobe scalloped top rim of tulip petals
            const rimDip = y < 56 ? (1 - Math.abs(Math.sin((adx / Math.max(14, halfW)) * Math.PI * 1.4))) * 15 : 0;
            if (y < 24 + rimDip) return null;
            // Subtle vertical petal fold grooves
            const fold = Math.abs(Math.sin((x - 80) * 0.14));
            const edge = adx / Math.max(1, halfW);
            const r = 2.65 - edge * 0.8 - (1 - fold) * 0.35;
            const op = 0.98 - edge * 0.26 - ty * 0.12;
            return { r: Math.max(1.1, r), op: Math.max(0.45, op) };
        });
        return svgUri(dots);
    }

    // 4. Dot Bow (Pure white halftone coquette ribbon bow)
    function buildDotBow() {
        const cx = 80, cy = 62;
        const dots = makeGridDots(160, 160, 5.8, (x, y) => {
            const dx = x - cx, dy = y - cy;
            const dCore = Math.hypot(dx, dy);
            if (dCore < 12.5) return { r: 2.55 - (dCore / 12.5) * 0.45, op: 0.98 };
            for (const sgn of [-1, 1]) {
                const lx = (x - (cx + sgn * 34)) / 32;
                const ly = (y - cy) / (15 + Math.abs(x - cx) * 0.35);
                if (lx * lx + ly * ly <= 1 && Math.abs(dx) >= 11) {
                    const ed = Math.hypot(lx, ly);
                    return { r: 2.55 - ed * 0.95, op: 0.96 - ed * 0.3 };
                }
            }
            if (y >= 70 && y <= 136) {
                const t = (y - 70) / 66;
                const leftCx = 71 - t * 28, rightCx = 89 + t * 28;
                if (Math.abs(x - leftCx) <= 7.5 || Math.abs(x - rightCx) <= 7.5) {
                    return { r: 2.25 - t * 0.65, op: 0.92 - t * 0.25 };
                }
            }
            return null;
        });
        return svgUri(dots);
    }

    // 5. Dot Heart (Pure white halftone heart)
    function buildDotHeart() {
        const dots = makeGridDots(160, 160, 5.9, (x, y) => {
            const nx = (x - 80) / 52;
            const ny = (82 - y) / 52;
            const v = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny;
            if (v <= 0) {
                const distNorm = Math.min(1, Math.hypot(nx, ny) / 1.25);
                return { r: 2.75 - distNorm * 1.1, op: 0.98 - distNorm * 0.28 };
            }
            return null;
        });
        return svgUri(dots);
    }

    // 6. Dot Star (Pure white 4-point Y2K sparkle halftone burst)
    function buildDotStar() {
        const cx = 80, cy = 80;
        const dots = makeGridDots(160, 160, 5.8, (x, y) => {
            const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
            const curve = Math.pow(dx / 64, 0.42) + Math.pow(dy / 64, 0.42);
            if (curve <= 1) {
                const d = Math.hypot(dx, dy) / 64;
                return { r: 2.7 - d * 1.2, op: 0.98 - d * 0.32 };
            }
            return null;
        });
        return svgUri(dots);
    }

    // 7. Dot Butterfly (Pure white symmetrical dot butterfly)
    function buildDotButterfly() {
        const cx = 80, cy = 80;
        const dots = makeGridDots(160, 160, 5.8, (x, y) => {
            const dx = Math.abs(x - cx), dy = y - cy;
            if (dx <= 3.8 && Math.abs(dy) <= 32) {
                return { r: 2.15, op: 0.98 };
            }
            if (dx >= 7 && dx <= 64) {
                const ux = (dx - 34) / 28, uy = (dy + 18) / 26;
                if (ux * ux + uy * uy <= 1) {
                    const e = Math.hypot(ux, uy);
                    return { r: 2.5 - e * 0.95, op: 0.95 - e * 0.32 };
                }
                const lx = (dx - 26) / 20, ly = (dy - 22) / 22;
                if (lx * lx + ly * ly <= 1) {
                    const e = Math.hypot(lx, ly);
                    return { r: 2.35 - e * 0.85, op: 0.9 - e * 0.32 };
                }
            }
            return null;
        });
        return svgUri(dots);
    }

    // 8. Dot Cherry (Pure white halftone retro cherries)
    function buildDotCherry() {
        const dots = makeGridDots(160, 160, 5.8, (x, y) => {
            const dL = Math.hypot(x - 52, y - 108);
            const dR = Math.hypot(x - 104, y - 114);
            if (dL <= 24) {
                const hi = Math.hypot(x - 45, y - 100) < 6;
                return { r: hi ? 1.2 : 2.55 - (dL / 24) * 0.8, op: hi ? 0.48 : 0.96 - (dL / 24) * 0.2 };
            }
            if (dR <= 24) {
                const hi = Math.hypot(x - 97, y - 106) < 6;
                return { r: hi ? 1.2 : 2.55 - (dR / 24) * 0.8, op: hi ? 0.48 : 0.96 - (dR / 24) * 0.2 };
            }
            if (y >= 26 && y <= 84) {
                const t = (y - 26) / 58;
                const s1 = 86 - t * 34 - Math.sin(t * Math.PI) * 10;
                const s2 = 86 + t * 18 + Math.sin(t * Math.PI) * 8;
                if (Math.abs(x - s1) < 3.2 || Math.abs(x - s2) < 3.2) {
                    return { r: 2.0, op: 0.9 };
                }
            }
            const lx = (x - 106) / 22, ly = (y - 34) / 10;
            if (lx * lx + ly * ly <= 1) return { r: 2.1, op: 0.88 };
            return null;
        });
        return svgUri(dots);
    }

    // 9. Dot Rose (Pure white layered spiral rose bloom head, no stem)
    function buildDotRose() {
        const cx = 80, cy = 80;
        const dots = makeGridDots(160, 160, 5.6, (x, y) => {
            const dx = x - cx, dy = y - cy;
            const d = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);
            const outerR = 60 + 6 * Math.cos(ang * 5);
            if (d > outerR) return null;
            if (d < 8) return { r: 2.25, op: 0.95 };
            // Concentric swirling petal ridges
            const spiral = Math.sin(d * 0.25 + ang * 2.0 + Math.cos(ang * 3) * 0.8);
            if (spiral < -0.58) return null;
            const t = d / outerR;
            return { r: Math.max(1.25, 2.55 - t * 0.95), op: 0.72 + Math.max(0, spiral) * 0.26 };
        });
        return svgUri(dots);
    }

    // 10. Dot Sunflower (Pure white radiating sunflower bloom head, no stem)
    function buildDotSunflower() {
        const cx = 80, cy = 80;
        const dots = makeGridDots(160, 160, 5.7, (x, y) => {
            const dx = x - cx, dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d < 25) {
                const t = d / 25;
                return { r: 2.1 - t * 0.5, op: 0.55 + (1 - t) * 0.25 };
            }
            if (d < 29) return null; // crisp ring separating seed core from rays
            const ang = Math.atan2(dy, dx);
            const rays = Math.pow(Math.abs(Math.cos(ang * 8)), 0.72);
            const maxR = 32 + rays * 41;
            if (d <= maxR) {
                const t = (d - 29) / Math.max(1, maxR - 29);
                return { r: 2.55 - t * 1.15, op: 0.98 - t * 0.16 };
            }
            return null;
        });
        return svgUri(dots);
    }

    // 11. Dot Cosmos (Pure white delicate 8-petal cosmos bloom head, no stem)
    function buildDotCosmos() {
        const cx = 80, cy = 80;
        const dots = makeGridDots(160, 160, 5.8, (x, y) => {
            const dx = x - cx, dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d < 15.5) {
                return { r: 2.2 - (d / 15.5) * 0.5, op: 0.65 + (1 - d / 15.5) * 0.2 };
            }
            if (d < 19.5) return null;
            const ang = Math.atan2(dy, dx);
            const petalWave = Math.abs(Math.cos(ang * 4));
            const maxR = 23 + Math.pow(petalWave, 0.42) * 47;
            if (d <= maxR) {
                const t = (d - 19.5) / Math.max(1, maxR - 19.5);
                return { r: 2.55 - t * 1.1, op: 0.96 - t * 0.18 };
            }
            return null;
        });
        return svgUri(dots);
    }

    // 8 Procedural Retro / Scrapbook SVGs
    const RETRO_SVGS = {
        retro_ticket: svgUri(`
            <path d="M12 24h196v24a12 12 0 0 0 0 24v24H12V72a12 12 0 0 0 0-24Z" fill="#f5eedc" stroke="#292524" stroke-width="3"/>
            <rect x="24" y="34" width="172" height="52" fill="none" stroke="#292524" stroke-width="1.5" stroke-dasharray="4 3"/>
            <line x1="158" y1="34" x2="158" y2="86" stroke="#292524" stroke-width="1.5" stroke-dasharray="3 3"/>
            <text x="90" y="56" text-anchor="middle" font-family="monospace" font-weight="700" font-size="14" fill="#1c1917" letter-spacing="2">DECEMBER '26</text>
            <text x="90" y="75" text-anchor="middle" font-family="monospace" font-size="9.5" fill="#78716c" letter-spacing="1.5">ADMIT ONE · MOMENTS</text>
            <text x="178" y="64" text-anchor="middle" font-family="monospace" font-weight="700" font-size="12" fill="#dc2626" transform="rotate(-90 178 60)">026</text>
        `, '0 0 220 120'),
        retro_postmark: svgUri(`
            <circle cx="80" cy="80" r="64" fill="rgba(244,241,234,0.12)" stroke="#f4f1ea" stroke-width="2.5"/>
            <circle cx="80" cy="80" r="52" fill="none" stroke="#f4f1ea" stroke-width="1.2" stroke-dasharray="4 3"/>
            <text x="80" y="54" text-anchor="middle" font-family="monospace" font-weight="700" font-size="10.5" fill="#f4f1ea" letter-spacing="2">AIR MAIL</text>
            <line x1="34" y1="68" x2="126" y2="68" stroke="#f4f1ea" stroke-width="1.3"/>
            <text x="80" y="86" text-anchor="middle" font-family="monospace" font-weight="700" font-size="16" fill="#fde68a">DEC 2026</text>
            <line x1="34" y1="95" x2="126" y2="95" stroke="#f4f1ea" stroke-width="1.3"/>
            <text x="80" y="114" text-anchor="middle" font-family="monospace" font-size="9" fill="#f4f1ea" letter-spacing="1.5">SVN STUDIO POST</text>
        `),
        retro_dec_tag: svgUri(`
            <rect x="10" y="24" width="200" height="72" rx="14" fill="#fffdf8" stroke="#1c1917" stroke-width="2.5"/>
            <rect x="16" y="30" width="188" height="60" rx="10" fill="none" stroke="#e11d48" stroke-width="1.4" stroke-dasharray="4 3"/>
            <text x="110" y="56" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="22" fill="#1c1917">december dump</text>
            <text x="110" y="78" text-anchor="middle" font-family="monospace" font-size="9.5" fill="#78716c" letter-spacing="2">CAPTURED · '26</text>
        `, '0 0 220 120'),
        retro_film_tag: svgUri(`
            <rect x="14" y="28" width="192" height="64" rx="8" fill="#1c1917" stroke="#fb923c" stroke-width="2"/>
            <circle cx="32" cy="60" r="6" fill="#fb923c"/>
            <text x="120" y="55" text-anchor="middle" font-family="monospace" font-weight="700" font-size="14" fill="#f4f1ea" letter-spacing="1.8">35MM · PORTRA</text>
            <text x="120" y="75" text-anchor="middle" font-family="monospace" font-size="10" fill="#fb923c" letter-spacing="2">EXP 24A · ISO 400</text>
        `, '0 0 220 120'),
        doodle_circle: svgUri(`
            <path d="M28 78C22 44 64 26 106 30c38 4 56 26 48 56-7 28-46 42-88 38-36-4-54-24-40-54 8-18 32-30 62-34" fill="none" stroke="#fef08a" stroke-width="5.5" stroke-linecap="round"/>
        `),
        doodle_arrow: svgUri(`
            <path d="M24 116C44 82 72 64 128 48M104 34l28 13-15 26" fill="none" stroke="#fffdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        `),
        y2k_sparkle: svgUri(`
            <path d="M80 12c6 46 22 62 68 68-46 6-62 22-68 68-6-46-22-62-68-68 46-6 62-22 68-68Z" fill="#fffdf8"/>
            <path d="M126 16c2 14 7 19 21 21-14 2-19 7-21 21-2-14-7-19-21-21 14-2 19-7 21-21Z" fill="#fde68a"/>
        `),
        washi_cream: svgUri(`
            <path d="M14 44l190-8 4 46-190 8Z" fill="rgba(246,238,218,0.88)" stroke="rgba(168,162,158,0.45)" stroke-width="1.5"/>
            <path d="M24 52h170M26 64h168M27 76h166" stroke="rgba(180,148,110,0.32)" stroke-width="2" stroke-dasharray="10 10"/>
        `, '0 0 220 120')
    };

    // Stemless Layered Watercolor & Retro Procedural SVG Art
    const ART_SVGS = {
        wc_floral_pink: svgUri(`
            <defs>
                <filter id="wcb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter>
                <radialGradient id="wcp1" cx="42%" cy="38%" r="65%"><stop offset="0%" stop-color="#fff1f2"/><stop offset="55%" stop-color="#f9a8d4" stop-opacity=".92"/><stop offset="100%" stop-color="#e11d48" stop-opacity=".6"/></radialGradient>
                <radialGradient id="wcp2" cx="55%" cy="45%" r="60%"><stop offset="0%" stop-color="#fce7f3"/><stop offset="60%" stop-color="#f472b6" stop-opacity=".88"/><stop offset="100%" stop-color="#be185d" stop-opacity=".55"/></radialGradient>
            </defs>
            <g filter="url(#wcb)" opacity=".94">
                <ellipse cx="52" cy="74" rx="34" ry="28" transform="rotate(-24 52 74)" fill="url(#wcp1)"/>
                <ellipse cx="108" cy="74" rx="34" ry="28" transform="rotate(24 108 74)" fill="url(#wcp1)"/>
                <ellipse cx="80" cy="48" rx="34" ry="29" fill="url(#wcp2)"/>
                <ellipse cx="62" cy="104" rx="32" ry="26" transform="rotate(-14 62 104)" fill="url(#wcp2)"/>
                <ellipse cx="98" cy="104" rx="32" ry="26" transform="rotate(14 98 104)" fill="url(#wcp2)"/>
                <circle cx="80" cy="78" r="28" fill="url(#wcp1)" opacity=".9"/>
            </g>
            <circle cx="80" cy="78" r="10" fill="#fde047" opacity=".9"/>
            <g fill="#b45309" opacity=".68">
                <circle cx="76" cy="75" r="1.5"/><circle cx="84" cy="76" r="1.5"/><circle cx="79" cy="82" r="1.5"/><circle cx="83" cy="81" r="1.3"/>
            </g>
        `),
        wc_floral_blue: svgUri(`
            <defs>
                <filter id="wcbb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.1"/></filter>
                <radialGradient id="wcb1" cx="45%" cy="45%" r="60%"><stop offset="0%" stop-color="#f0f9ff"/><stop offset="55%" stop-color="#7dd3fc" stop-opacity=".94"/><stop offset="100%" stop-color="#2563eb" stop-opacity=".58"/></radialGradient>
            </defs>
            <g filter="url(#wcbb)">
                <g transform="translate(56 58)">
                    <circle cx="0" cy="-16" r="13" fill="url(#wcb1)"/><circle cx="15" cy="-5" r="13" fill="url(#wcb1)"/>
                    <circle cx="9" cy="13" r="13" fill="url(#wcb1)"/><circle cx="-9" cy="13" r="13" fill="url(#wcb1)"/><circle cx="-15" cy="-5" r="13" fill="url(#wcb1)"/>
                </g>
                <g transform="translate(106 66) scale(.92)">
                    <circle cx="0" cy="-16" r="13" fill="url(#wcb1)"/><circle cx="15" cy="-5" r="13" fill="url(#wcb1)"/>
                    <circle cx="9" cy="13" r="13" fill="url(#wcb1)"/><circle cx="-9" cy="13" r="13" fill="url(#wcb1)"/><circle cx="-15" cy="-5" r="13" fill="url(#wcb1)"/>
                </g>
                <g transform="translate(76 102) scale(.88)">
                    <circle cx="0" cy="-16" r="13" fill="url(#wcb1)"/><circle cx="15" cy="-5" r="13" fill="url(#wcb1)"/>
                    <circle cx="9" cy="13" r="13" fill="url(#wcb1)"/><circle cx="-9" cy="13" r="13" fill="url(#wcb1)"/><circle cx="-15" cy="-5" r="13" fill="url(#wcb1)"/>
                </g>
            </g>
            <circle cx="56" cy="58" r="5.5" fill="#fde047"/><circle cx="106" cy="66" r="5" fill="#fde047"/><circle cx="76" cy="102" r="4.8" fill="#fde047"/>
        `),
        wc_sakura: svgUri(`
            <defs>
                <filter id="wcsBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.9"/></filter>
                <radialGradient id="wcsGrad" cx="50%" cy="62%" r="65%"><stop offset="0%" stop-color="#f43f5e" stop-opacity=".75"/><stop offset="45%" stop-color="#fbcfe8" stop-opacity=".92"/><stop offset="100%" stop-color="#fff1f2" stop-opacity=".96"/></radialGradient>
            </defs>
            <g filter="url(#wcsBlur)">
                ${[0, 72, 144, 216, 288].map(a => `<path d="M80 76C66 56 60 28 73 20c5 8 7 8 7 8s2 0 7-8c13 8 7 36-7 56Z" fill="url(#wcsGrad)" transform="rotate(${a} 80 80)"/>`).join('')}
            </g>
            <circle cx="80" cy="80" r="6" fill="#be185d" opacity=".75"/>
            <g stroke="#be185d" stroke-width="1.2" opacity=".75">
                ${[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(a => `<line x1="80" y1="80" x2="80" y2="62" transform="rotate(${a} 80 80)"/>`).join('')}
            </g>
            <g fill="#fde047">
                ${[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(a => `<circle cx="80" cy="61" r="2.1" transform="rotate(${a} 80 80)"/>`).join('')}
            </g>
        `),
        wc_sunflower: svgUri(`
            <defs>
                <filter id="wcsunB" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.8"/></filter>
                <radialGradient id="wcsunP" cx="50%" cy="72%" r="70%"><stop offset="0%" stop-color="#ea580c"/><stop offset="55%" stop-color="#facc15"/><stop offset="100%" stop-color="#fef08a" stop-opacity=".9"/></radialGradient>
                <radialGradient id="wcsunC" cx="42%" cy="38%" r="65%"><stop offset="0%" stop-color="#78350f"/><stop offset="100%" stop-color="#292524"/></radialGradient>
            </defs>
            <g filter="url(#wcsunB)">
                ${Array.from({ length: 14 }, (_, i) => `<ellipse cx="80" cy="36" rx="11" ry="30" fill="url(#wcsunP)" opacity=".88" transform="rotate(${(i * 360 / 14).toFixed(1)} 80 80)"/>`).join('')}
            </g>
            <circle cx="80" cy="80" r="23" fill="url(#wcsunC)"/>
            <g fill="#f59e0b" opacity=".65">
                <circle cx="72" cy="74" r="1.8"/><circle cx="86" cy="73" r="1.8"/><circle cx="79" cy="87" r="2"/><circle cx="89" cy="84" r="1.6"/><circle cx="70" cy="84" r="1.6"/><circle cx="80" cy="70" r="1.6"/>
            </g>
        `),
        wc_hibiscus: svgUri(`
            <defs>
                <filter id="wchB" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.1"/></filter>
                <radialGradient id="wchP" cx="50%" cy="78%" r="72%"><stop offset="0%" stop-color="#9f1239" stop-opacity=".92"/><stop offset="48%" stop-color="#fb7185" stop-opacity=".9"/><stop offset="100%" stop-color="#fecdd3" stop-opacity=".86"/></radialGradient>
            </defs>
            <g filter="url(#wchB)">
                ${[0, 72, 144, 216, 288].map(a => `<ellipse cx="80" cy="48" rx="26" ry="34" fill="url(#wchP)" transform="rotate(${a} 80 80)"/>`).join('')}
            </g>
            <circle cx="80" cy="80" r="11" fill="#881337" opacity=".72"/>
            <path d="M80 80Q94 56 108 42" stroke="#fef08a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
            <g fill="#facc15">
                <circle cx="107" cy="42" r="3"/><circle cx="103" cy="47" r="2.2"/><circle cx="111" cy="46" r="2.2"/><circle cx="100" cy="42" r="2"/>
            </g>
        `),
        wc_butterfly: svgUri(`
            <defs>
                <filter id="wcbf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
                <radialGradient id="wcw1" cx="40%" cy="40%" r="65%"><stop offset="0%" stop-color="#fdf4ff"/><stop offset="55%" stop-color="#d8b4fe" stop-opacity=".88"/><stop offset="100%" stop-color="#7c3aed" stop-opacity=".55"/></radialGradient>
                <radialGradient id="wcw2" cx="50%" cy="50%" r="65%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="60%" stop-color="#c4b5fd" stop-opacity=".85"/><stop offset="100%" stop-color="#6366f1" stop-opacity=".5"/></radialGradient>
            </defs>
            <g filter="url(#wcbf)">
                <path d="M78 74C52 30 16 32 22 68c4 20 30 22 56 6Z" fill="url(#wcw1)"/>
                <path d="M82 74c26-44 62-42 56-6-4 20-30 22-56 6Z" fill="url(#wcw1)"/>
                <path d="M77 82c-22 10-44 26-34 46 8 14 26 2 35-26Z" fill="url(#wcw2)"/>
                <path d="M83 82c22 10 44 26 34 46-8 14-26 2-35-26Z" fill="url(#wcw2)"/>
            </g>
            <path d="M78 72c-16-22-36-22-40-10M82 72c16-22 36-22 40-10" stroke="#6d28d9" stroke-width="1.2" fill="none" opacity=".35"/>
            <ellipse cx="80" cy="82" rx="4" ry="26" fill="#292524"/>
            <path d="M78 58c-5-12-11-18-16-19M82 58c5-12 11-18 16-19" stroke="#292524" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        `),
        wc_wash: svgUri(`
            <defs>
                <filter id="wcwBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
                <linearGradient id="wcwGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbcfe8" stop-opacity=".75"/><stop offset="50%" stop-color="#fde68a" stop-opacity=".55"/><stop offset="100%" stop-color="#bfdbfe" stop-opacity=".68"/></linearGradient>
            </defs>
            <g filter="url(#wcwBlur)">
                <ellipse cx="105" cy="58" rx="88" ry="30" transform="rotate(-4 105 58)" fill="url(#wcwGrad)"/>
                <ellipse cx="115" cy="64" rx="70" ry="20" transform="rotate(3 115 64)" fill="#f9a8d4" opacity=".4"/>
            </g>
        `, '0 0 220 120'),
        retro_stamp: svgUri(`
            <defs>
                <linearGradient id="stSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#312e81"/><stop offset="52%" stop-color="#f97316"/><stop offset="100%" stop-color="#fde68a"/></linearGradient>
            </defs>
            <rect x="14" y="10" width="132" height="160" rx="4" fill="#f7f1e3" stroke="#d6cfc2" stroke-width="2" stroke-dasharray="6 4"/>
            <rect x="26" y="22" width="108" height="114" fill="url(#stSky)"/>
            <circle cx="80" cy="84" r="22" fill="#fffbeb" opacity=".88"/>
            <path d="M26 106c24-12 46-6 66 2 16 6 30 2 42-4v32H26Z" fill="#1c1917" opacity=".82"/>
            <text x="80" y="154" text-anchor="middle" font-family="monospace" font-weight="700" font-size="11" fill="#292524" letter-spacing="2">DEC '26 · 026</text>
            <circle cx="114" cy="48" r="22" fill="none" stroke="#1c1917" stroke-width="1.5" opacity=".55"/>
            <text x="114" y="51" text-anchor="middle" font-family="monospace" font-size="7.5" fill="#1c1917" opacity=".7">AIR MAIL</text>
        `, '0 0 160 180'),
        retro_digicam: svgUri(`
            <defs>
                <linearGradient id="dcBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f3f4f6"/><stop offset="50%" stop-color="#d1d5db"/><stop offset="100%" stop-color="#9ca3af"/></linearGradient>
                <radialGradient id="dcLens" cx="38%" cy="35%" r="65%"><stop offset="0%" stop-color="#60a5fa"/><stop offset="35%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#09090b"/></radialGradient>
            </defs>
            <rect x="34" y="28" width="32" height="8" rx="3" fill="#6b7280"/>
            <rect x="16" y="34" width="148" height="96" rx="14" fill="url(#dcBody)" stroke="#4b5563" stroke-width="2"/>
            <rect x="16" y="54" width="148" height="44" fill="#e5e7eb" opacity=".5"/>
            <rect x="28" y="46" width="28" height="14" rx="4" fill="#fef08a" stroke="#78716c" stroke-width="1.5"/>
            <rect x="64" y="46" width="16" height="12" rx="3" fill="#1f2937"/>
            <circle cx="96" cy="84" r="34" fill="#27272a" stroke="#e5e7eb" stroke-width="3"/>
            <circle cx="96" cy="84" r="25" fill="#18181b" stroke="#71717a" stroke-width="2"/>
            <circle cx="96" cy="84" r="17" fill="url(#dcLens)"/>
            <circle cx="90" cy="77" r="4.5" fill="#ffffff" opacity=".65"/>
            <circle cx="144" cy="48" r="5" fill="#ef4444"/>
            <text x="38" y="114" font-family="monospace" font-weight="700" font-size="8.5" fill="#374151">CCD 5.0</text>
        `, '0 0 180 150'),
        retro_tape: svgUri(`
            <g transform="rotate(-7 110 60)">
                <path d="M18 36l6 8-6 8 6 8-6 8 6 8-6 8h184l-6-8 6-8-6-8 6-8-6-8 6-8Z" fill="#f7eedb" opacity=".92" stroke="#d6ccb8" stroke-width="1.2"/>
                <path d="M30 36v48M56 36v48M82 36v48M108 36v48M134 36v48M160 36v48M186 36v48" stroke="#d97706" stroke-width="11" opacity=".16"/>
                <path d="M22 48h176M22 72h176" stroke="#d97706" stroke-width="10" opacity=".14"/>
            </g>
        `, '0 0 220 120')
    };

    const STUDIO_STICKER_CATS = [
        { id: 'all', label: 'SEMUA' },
        { id: 'ribbon', label: 'PITA' },
        { id: 'floral', label: 'BUNGA' },
        { id: 'watercolor', label: 'CAT AIR' },
        { id: 'dot', label: 'DOT ART' },
        { id: 'retro', label: 'RETRO' }
    ];

    const STUDIO_STICKERS = [
        // 3 Coquette Ribbons (Transparent PNGs)
        { id: 'stk_ribbon_pink', name: 'Pita Satin Pink', cat: 'ribbon', src: './assets/stickers/ribbon_pink.png' },
        { id: 'stk_ribbon_cream', name: 'Pita Lace Cream', cat: 'ribbon', src: './assets/stickers/ribbon_cream.png' },
        { id: 'stk_ribbon_red', name: 'Pita Velvet Red', cat: 'ribbon', src: './assets/stickers/ribbon_red.png' },

        // 9 Stemless Photorealistic Flower Heads (Transparent PNGs)
        { id: 'stk_rose_real', name: 'Mawar Blush', cat: 'floral', src: './assets/stickers/flower_rose_real.png' },
        { id: 'stk_daisy_real', name: 'Daisy Putih', cat: 'floral', src: './assets/stickers/flower_daisy_real.png' },
        { id: 'stk_tulip_real', name: 'Tulip Peach', cat: 'floral', src: './assets/stickers/flower_tulip_real.png' },
        { id: 'stk_frangipani_real', name: 'Kamboja Bali', cat: 'floral', src: './assets/stickers/flower_frangipani_real.png' },
        { id: 'stk_sakura_real', name: 'Sakura Pink', cat: 'floral', src: './assets/stickers/flower_sakura_real.png' },
        { id: 'stk_hibiscus_real', name: 'Kembang Sepatu', cat: 'floral', src: './assets/stickers/flower_hibiscus_real.png' },
        { id: 'stk_sunflower_real', name: 'Bunga Matahari', cat: 'floral', src: './assets/stickers/flower_sunflower_real.png' },
        { id: 'stk_peony_real', name: 'Peony Cream', cat: 'floral', src: './assets/stickers/flower_peony_real.png' },
        { id: 'stk_hydrangea_real', name: 'Hydrangea Biru', cat: 'floral', src: './assets/stickers/flower_hydrangea_real.png' },

        // 7 Stemless Layered Watercolor SVGs
        { id: 'stk_wc_pink', name: 'Peony Cat Air', cat: 'watercolor', src: ART_SVGS.wc_floral_pink },
        { id: 'stk_wc_blue', name: 'Bunga Biru Cat Air', cat: 'watercolor', src: ART_SVGS.wc_floral_blue },
        { id: 'stk_wc_sakura', name: 'Sakura Cat Air', cat: 'watercolor', src: ART_SVGS.wc_sakura },
        { id: 'stk_wc_sunflower', name: 'Matahari Cat Air', cat: 'watercolor', src: ART_SVGS.wc_sunflower },
        { id: 'stk_wc_hibiscus', name: 'Hibiscus Cat Air', cat: 'watercolor', src: ART_SVGS.wc_hibiscus },
        { id: 'stk_wc_butterfly', name: 'Kupu Cat Air', cat: 'watercolor', src: ART_SVGS.wc_butterfly },
        { id: 'stk_wc_wash', name: 'Sapuan Cat Air', cat: 'watercolor', src: ART_SVGS.wc_wash },

        // 11 Pure-White Halftone Dot-Art SVG Stickers (Stemless flowers + motifs)
        { id: 'stk_dot_daisy', name: 'Dot Daisy', cat: 'dot', src: buildDotDaisy() },
        { id: 'stk_dot_blossom', name: 'Dot Sakura', cat: 'dot', src: buildDotBlossom() },
        { id: 'stk_dot_tulip', name: 'Dot Tulip', cat: 'dot', src: buildDotTulip() },
        { id: 'stk_dot_rose', name: 'Dot Mawar', cat: 'dot', src: buildDotRose() },
        { id: 'stk_dot_sunflower', name: 'Dot Matahari', cat: 'dot', src: buildDotSunflower() },
        { id: 'stk_dot_cosmos', name: 'Dot Cosmos', cat: 'dot', src: buildDotCosmos() },
        { id: 'stk_dot_bow', name: 'Dot Pita', cat: 'dot', src: buildDotBow() },
        { id: 'stk_dot_heart', name: 'Dot Heart', cat: 'dot', src: buildDotHeart() },
        { id: 'stk_dot_star', name: 'Dot Sparkle', cat: 'dot', src: buildDotStar() },
        { id: 'stk_dot_butterfly', name: 'Dot Kupu', cat: 'dot', src: buildDotButterfly() },
        { id: 'stk_dot_cherry', name: 'Dot Cherry', cat: 'dot', src: buildDotCherry() },

        // 11 Retro & Scrapbook Vector Stickers
        { id: 'stk_retro_stamp', name: 'Perangko Dec', cat: 'retro', src: ART_SVGS.retro_stamp },
        { id: 'stk_retro_digicam', name: 'Y2K Digicam', cat: 'retro', src: ART_SVGS.retro_digicam },
        { id: 'stk_retro_tape', name: 'Washi Kotak', cat: 'retro', src: ART_SVGS.retro_tape },
        { id: 'stk_ticket', name: 'Tiket Dec', cat: 'retro', src: RETRO_SVGS.retro_ticket },
        { id: 'stk_postmark', name: 'Cap Pos', cat: 'retro', src: RETRO_SVGS.retro_postmark },
        { id: 'stk_dec_tag', name: 'Tag Dec Dump', cat: 'retro', src: RETRO_SVGS.retro_dec_tag },
        { id: 'stk_film_tag', name: 'Tag Portra', cat: 'retro', src: RETRO_SVGS.retro_film_tag },
        { id: 'stk_doodle_circle', name: 'Coretan Bulat', cat: 'retro', src: RETRO_SVGS.doodle_circle },
        { id: 'stk_doodle_arrow', name: 'Panah Coret', cat: 'retro', src: RETRO_SVGS.doodle_arrow },
        { id: 'stk_y2k_sparkle', name: 'Kilau Y2K', cat: 'retro', src: RETRO_SVGS.y2k_sparkle },
        { id: 'stk_washi_cream', name: 'Selotip Krem', cat: 'retro', src: RETRO_SVGS.washi_cream }
    ];

    root.STUDIO_STICKER_CATS = STUDIO_STICKER_CATS;
    root.STUDIO_STICKERS = STUDIO_STICKERS;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { STUDIO_STICKER_CATS, STUDIO_STICKERS };
    }
})(typeof window !== 'undefined' ? window : globalThis);
