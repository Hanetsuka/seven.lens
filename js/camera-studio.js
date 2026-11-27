/**
 * svn.lens Studio — Pro Digicam & Film Camera Module
 * Kamera HP / Desktop bergaya Digicam Pro (100% Offline PWA):
 * - Kontrol Manual Exposure Triangle: ISO (AUTO, 100..6400), Aperture f/ (AUTO, f/1.4..f/16),
 *   Shutter Speed (AUTO, 1/1000..1/2") + Exposure Meter real-time + Slow-Shutter Multi-Frame Capture
 * - 6 Grid Komposisi dengan opacity halus (bisa diatur 30%/50%/75%):
 *   Golden Spiral (Fibonacci 4 arah), Golden Ratio (Phi), Rule of Thirds (3x3), Diagonal, Center, Off
 * - 13 Filter Film Live + Date Stamp Digicam ('YY MM DD) tersimpan 100% non-destruktif ke Editor & Library
 * - UI minimalis & lapang: panel kontrol muncul sebagai floating tray 1 baris dan otomatis tertutup saat framing
 */
(() => {
    'use strict';

    const PHI = 1.618033988749895;

    const ISO_STOPS = [
        { val: 0, label: 'AUTO', grain: 0 },
        { val: 100, label: '100', grain: 0 },
        { val: 200, label: '200', grain: 0 },
        { val: 400, label: '400', grain: 8 },
        { val: 800, label: '800', grain: 18 },
        { val: 1600, label: '1600', grain: 30 },
        { val: 3200, label: '3200', grain: 44 },
        { val: 6400, label: '6400', grain: 58 }
    ];

    const APERTURE_STOPS = [
        { val: 0, label: 'AUTO', bokeh: 0, note: 'Auto' },
        { val: 1.4, label: 'f/1.4', bokeh: 64, note: 'Bokeh kuat' },
        { val: 1.8, label: 'f/1.8', bokeh: 48, note: 'Bokeh potret' },
        { val: 2.8, label: 'f/2.8', bokeh: 28, note: 'Bokeh lembut' },
        { val: 4.0, label: 'f/4.0', bokeh: 12, note: 'Seimbang' },
        { val: 5.6, label: 'f/5.6', bokeh: 0, note: 'Tajam' },
        { val: 8.0, label: 'f/8.0', bokeh: 0, note: 'Tajam luas' },
        { val: 11, label: 'f/11', bokeh: 0, note: 'Lanskap' },
        { val: 16, label: 'f/16', bokeh: 0, note: 'Fokus penuh' }
    ];

    const SHUTTER_STOPS = [
        { sec: 0, label: 'AUTO', frames: 1 },
        { sec: 1 / 1000, label: '1/1000', frames: 1 },
        { sec: 1 / 500, label: '1/500', frames: 1 },
        { sec: 1 / 250, label: '1/250', frames: 1 },
        { sec: 1 / 125, label: '1/125', frames: 1 },
        { sec: 1 / 60, label: '1/60', frames: 1 },
        { sec: 1 / 30, label: '1/30', frames: 1 },
        { sec: 1 / 15, label: '1/15', frames: 4 },
        { sec: 1 / 8, label: '1/8', frames: 6 },
        { sec: 1 / 4, label: '1/4', frames: 8 },
        { sec: 0.5, label: '1/2"', frames: 10 }
    ];

    const GRID_OPACITIES = [
        { val: 0.35, label: '35%' },
        { val: 0.55, label: '55%' },
        { val: 0.80, label: '80%' }
    ];

    const CAM_GRIDS = [
        { id: 'off', label: 'OFF', name: 'Tanpa Grid' },
        { id: 'thirds', label: '3×3', name: 'Rule of Thirds' },
        { id: 'phi', label: 'PHI', name: 'Golden Ratio' },
        { id: 'spiral', label: 'SPIRAL', name: 'Golden Spiral', rotatable: true },
        { id: 'diagonal', label: 'DIAGONAL', name: 'Golden Triangles', rotatable: true },
        { id: 'center', label: 'CENTER', name: 'Potret & Simetri' }
    ];

    const SPIRAL_DIRS = ['↘', '↙', '↖', '↗'];

    const CAM_RATIOS = [
        { id: '3:4', label: '3:4', ratio: 3 / 4 },
        { id: '4:5', label: '4:5', ratio: 4 / 5 },
        { id: '1:1', label: '1:1', ratio: 1 },
        { id: '3:2', label: '3:2', ratio: 3 / 2 },
        { id: '9:16', label: '9:16', ratio: 9 / 16 },
        { id: 'full', label: 'FULL', ratio: null }
    ];

    const CAM_FILTERS = [
        { id: 'original', code: 'ORIGINAL', swatch: 'linear-gradient(135deg,#e5e0d8,#a8a29e)', css: 'none', tint: null, blend: 'normal', vig: 0 },
        { id: 'fl_dusk', code: '⚡ DUSK FLASH', swatch: 'radial-gradient(circle at 50% 56%,#fff8ec 0%,#c9937e 38%,#2a3b47 68%,#0c1714 100%)', css: 'contrast(1.14) saturate(0.96) brightness(1.06)', tint: 'radial-gradient(circle at 50% 48%, rgba(255,248,236,0.46) 0%, rgba(255,240,220,0.14) 40%, rgba(12,24,21,0.22) 80%)', blend: 'screen', vig: 0.74 },
        { id: 'fl_ccd', code: '⚡ NIGHT CCD', swatch: 'radial-gradient(circle at 46% 42%,#f4f9ff 0%,#7892b0 48%,#0d1118 100%)', css: 'contrast(1.22) saturate(1.08) brightness(1.06)', tint: 'radial-gradient(circle at 50% 42%, rgba(242,247,255,0.46) 0%, rgba(232,244,255,0.16) 44%, rgba(0,0,0,0) 76%)', blend: 'screen', vig: 0.64 },
        { id: 'fl_rim', code: '⚡ STUDIO RIM', swatch: 'radial-gradient(circle at 50% 42%,#fff4de 0%,#4e453b 42%,#070708 100%)', css: 'contrast(1.30) saturate(0.96) brightness(1.04)', tint: 'radial-gradient(circle at 50% 42%, rgba(255,246,232,0.42) 0%, rgba(255,240,214,0.14) 40%, rgba(0,0,0,0) 72%)', blend: 'screen', vig: 0.82 },
        { id: 'fl_disp', code: '⚡ FUJI 98', swatch: 'radial-gradient(circle at 46% 42%,#ffefd2 0%,#5f8878 48%,#10201a 100%)', css: 'contrast(1.22) saturate(1.10) brightness(1.04) sepia(0.08) hue-rotate(-4deg)', tint: 'radial-gradient(circle at 48% 42%, rgba(255,239,210,0.42) 0%, rgba(205,240,224,0.14) 46%, rgba(0,0,0,0) 76%)', blend: 'screen', vig: 0.62 },
        { id: 'fl_soft', code: '⚡ SOFT FLASH', swatch: 'radial-gradient(circle at 50% 42%,#fffaf2 0%,#e8d8cc 54%,#4a3e38 100%)', css: 'contrast(1.04) saturate(0.96) brightness(1.08)', tint: 'radial-gradient(circle at 50% 42%, rgba(255,248,240,0.38) 0%, rgba(255,245,235,0.14) 52%, rgba(0,0,0,0) 82%)', blend: 'screen', vig: 0.34 },
        { id: 'fl_warm', code: '⚡ WARM FLASH', swatch: 'radial-gradient(circle at 50% 44%,#ffd59c 0%,#a66d3f 50%,#21140d 100%)', css: 'contrast(1.20) saturate(1.10) sepia(0.20) brightness(1.03)', tint: 'radial-gradient(circle at 50% 44%, rgba(255,213,156,0.42) 0%, rgba(255,198,130,0.15) 46%, rgba(0,0,0,0) 78%)', blend: 'screen', vig: 0.60 },
        { id: 'ed_grad_moody', code: 'GRAD MOODY', swatch: 'linear-gradient(135deg,#2a332b,#5c5540,#d4a97d)', css: 'contrast(1.14) saturate(0.68) brightness(0.93) sepia(0.14) hue-rotate(-6deg)', tint: 'rgba(20, 34, 30, 0.22)', blend: 'soft-light', vig: 0.44 },
        { id: 'ed_grad_soft', code: 'GRAD SOFT', swatch: 'linear-gradient(135deg,#475246,#8f826a,#e7cfb0)', css: 'contrast(1.06) saturate(0.80) brightness(0.98) sepia(0.12)', tint: 'rgba(235, 224, 200, 0.14)', blend: 'soft-light', vig: 0.28 },
        { id: 'm_grad_deep', code: 'GRAD DEEP', swatch: 'linear-gradient(135deg,#182120,#3d463c,#b58963)', css: 'contrast(1.22) saturate(0.56) brightness(0.87) sepia(0.16) hue-rotate(-8deg)', tint: 'rgba(14, 28, 28, 0.30)', blend: 'multiply', vig: 0.52 },
        { id: 'p400', code: 'PORTRA 400', swatch: 'linear-gradient(135deg,#d4a373,#e9d5b8,#8f7a68)', css: 'contrast(1.04) saturate(1.06) brightness(1.03) sepia(0.14)', tint: 'rgba(255, 214, 170, 0.12)', blend: 'soft-light', vig: 0.14 },
        { id: 'fuji_chrome', code: 'CHROME', swatch: 'linear-gradient(135deg,#2f5d62,#6ea49f,#dfd8c8)', css: 'contrast(1.16) saturate(1.15) brightness(1.0) hue-rotate(-4deg)', tint: 'rgba(40, 110, 110, 0.10)', blend: 'soft-light', vig: 0.16 },
        { id: 'cinestill800t', code: '800T', swatch: 'linear-gradient(135deg,#17374a,#3c7a89,#e06d53)', css: 'contrast(1.16) saturate(1.12) brightness(0.97) hue-rotate(-10deg)', tint: 'rgba(30, 95, 130, 0.18)', blend: 'overlay', vig: 0.24 },
        { id: 'gold200', code: 'GOLD 200', swatch: 'linear-gradient(135deg,#c9863c,#f0c987,#6e5138)', css: 'contrast(1.10) saturate(1.16) sepia(0.24) brightness(1.02)', tint: 'rgba(255, 195, 100, 0.12)', blend: 'soft-light', vig: 0.16 },
        { id: 'x_ed1', code: 'SUNLIT', swatch: 'linear-gradient(135deg,#a66c38,#f4c78c,#3d2b1f)', css: 'contrast(1.18) saturate(1.12) sepia(0.18) brightness(1.01)', tint: 'rgba(255, 200, 140, 0.15)', blend: 'soft-light', vig: 0.18 },
        { id: 'x_ed2', code: 'GOLDTEAL', swatch: 'linear-gradient(135deg,#1d4e56,#7a9b8e,#f2c179)', css: 'contrast(1.16) saturate(1.08) sepia(0.12) hue-rotate(-5deg)', tint: 'rgba(24, 72, 78, 0.18)', blend: 'overlay', vig: 0.22 },
        { id: 'korean_peach', code: 'KR PEACH', swatch: 'linear-gradient(135deg,#f6d5c9,#f9eae1,#d4a5a5)', css: 'contrast(0.95) saturate(0.94) brightness(1.07) sepia(0.08)', tint: 'rgba(255, 210, 200, 0.14)', blend: 'screen', vig: 0.08 },
        { id: 'y2k_digicam', code: 'Y2K CAM', swatch: 'linear-gradient(135deg,#5a7d9a,#9ec5ab,#f4e285)', css: 'contrast(1.22) saturate(1.24) brightness(1.02) hue-rotate(4deg)', tint: 'rgba(90, 150, 175, 0.12)', blend: 'overlay', vig: 0.22 },
        { id: 'leica_noir', code: 'NOIR B&W', swatch: 'linear-gradient(135deg,#181818,#6b6b6b,#e5e5e5)', css: 'grayscale(1) contrast(1.34) brightness(0.96)', tint: null, blend: 'normal', vig: 0.32 }
    ];

    const state = {
        isOpen: false,
        returnShell: 'studio',
        stream: null,
        facingMode: 'environment',
        mirrorFront: true,
        ratioId: '3:4',
        gridId: 'spiral',
        gridOpacityIdx: 0, // default 35% (halus & tidak mengganggu subjek)
        spiralOrient: 0,
        filterId: 'original',
        // Digicam Exposure Triangle (0 = AUTO)
        iso: 0,
        aperture: 0,
        shutterSec: 0,
        dateStampOn: false,
        // Floating single-row tray: null | 'iso' | 'aperture' | 'shutter' | 'grid' | 'filter'
        activePanel: null,
        zoom: 1,
        maxHwZoom: 1,
        hwZoomSupported: false,
        timerSec: 0,
        countingDown: false,
        capturingLong: false,
        flashOn: false,
        torchSupported: false,
        levelOn: false,
        tiltDeg: 0,
        soundOn: true,
        demoMode: false,
        demoSourceCanvas: null,
        shotsCount: 0,
        lastPhotoId: null,
        lastThumbUrl: ''
    };

    let shellEl = null;
    let videoEl = null;
    let demoCanvas = null;
    let gridCanvas = null;
    let frameEl = null;
    let stageEl = null;
    let tintEl = null;
    let grainEl = null;
    let vigEl = null;
    let trayEl = null;
    let fallbackEl = null;
    let fallbackTitleEl = null;
    let fallbackDescEl = null;
    let countdownEl = null;
    let flashVeilEl = null;
    let focusRingEl = null;
    let levelBarEl = null;
    let levelLineEl = null;
    let levelLabelEl = null;
    let dateOverlayEl = null;
    let roStage = null;
    let pinchStart = null;
    let orientationBound = false;
    let audioCtx = null;
    let camStartSeq = 0;

    function getTodayDigicamStamp() {
        const d = new Date();
        const p2 = (n) => String(n).padStart(2, '0');
        return `'${String(d.getFullYear()).slice(2)} ${p2(d.getMonth() + 1)} ${p2(d.getDate())}`;
    }

    function isManualExposure() {
        return state.iso > 0 || state.aperture > 0 || state.shutterSec > 0;
    }

    function getIsoStop() {
        return ISO_STOPS.find((x) => x.val === state.iso) || ISO_STOPS[0];
    }

    function getApertureStop() {
        return APERTURE_STOPS.find((x) => x.val === state.aperture) || APERTURE_STOPS[0];
    }

    function getShutterStop() {
        return SHUTTER_STOPS.find((x) => Math.abs(x.sec - state.shutterSec) < 1e-6) || SHUTTER_STOPS[0];
    }

    /**
     * Menghitung kompensasi EV gabungan dari Segitiga Eksposur Digicam (ISO + f/ + Shutter Speed)
     * Basis netral (0.0 EV): ISO 200 · f/2.8 · 1/125s
     */
    function computeExposureEV() {
        let ev = 0;
        if (state.iso > 0) ev += Math.log2(state.iso / 200) * 0.48;
        if (state.aperture > 0) ev += (2 * Math.log2(2.8 / state.aperture)) * 0.42;
        if (state.shutterSec > 0) ev += Math.log2(state.shutterSec / (1 / 125)) * 0.42;
        return Math.max(-2.6, Math.min(2.6, ev));
    }

    // ==========================================
    // 1. BUILD CLEAN DIGICAM SHELL (UNOBSTRUCTED VIEWFINDER)
    // ==========================================
    function buildCameraShell() {
        if (shellEl) return;
        shellEl = document.createElement('div');
        shellEl.id = 'cameraShell';
        shellEl.className = 'camera-shell hidden';
        shellEl.innerHTML = `
            <header class="cam-topbar">
                <button id="camBtnClose" class="cam-top-link" title="Tutup Kamera" aria-label="Tutup">✕</button>
                <div class="cam-top-pills">
                    <button id="camBtnRatio" class="cam-pill" title="Rasio Bingkai">3:4</button>
                    <button id="camBtnTimer" class="cam-pill" title="Timer">⏱</button>
                    <button id="camBtnFlash" class="cam-pill" title="Flash / Senter">⚡</button>
                    <button id="camBtnLevel" class="cam-pill" title="Horizon Level">⫶</button>
                    <button id="camBtnDate" class="cam-pill" title="Stempel Tanggal Digicam">'26</button>
                    <button id="camBtnMirror" class="cam-pill hidden" title="Mirror Kamera Depan">⇄</button>
                </div>
                <button id="camBtnNative" class="cam-top-icon" title="Kamera Bawaan HP" aria-label="Kamera Bawaan HP">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </button>
            </header>

            <main class="cam-stage" id="camStage">
                <div class="cam-frame" id="camFrame">
                    <video id="camVideo" class="cam-video" autoplay playsinline muted></video>
                    <canvas id="camDemoCanvas" class="cam-demo-canvas hidden"></canvas>
                    <div id="camTintLayer" class="cam-tint-layer"></div>
                    <div id="camGrainLayer" class="cam-grain-layer"></div>
                    <div id="camVignetteLayer" class="cam-vignette-layer"></div>
                    <canvas id="camGridCanvas" class="cam-grid-canvas"></canvas>

                    <!-- Minimal Digicam HUD (teks tipis tanpa kotak berat agar tidak menutupi foto) -->
                    <div class="cam-hud-top">
                        <span id="camHudLeft" class="cam-hud-mono">AUTO</span>
                        <span id="camHudEv" class="cam-hud-mono">EV 0.0</span>
                    </div>

                    <div id="camDateStamp" class="cam-date-stamp hidden">'26 11 23</div>

                    <div class="cam-zoom-float" id="camZoomGroup">
                        <button class="cam-zoom-btn active" data-zoom="1">1×</button>
                        <button class="cam-zoom-btn" data-zoom="2">2×</button>
                        <button class="cam-zoom-btn" data-zoom="3">3×</button>
                    </div>

                    <div id="camLevelBar" class="cam-level-bar hidden">
                        <div class="cam-level-ref"></div>
                        <div id="camLevelLine" class="cam-level-line"></div>
                        <span id="camLevelLabel" class="cam-level-label">0°</span>
                    </div>

                    <div id="camFocusRing" class="cam-focus-ring"></div>
                    <div id="camCountdown" class="cam-countdown hidden">3</div>
                    <div id="camFlashVeil" class="cam-flash-veil"></div>

                    <div id="camFallback" class="cam-fallback hidden">
                        <div class="cam-fallback-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                        </div>
                        <h3 id="camFallbackTitle">Kamera Langsung Belum Aktif</h3>
                        <p id="camFallbackDesc">Izinkan akses kamera pada browser atau gunakan Kamera Bawaan HP Anda.</p>
                        <div class="cam-fallback-actions">
                            <button id="camBtnFallbackNative" class="cam-fb-btn primary">📷 BUKA KAMERA BAWAAN HP</button>
                            <button id="camBtnFallbackRetry" class="cam-fb-btn">↻ COBA LAGI</button>
                            <button id="camBtnFallbackDemo" class="cam-fb-btn accent">👁 PRATINJAU GRID &amp; FILTER</button>
                        </div>
                    </div>
                </div>

                <!-- Floating Single-Row Glass Tray (hanya muncul saat ISO / F / S / GRID / FILTER diklik!) -->
                <div id="camTray" class="cam-tray hidden"></div>
            </main>

            <section class="cam-dock">
                <!-- Digicam LCD Telemetry Strip: Mode + ISO + F + Shutter + Grid + Filter -->
                <div class="cam-lcd-strip" id="camLcdStrip">
                    <button id="camBtnMode" class="cam-lcd-mode" title="Beralih Auto / Manual (Reset ISO·F·S)">AUTO</button>
                    <button class="cam-lcd-btn" data-panel="iso" id="camLcdIso">
                        <span class="lcd-k">ISO</span>
                        <span class="lcd-v">AUTO</span>
                    </button>
                    <button class="cam-lcd-btn" data-panel="aperture" id="camLcdF">
                        <span class="lcd-k">F</span>
                        <span class="lcd-v">AUTO</span>
                    </button>
                    <button class="cam-lcd-btn" data-panel="shutter" id="camLcdS">
                        <span class="lcd-k">S</span>
                        <span class="lcd-v">AUTO</span>
                    </button>
                    <span class="cam-lcd-sep"></span>
                    <button class="cam-lcd-icon" data-panel="grid" id="camLcdGrid" title="Grid Komposisi">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                        <span class="lcd-dot"></span>
                    </button>
                    <button class="cam-lcd-icon" data-panel="filter" id="camLcdFilter" title="Filter Film Live">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" fill-opacity="0.35"/></svg>
                        <span class="lcd-dot"></span>
                    </button>
                </div>

                <div class="cam-shutter-row">
                    <button id="camLastThumb" class="cam-last-thumb empty" title="Buka foto terakhir di Editor">
                        <img id="camLastThumbImg" alt="" class="hidden">
                        <span id="camLastThumbCount" class="cam-shot-badge hidden">0</span>
                        <span class="cam-last-placeholder">LIB</span>
                    </button>

                    <button id="camShutterBtn" class="cam-shutter-btn" aria-label="Ambil Foto" title="Jepret Foto (Spasi)">
                        <span class="cam-shutter-inner"></span>
                    </button>

                    <button id="camSwitchBtn" class="cam-switch-btn" title="Ganti Kamera Depan / Belakang" aria-label="Ganti Kamera">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><circle cx="12" cy="12" r="3"/><path d="m18 22-3-3 3-3"/><path d="m6 2 3 3-3 3"/></svg>
                    </button>
                </div>
            </section>
        `;
        document.body.appendChild(shellEl);

        videoEl = document.getElementById('camVideo');
        demoCanvas = document.getElementById('camDemoCanvas');
        gridCanvas = document.getElementById('camGridCanvas');
        frameEl = document.getElementById('camFrame');
        stageEl = document.getElementById('camStage');
        tintEl = document.getElementById('camTintLayer');
        grainEl = document.getElementById('camGrainLayer');
        vigEl = document.getElementById('camVignetteLayer');
        trayEl = document.getElementById('camTray');
        fallbackEl = document.getElementById('camFallback');
        fallbackTitleEl = document.getElementById('camFallbackTitle');
        fallbackDescEl = document.getElementById('camFallbackDesc');
        countdownEl = document.getElementById('camCountdown');
        flashVeilEl = document.getElementById('camFlashVeil');
        focusRingEl = document.getElementById('camFocusRing');
        levelBarEl = document.getElementById('camLevelBar');
        levelLineEl = document.getElementById('camLevelLine');
        levelLabelEl = document.getElementById('camLevelLabel');
        dateOverlayEl = document.getElementById('camDateStamp');
        if (dateOverlayEl) dateOverlayEl.textContent = getTodayDigicamStamp();

        bindCameraUIEvents();
        syncDigicamUI();

        if (window.ResizeObserver) {
            roStage = new ResizeObserver(() => {
                if (state.isOpen) layoutViewfinder();
            });
            roStage.observe(stageEl);
        }
        window.addEventListener('resize', () => {
            if (state.isOpen) layoutViewfinder();
        });
    }

    // ==========================================
    // 2. OPEN / CLOSE & MEDIA STREAM LIFECYCLE
    // ==========================================
    async function openCameraStudio() {
        buildCameraShell();
        const edShell = document.getElementById('editorShell');
        state.returnShell = edShell && !edShell.classList.contains('hidden') ? 'editor' : 'studio';

        document.getElementById('studioShell')?.classList.add('hidden');
        edShell?.classList.add('hidden');
        shellEl.classList.remove('hidden');
        state.isOpen = true;
        state.demoMode = false;
        state.activePanel = null; // Mulai bersih tanpa tray menutupi layar!
        demoCanvas.classList.add('hidden');
        videoEl.classList.remove('hidden');

        const photos = window.svnLens ? window.svnLens.photos() : [];
        if (!state.lastPhotoId && photos.length) {
            setLastThumb(photos[0].id, photos[0].editedThumbUrl || photos[0].thumbUrl, 0);
        }

        renderTray();
        syncDigicamUI();
        layoutViewfinder();
        applyLiveVisualFilter();
        await startCameraStream();
    }

    function closeCameraStudio(openPhotoId = null) {
        camStartSeq++;
        stopCameraStream();
        state.isOpen = false;
        state.countingDown = false;
        state.capturingLong = false;
        state.activePanel = null;
        if (countdownEl) countdownEl.classList.add('hidden');
        if (shellEl) shellEl.classList.add('hidden');

        if (openPhotoId && window.svnLens && window.svnLens.open) {
            window.svnLens.open(openPhotoId, 'Presets');
            return;
        }
        if (state.returnShell === 'editor') {
            document.getElementById('editorShell')?.classList.remove('hidden');
        } else {
            document.getElementById('studioShell')?.classList.remove('hidden');
        }
    }

    function stopCameraStream() {
        if (state.stream) {
            state.stream.getTracks().forEach((t) => {
                try { t.stop(); } catch (_) {}
            });
            state.stream = null;
        }
        if (videoEl) {
            videoEl.pause();
            videoEl.srcObject = null;
        }
        state.torchSupported = false;
        state.hwZoomSupported = false;
        state.maxHwZoom = 1;
    }

    async function tryAcquireCameraStream(facing, seq) {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const tryGet = async (constraints) => {
            if (seq !== camStartSeq || !state.isOpen) return null;
            return navigator.mediaDevices.getUserMedia(constraints);
        };

        // Urutan fallback aman untuk HP Android multi-lensa (Xiaomi/HyperOS/Samsung) & iOS Safari:
        // 1. Resolusi aman 1080p (menghindari crash Camera2 HAL pada 2560x1920)
        // 2. FacingMode murni tanpa batasan resolusi
        // 3. Pilih deviceId lensa utama langsung (menghindari sensor depth/macro/ToF)
        // 4. Fallback minimal { video: true }
        const attempts = [
            { audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
            { audio: false, video: { facingMode: facing } }
        ];

        let lastErr = null;
        for (let i = 0; i < attempts.length; i++) {
            try {
                const st = await tryGet(attempts[i]);
                if (st) return st;
                return null;
            } catch (err) {
                lastErr = err;
                if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) throw err;
                await sleep(200);
            }
        }

        // Tahap 3: Enumerasi perangkat kamera & coba lensa utama satu per satu
        if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
            try {
                const devs = await navigator.mediaDevices.enumerateDevices();
                const cams = devs.filter((d) => d.kind === 'videoinput' && d.deviceId);
                if (cams.length) {
                    const isBack = facing === 'environment';
                    const scoreCam = (d, idx) => {
                        const lbl = (d.label || '').toLowerCase();
                        let s = 0;
                        if (isBack && /(back|rear|environment)/.test(lbl)) s += 100;
                        if (!isBack && /(front|user|selfie)/.test(lbl)) s += 100;
                        if (isBack && /(front|user|selfie)/.test(lbl)) s -= 80;
                        if (!isBack && /(back|rear|environment)/.test(lbl)) s -= 80;
                        if (/(camera2 0|main|wide|0, facing back)/.test(lbl)) s += 40;
                        if (/(depth|macro|tof|ir|bokeh|aux|tele)/.test(lbl)) s -= 60;
                        return s - idx * 2;
                    };
                    const ranked = cams
                        .map((d, idx) => ({ d, s: scoreCam(d, idx) }))
                        .sort((a, b) => b.s - a.s)
                        .map((x) => x.d);
                    for (const cam of ranked) {
                        try {
                            const st = await tryGet({ audio: false, video: { deviceId: { exact: cam.deviceId } } });
                            if (st) return st;
                            return null;
                        } catch (err) {
                            lastErr = err;
                            if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) throw err;
                            await sleep(180);
                        }
                    }
                }
            } catch (enumErr) {
                if (enumErr && (enumErr.name === 'NotAllowedError' || enumErr.name === 'PermissionDeniedError')) throw enumErr;
            }
        }

        // Tahap 4: Fallback paling dasar { video: true }
        try {
            const st = await tryGet({ audio: false, video: true });
            if (st) return st;
            return null;
        } catch (err) {
            throw err || lastErr;
        }
    }

    async function startCameraStream() {
        const mySeq = ++camStartSeq;
        const hadActiveStream = !!state.stream;
        stopCameraStream();
        fallbackEl.classList.add('hidden');
        state.demoMode = false;
        demoCanvas.classList.add('hidden');
        videoEl.classList.remove('hidden');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showFallback(
                'Kamera Browser Tidak Tersedia',
                'Akses kamera langsung memerlukan koneksi HTTPS atau localhost. Anda bisa tetap memotret lewat Kamera Bawaan HP atau mencoba Pratinjau Grid & Filter.'
            );
            return;
        }

        // Beri jeda pelepasan hardware Android Camera2 HAL jika baru saja menutup/mengganti kamera
        if (hadActiveStream) {
            await new Promise((r) => setTimeout(r, 260));
            if (mySeq !== camStartSeq || !state.isOpen) return;
        }

        try {
            const stream = await tryAcquireCameraStream(state.facingMode, mySeq);
            if (!stream) return;
            if (mySeq !== camStartSeq || !state.isOpen) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }
            state.stream = stream;
            videoEl.muted = true;
            videoEl.setAttribute('playsinline', '');
            videoEl.setAttribute('webkit-playsinline', '');
            videoEl.srcObject = stream;
            await videoEl.play().catch(() => {});

            const track = stream.getVideoTracks()[0];
            if (track && typeof track.getCapabilities === 'function') {
                const caps = track.getCapabilities();
                state.torchSupported = !!caps.torch;
                if (caps.zoom && caps.zoom.max > 1) {
                    state.hwZoomSupported = true;
                    state.maxHwZoom = Math.min(6, caps.zoom.max);
                }
            }

            syncDigicamUI();
            if (state.flashOn || state.zoom > 1 || isManualExposure()) {
                applyHardwareTrackSettings();
            }
            applyLiveVisualFilter();
            layoutViewfinder();
        } catch (err) {
            if (mySeq !== camStartSeq || !state.isOpen) return;
            const name = err && err.name ? err.name : '';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                showFallback(
                    'Izin Kamera Ditolak',
                    'Aktifkan izin kamera pada pengaturan browser Anda, atau gunakan tombol Kamera Bawaan HP di bawah.'
                );
            } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                showFallback(
                    'Kamera Tidak Terdeteksi',
                    'Perangkat ini tidak memiliki kamera aktif. Di HP akan otomatis membuka kamera belakang, atau coba Pratinjau Grid & Filter.'
                );
            } else if (name === 'NotReadableError' || name === 'AbortError') {
                showFallback(
                    'Kamera Sedang Sibuk',
                    'Pastikan tidak ada aplikasi lain (kamera/video call) yang memakai kamera, lalu ketuk COBA LAGI atau gunakan Kamera Bawaan HP.'
                );
            } else {
                showFallback(
                    'Tidak Dapat Membuka Kamera',
                    (err && err.message ? err.message + '. ' : '') + 'Gunakan Kamera Bawaan HP atau Pratinjau Grid & Filter.'
                );
            }
        }
    }

    function showFallback(title, desc) {
        if (fallbackTitleEl) fallbackTitleEl.textContent = title;
        if (fallbackDescEl) fallbackDescEl.textContent = desc;
        if (fallbackEl) fallbackEl.classList.remove('hidden');
        layoutViewfinder();
    }

    async function enableDemoPreviewMode() {
        stopCameraStream();
        fallbackEl.classList.add('hidden');
        state.demoMode = true;
        videoEl.classList.add('hidden');
        demoCanvas.classList.remove('hidden');

        const photos = window.svnLens ? window.svnLens.photos() : [];
        let src = null;
        if (photos.length) {
            const p = photos[0];
            if (p._lazy && window.svnLens.hydrate) {
                try { await window.svnLens.hydrate(p); } catch (_) {}
            }
            src = p.originalCanvas || p.workingBaseCanvas || null;
        }
        if (!src) {
            const c = document.createElement('canvas');
            c.width = 900; c.height = 1200;
            const g = c.getContext('2d');
            const gr = g.createLinearGradient(0, 0, 900, 1200);
            gr.addColorStop(0, '#364941');
            gr.addColorStop(0.55, '#6e7c58');
            gr.addColorStop(1, '#26211e');
            g.fillStyle = gr;
            g.fillRect(0, 0, 900, 1200);
            src = c;
        }
        state.demoSourceCanvas = src;
        renderDemoPreviewFrame();
        layoutViewfinder();
    }

    function renderDemoPreviewFrame() {
        if (!state.demoMode || !state.demoSourceCanvas || !demoCanvas) return;
        const src = state.demoSourceCanvas;
        const maxDim = 960;
        const sc = Math.min(1, maxDim / Math.max(src.width, src.height));
        const w = Math.max(16, Math.round(src.width * sc));
        const h = Math.max(16, Math.round(src.height * sc));
        if (demoCanvas.width !== w || demoCanvas.height !== h) {
            demoCanvas.width = w;
            demoCanvas.height = h;
        }
        const c = demoCanvas.getContext('2d', { willReadFrequently: true });
        c.drawImage(src, 0, 0, w, h);
        const ev = computeExposureEV();
        const isoGrain = getIsoStop().grain;
        if (window.svnLens && window.svnLens.renderColorPreview && (state.filterId !== 'original' || ev !== 0 || isoGrain > 0)) {
            const img = c.getImageData(0, 0, w, h);
            window.svnLens.renderColorPreview(img, w, h, state.filterId, Math.round(ev * 24), isoGrain);
            c.putImageData(img, 0, 0);
            if (window.svnLens.renderPresetOverlay && state.filterId !== 'original') {
                window.svnLens.renderPresetOverlay(c, w, h, state.filterId, 1);
            }
        }
        applyLiveVisualFilter();
    }

    /**
     * Terapkan constraint sensor kamera HP (ISO, ExposureTime/Shutter, Torch, Zoom) bila didukung hardware.
     */
    function applyHardwareTrackSettings() {
        if (!state.stream) return;
        const track = state.stream.getVideoTracks()[0];
        if (!track || typeof track.applyConstraints !== 'function') return;
        const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
        const adv = {};

        if (caps.torch && state.facingMode === 'environment') {
            adv.torch = !!state.flashOn;
        }
        if (caps.zoom && state.hwZoomSupported) {
            adv.zoom = Math.min(caps.zoom.max, Math.max(caps.zoom.min || 1, state.zoom));
        }

        const hasHwManual = Array.isArray(caps.exposureMode) && caps.exposureMode.includes('manual');
        if (hasHwManual && (state.iso > 0 || state.shutterSec > 0)) {
            adv.exposureMode = 'manual';
            if (caps.iso && state.iso > 0) {
                adv.iso = Math.min(caps.iso.max, Math.max(caps.iso.min, state.iso));
            }
            if (caps.exposureTime && state.shutterSec > 0) {
                // W3C ImageCapture exposureTime dalam satuan 100 mikrodetik (1s = 10000)
                const units = Math.round(state.shutterSec * 10000);
                adv.exposureTime = Math.min(caps.exposureTime.max, Math.max(caps.exposureTime.min, units));
            }
        } else if (Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
            adv.exposureMode = 'continuous';
            if (caps.exposureCompensation) {
                const ev = computeExposureEV();
                const minEv = caps.exposureCompensation.min ?? -2;
                const maxEv = caps.exposureCompensation.max ?? 2;
                adv.exposureCompensation = Math.min(maxEv, Math.max(minEv, ev));
            }
        }

        if (Object.keys(adv).length) {
            track.applyConstraints({ advanced: [adv] }).catch(() => {});
        }
    }

    // ==========================================
    // 3. VIEWFINDER LAYOUT & SUBTLE COMPOSITION GRIDS
    // ==========================================
    function getActiveRatioValue() {
        const item = CAM_RATIOS.find((r) => r.id === state.ratioId) || CAM_RATIOS[0];
        return item.ratio;
    }

    function layoutViewfinder() {
        if (!stageEl || !frameEl) return;
        const sw = Math.max(120, stageEl.clientWidth - 12);
        const sh = Math.max(160, stageEl.clientHeight - 8);
        const ar = getActiveRatioValue();

        let fw = sw;
        let fh = sh;
        if (ar) {
            if (sw / sh > ar) {
                fh = sh;
                fw = Math.round(fh * ar);
            } else {
                fw = sw;
                fh = Math.round(fw / ar);
            }
        }
        frameEl.style.width = `${fw}px`;
        frameEl.style.height = `${fh}px`;
        drawCompositionGrid(fw, fh);
    }

    function drawCompositionGrid(cssW, cssH) {
        if (!gridCanvas) return;
        const w = Math.max(1, Math.round(cssW || frameEl.clientWidth));
        const h = Math.max(1, Math.round(cssH || frameEl.clientHeight));
        const dpr = Math.min(2.5, window.devicePixelRatio || 1);
        const pw = Math.round(w * dpr);
        const ph = Math.round(h * dpr);
        if (gridCanvas.width !== pw || gridCanvas.height !== ph) {
            gridCanvas.width = pw;
            gridCanvas.height = ph;
        }

        const c = gridCanvas.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, h);

        if (state.gridId === 'off') return;

        // Skala opacity halus (default 35% agar tipis & tidak menutupi subjek)
        const op = (GRID_OPACITIES[state.gridOpacityIdx] || GRID_OPACITIES[0]).val;

        c.save();
        c.globalAlpha = op;
        c.shadowColor = 'rgba(0, 0, 0, 0.38)';
        c.shadowBlur = 2;

        const strokeLine = (x1, y1, x2, y2, color, lw = 0.9) => {
            c.strokeStyle = color;
            c.lineWidth = lw;
            c.beginPath();
            c.moveTo(x1, y1);
            c.lineTo(x2, y2);
            c.stroke();
        };

        if (state.gridId === 'thirds') {
            const col = 'rgba(244, 241, 234, 0.85)';
            [1 / 3, 2 / 3].forEach((f) => {
                strokeLine(w * f, 0, w * f, h, col, 0.85);
                strokeLine(0, h * f, w, h * f, col, 0.85);
            });
            c.fillStyle = 'rgba(255, 198, 92, 0.95)';
            [1 / 3, 2 / 3].forEach((fx) => {
                [1 / 3, 2 / 3].forEach((fy) => {
                    c.beginPath(); c.arc(w * fx, h * fy, 2.2, 0, Math.PI * 2); c.fill();
                });
            });
        } else if (state.gridId === 'phi') {
            const p1 = 1 - 1 / PHI;
            const p2 = 1 / PHI;
            const col = 'rgba(255, 214, 140, 0.92)';
            [p1, p2].forEach((f) => {
                strokeLine(w * f, 0, w * f, h, col, 0.9);
                strokeLine(0, h * f, w, h * f, col, 0.9);
            });
            c.fillStyle = '#ffb547';
            [p1, p2].forEach((fx) => {
                [p1, p2].forEach((fy) => {
                    c.beginPath(); c.arc(w * fx, h * fy, 2.4, 0, Math.PI * 2); c.fill();
                });
            });
        } else if (state.gridId === 'spiral') {
            drawGoldenSpiralGrid(c, w, h, state.spiralOrient);
        } else if (state.gridId === 'diagonal') {
            const flip = state.spiralOrient % 2 === 1;
            const xA = flip ? w : 0, yA = 0;
            const xB = flip ? 0 : w, yB = h;
            strokeLine(xA, yA, xB, yB, 'rgba(255, 214, 140, 0.95)', 1.0);
            const dx = xB - xA, dy = yB - yA, L2 = dx * dx + dy * dy || 1;
            const proj = (px, py) => {
                const t = ((px - xA) * dx + (py - yA) * dy) / L2;
                return [xA + t * dx, yA + t * dy];
            };
            const c1x = flip ? 0 : w, c1y = 0;
            const c2x = flip ? w : 0, c2y = h;
            const [p1x, p1y] = proj(c1x, c1y);
            const [p2x, p2y] = proj(c2x, c2y);
            strokeLine(c1x, c1y, p1x, p1y, 'rgba(244, 241, 234, 0.72)', 0.85);
            strokeLine(c2x, c2y, p2x, p2y, 'rgba(244, 241, 234, 0.72)', 0.85);
            c.fillStyle = '#ffb547';
            [[p1x, p1y], [p2x, p2y]].forEach(([px, py]) => {
                c.beginPath(); c.arc(px, py, 2.6, 0, Math.PI * 2); c.fill();
            });
        } else if (state.gridId === 'center') {
            const col = 'rgba(244, 241, 234, 0.72)';
            const colAcc = 'rgba(255, 198, 92, 0.95)';
            c.setLineDash([4, 5]);
            strokeLine(w * 0.5, 0, w * 0.5, h, col, 0.85);
            strokeLine(0, h * 0.5, w, h * 0.5, col, 0.85);
            strokeLine(w * 0.16, h * 0.32, w * 0.84, h * 0.32, 'rgba(255, 206, 118, 0.62)', 0.85);
            c.setLineDash([]);
            const r = Math.min(w, h) * 0.05;
            c.strokeStyle = colAcc;
            c.lineWidth = 1.1;
            c.beginPath(); c.arc(w * 0.5, h * 0.5, r, 0, Math.PI * 2); c.stroke();
            strokeLine(w * 0.5 - r * 1.5, h * 0.5, w * 0.5 - r * 0.55, h * 0.5, colAcc, 1.1);
            strokeLine(w * 0.5 + r * 0.55, h * 0.5, w * 0.5 + r * 1.5, h * 0.5, colAcc, 1.1);
            strokeLine(w * 0.5, h * 0.5 - r * 1.5, w * 0.5, h * 0.5 - r * 0.55, colAcc, 1.1);
            strokeLine(w * 0.5, h * 0.5 + r * 0.55, w * 0.5, h * 0.5 + r * 1.5, colAcc, 1.1);
        }

        c.restore();
    }

    function drawGoldenSpiralGrid(c, w, h, orient) {
        const isPortrait = h > w;
        const flipX = orient === 1 || orient === 2;
        const flipY = orient === 2 || orient === 3;

        const mapPt = (gx, gy) => {
            const nx = gx / PHI;
            const ny = gy;
            let u = isPortrait ? ny : nx;
            let v = isPortrait ? nx : ny;
            if (flipX) u = 1 - u;
            if (flipY) v = 1 - v;
            return [u * w, v * h];
        };

        let x0 = 0, y0 = 0, rw = PHI, rh = 1;
        const spiralPts = [];
        const divLines = [];

        for (let k = 0; k < 8; k++) {
            const dir = k % 4;
            let s, cx, cy, aStart, aEnd;
            if (dir === 0) {
                s = rh;
                divLines.push([[x0 + s, y0], [x0 + s, y0 + rh]]);
                cx = x0 + s; cy = y0 + s;
                aStart = Math.PI; aEnd = Math.PI * 1.5;
                x0 += s; rw -= s;
            } else if (dir === 1) {
                s = rw;
                divLines.push([[x0, y0 + s], [x0 + rw, y0 + s]]);
                cx = x0; cy = y0 + s;
                aStart = Math.PI * 1.5; aEnd = Math.PI * 2;
                y0 += s; rh -= s;
            } else if (dir === 2) {
                s = rh;
                divLines.push([[x0 + rw - s, y0], [x0 + rw - s, y0 + rh]]);
                cx = x0 + rw - s; cy = y0;
                aStart = 0; aEnd = Math.PI * 0.5;
                rw -= s;
            } else {
                s = rw;
                divLines.push([[x0, y0 + rh - s], [x0 + rw, y0 + rh - s]]);
                cx = x0 + s; cy = y0 + rh - s;
                aStart = Math.PI * 0.5; aEnd = Math.PI;
                rh -= s;
            }

            const segs = 28;
            for (let j = k === 0 ? 0 : 1; j <= segs; j++) {
                const ang = aStart + ((aEnd - aStart) * j) / segs;
                spiralPts.push(mapPt(cx + Math.cos(ang) * s, cy + Math.sin(ang) * s));
            }
        }

        // Garis subdivisi Fibonacci sangat halus
        c.strokeStyle = 'rgba(255, 224, 166, 0.36)';
        c.lineWidth = 0.75;
        divLines.forEach(([a, b]) => {
            const [x1, y1] = mapPt(a[0], a[1]);
            const [x2, y2] = mapPt(b[0], b[1]);
            c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        });

        // Lengkung Golden Spiral tipis & bersih
        if (spiralPts.length > 1) {
            c.strokeStyle = 'rgba(255, 206, 118, 1)';
            c.lineWidth = 1.3;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.beginPath();
            c.moveTo(spiralPts[0][0], spiralPts[0][1]);
            for (let i = 1; i < spiralPts.length; i++) {
                c.lineTo(spiralPts[i][0], spiralPts[i][1]);
            }
            c.stroke();

            const [ex, ey] = spiralPts[spiralPts.length - 1];
            c.fillStyle = '#ffb547';
            c.beginPath(); c.arc(ex, ey, 2.8, 0, Math.PI * 2); c.fill();
            c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            c.lineWidth = 0.9;
            c.beginPath(); c.arc(ex, ey, 6.2, 0, Math.PI * 2); c.stroke();
        }
    }

    // ==========================================
    // 4. LIVE VISUAL FILTER, EXPOSURE TRIANGLE & HIGH-ISO GRAIN
    // ==========================================
    function applyLiveVisualFilter() {
        const flt = CAM_FILTERS.find((f) => f.id === state.filterId) || CAM_FILTERS[0];
        const mirrorX = state.facingMode === 'user' && state.mirrorFront && !state.demoMode ? -1 : 1;
        const digitalZoom = state.hwZoomSupported && !state.demoMode ? 1 : state.zoom;
        const transformStr = `scale(${(mirrorX * digitalZoom).toFixed(3)}, ${digitalZoom.toFixed(3)})`;
        const ev = computeExposureEV();

        if (videoEl) {
            videoEl.style.transform = transformStr;
            const parts = [];
            if (flt.css && flt.css !== 'none') parts.push(flt.css);
            if (Math.abs(ev) > 0.02) {
                const evBright = Math.pow(2, ev * 0.42).toFixed(3);
                parts.push(`brightness(${evBright})`);
            }
            videoEl.style.filter = parts.length ? parts.join(' ') : 'none';
        }
        if (demoCanvas) {
            demoCanvas.style.transform = `scale(${state.zoom.toFixed(3)})`;
        }

        if (tintEl) {
            if (!state.demoMode && flt.tint) {
                tintEl.style.background = flt.tint;
                tintEl.style.mixBlendMode = flt.blend || 'soft-light';
                tintEl.style.opacity = '1';
            } else {
                tintEl.style.opacity = '0';
            }
        }

        // High-ISO subtle sensor grain preview di viewfinder
        const isoGrain = getIsoStop().grain;
        if (grainEl) {
            grainEl.style.opacity = !state.demoMode && isoGrain > 0 ? Math.min(0.42, isoGrain / 135).toFixed(2) : '0';
        }

        // Vignette preset + sedikit natural lens vignette di bukaan besar f/1.4 - f/1.8
        const ap = getApertureStop();
        const apVig = ap.val > 0 && ap.val <= 1.8 ? 0.14 : 0;
        const totalVig = Math.min(0.85, (flt.vig || 0) + apVig);
        if (vigEl) {
            if (totalVig > 0) {
                vigEl.style.background = `radial-gradient(circle at center, rgba(0,0,0,0) 44%, rgba(0,0,0,${(totalVig * 0.85).toFixed(2)}) 100%)`;
                vigEl.style.opacity = '1';
            } else {
                vigEl.style.opacity = '0';
            }
        }

        syncDigicamUI();
    }

    function syncDigicamUI() {
        // Top bar compact pills
        const bRatio = document.getElementById('camBtnRatio');
        const bTimer = document.getElementById('camBtnTimer');
        const bFlash = document.getElementById('camBtnFlash');
        const bLevel = document.getElementById('camBtnLevel');
        const bDate = document.getElementById('camBtnDate');
        const bMirror = document.getElementById('camBtnMirror');
        if (bRatio) bRatio.textContent = (CAM_RATIOS.find((r) => r.id === state.ratioId) || CAM_RATIOS[0]).label;
        if (bTimer) {
            bTimer.textContent = state.timerSec ? `⏱ ${state.timerSec}s` : '⏱';
            bTimer.classList.toggle('active', state.timerSec > 0);
        }
        if (bFlash) {
            bFlash.textContent = state.flashOn ? '⚡ ON' : '⚡';
            bFlash.classList.toggle('active', state.flashOn);
        }
        if (bLevel) bLevel.classList.toggle('active', state.levelOn);
        if (bDate) {
            bDate.classList.toggle('active', state.dateStampOn);
            if (dateOverlayEl) dateOverlayEl.classList.toggle('hidden', !state.dateStampOn);
        }
        if (bMirror) {
            bMirror.classList.toggle('hidden', state.facingMode !== 'user');
            bMirror.classList.toggle('active', state.mirrorFront);
        }

        // Minimal mono HUD di sudut atas viewfinder
        const hudLeft = document.getElementById('camHudLeft');
        const hudEv = document.getElementById('camHudEv');
        const manual = isManualExposure();
        if (hudLeft) {
            const parts = [manual ? 'M' : 'AUTO'];
            if (state.filterId !== 'original') {
                const fObj = CAM_FILTERS.find((f) => f.id === state.filterId);
                if (fObj) parts.push(fObj.code);
            }
            if (state.gridId === 'spiral') parts.push(`SPIRAL ${SPIRAL_DIRS[state.spiralOrient % 4]}`);
            else if (state.gridId !== 'off') {
                const gObj = CAM_GRIDS.find((g) => g.id === state.gridId);
                if (gObj) parts.push(gObj.label);
            }
            hudLeft.textContent = parts.join(' · ');
        }
        if (hudEv) {
            const ev = computeExposureEV();
            const sign = ev > 0.04 ? '+' : '';
            hudEv.textContent = `EV ${sign}${ev.toFixed(1)}`;
            hudEv.classList.toggle('warn', Math.abs(ev) >= 1.5);
        }

        // Digicam LCD Strip values & active states
        const btnMode = document.getElementById('camBtnMode');
        if (btnMode) {
            btnMode.textContent = manual ? 'M' : 'AUTO';
            btnMode.classList.toggle('is-manual', manual);
        }

        const lcdIso = document.getElementById('camLcdIso');
        const lcdF = document.getElementById('camLcdF');
        const lcdS = document.getElementById('camLcdS');
        const lcdGrid = document.getElementById('camLcdGrid');
        const lcdFilter = document.getElementById('camLcdFilter');

        if (lcdIso) {
            lcdIso.querySelector('.lcd-v').textContent = state.iso > 0 ? String(state.iso) : 'AUTO';
            lcdIso.classList.toggle('active', state.activePanel === 'iso');
            lcdIso.classList.toggle('custom', state.iso > 0);
        }
        if (lcdF) {
            lcdF.querySelector('.lcd-v').textContent = state.aperture > 0 ? String(state.aperture) : 'AUTO';
            lcdF.classList.toggle('active', state.activePanel === 'aperture');
            lcdF.classList.toggle('custom', state.aperture > 0);
        }
        if (lcdS) {
            const sh = getShutterStop();
            lcdS.querySelector('.lcd-v').textContent = sh.sec > 0 ? sh.label : 'AUTO';
            lcdS.classList.toggle('active', state.activePanel === 'shutter');
            lcdS.classList.toggle('custom', state.shutterSec > 0);
        }
        if (lcdGrid) {
            lcdGrid.classList.toggle('active', state.activePanel === 'grid');
            lcdGrid.classList.toggle('custom', state.gridId !== 'off');
        }
        if (lcdFilter) {
            lcdFilter.classList.toggle('active', state.activePanel === 'filter');
            lcdFilter.classList.toggle('custom', state.filterId !== 'original');
        }
    }

    // ==========================================
    // 5. FLOATING SINGLE-ROW GLASS TRAY (ISO / F / S / GRID / FILTER)
    // ==========================================
    function togglePanel(panelName) {
        state.activePanel = state.activePanel === panelName ? null : panelName;
        renderTray();
        syncDigicamUI();
    }

    function renderTray() {
        if (!trayEl) return;
        const p = state.activePanel;
        if (!p) {
            trayEl.classList.add('hidden');
            trayEl.innerHTML = '';
            return;
        }

        trayEl.classList.remove('hidden');
        trayEl.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'cam-tray-head';

        const scroll = document.createElement('div');
        scroll.className = 'cam-tray-scroll';

        if (p === 'iso') {
            const cur = getIsoStop();
            header.innerHTML = `<span>ISO SENSITIVITY</span><span>${cur.val ? `ISO ${cur.val}${cur.grain ? ` · GRAIN +${cur.grain}` : ''}` : 'AUTO ISO'}</span>`;
            ISO_STOPS.forEach((st) => {
                const b = document.createElement('button');
                b.className = `cam-dial-stop ${state.iso === st.val ? 'active' : ''}`;
                b.dataset.iso = String(st.val);
                b.textContent = st.label;
                b.addEventListener('click', () => {
                    state.iso = st.val;
                    applyHardwareTrackSettings();
                    if (state.demoMode) renderDemoPreviewFrame(); else applyLiveVisualFilter();
                    renderTray();
                });
                scroll.appendChild(b);
            });
        } else if (p === 'aperture') {
            const cur = getApertureStop();
            header.innerHTML = `<span>APERTURE (DEPTH OF FIELD)</span><span>${cur.val ? `${cur.label} · ${cur.note.toUpperCase()}` : 'AUTO APERTURE'}</span>`;
            APERTURE_STOPS.forEach((st) => {
                const b = document.createElement('button');
                b.className = `cam-dial-stop ${state.aperture === st.val ? 'active' : ''}`;
                b.dataset.aperture = String(st.val);
                b.textContent = st.label;
                b.addEventListener('click', () => {
                    state.aperture = st.val;
                    applyHardwareTrackSettings();
                    if (state.demoMode) renderDemoPreviewFrame(); else applyLiveVisualFilter();
                    renderTray();
                });
                scroll.appendChild(b);
            });
        } else if (p === 'shutter') {
            const cur = getShutterStop();
            header.innerHTML = `<span>SHUTTER SPEED</span><span>${cur.sec ? `${cur.label}s${cur.frames > 1 ? ' · SLOW SHUTTER' : ''}` : 'AUTO SHUTTER'}</span>`;
            SHUTTER_STOPS.forEach((st) => {
                const b = document.createElement('button');
                b.className = `cam-dial-stop ${Math.abs(state.shutterSec - st.sec) < 1e-6 ? 'active' : ''}`;
                b.dataset.shutter = st.label;
                b.textContent = st.label;
                b.addEventListener('click', () => {
                    state.shutterSec = st.sec;
                    applyHardwareTrackSettings();
                    if (state.demoMode) renderDemoPreviewFrame(); else applyLiveVisualFilter();
                    renderTray();
                });
                scroll.appendChild(b);
            });
        } else if (p === 'grid') {
            const opObj = GRID_OPACITIES[state.gridOpacityIdx] || GRID_OPACITIES[0];
            header.innerHTML = `<span>GRID KOMPOSISI</span><span>OPASITAS ${opObj.label}</span>`;
            CAM_GRIDS.forEach((g) => {
                const isAct = state.gridId === g.id;
                const b = document.createElement('button');
                b.className = `cam-chip ${isAct ? 'active' : ''}`;
                b.dataset.grid = g.id;
                b.textContent = g.id === 'spiral' && isAct ? `SPIRAL ${SPIRAL_DIRS[state.spiralOrient % 4]}` : g.label;
                b.addEventListener('click', () => {
                    if (state.gridId === g.id && g.rotatable) {
                        state.spiralOrient = (state.spiralOrient + 1) % (g.id === 'spiral' ? 4 : 2);
                    } else {
                        state.gridId = g.id;
                    }
                    drawCompositionGrid();
                    syncDigicamUI();
                    renderTray();
                });
                scroll.appendChild(b);
            });
            const curG = CAM_GRIDS.find((g) => g.id === state.gridId);
            if (curG && curG.rotatable) {
                const rotBtn = document.createElement('button');
                rotBtn.className = 'cam-chip accent';
                rotBtn.id = 'camBtnRotateGrid';
                rotBtn.textContent = state.gridId === 'spiral' ? `↻ PUTAR ${SPIRAL_DIRS[state.spiralOrient % 4]}` : '↻ BALIK';
                rotBtn.addEventListener('click', () => {
                    state.spiralOrient = (state.spiralOrient + 1) % (state.gridId === 'spiral' ? 4 : 2);
                    drawCompositionGrid();
                    syncDigicamUI();
                    renderTray();
                });
                scroll.appendChild(rotBtn);
            }
            if (state.gridId !== 'off') {
                const opBtn = document.createElement('button');
                opBtn.className = 'cam-chip';
                opBtn.id = 'camBtnGridOpacity';
                opBtn.textContent = `◐ ${opObj.label}`;
                opBtn.title = 'Ubah transparansi garis grid';
                opBtn.addEventListener('click', () => {
                    state.gridOpacityIdx = (state.gridOpacityIdx + 1) % GRID_OPACITIES.length;
                    drawCompositionGrid();
                    renderTray();
                });
                scroll.appendChild(opBtn);
            }
        } else if (p === 'filter') {
            const curF = CAM_FILTERS.find((f) => f.id === state.filterId) || CAM_FILTERS[0];
            header.innerHTML = `<span>FILTER FILM LIVE</span><span>${curF.code}</span>`;
            CAM_FILTERS.forEach((f) => {
                const card = document.createElement('button');
                card.className = `cam-filter-card ${state.filterId === f.id ? 'active' : ''}`;
                card.dataset.camFilter = f.id;
                card.innerHTML = `<span class="cam-filter-swatch" style="background:${f.swatch}"></span><span class="cam-filter-name">${f.code}</span>`;
                card.addEventListener('click', () => {
                    state.filterId = f.id;
                    if (state.demoMode) renderDemoPreviewFrame(); else applyLiveVisualFilter();
                    renderTray();
                });
                scroll.appendChild(card);
            });
        }

        trayEl.appendChild(header);
        trayEl.appendChild(scroll);
    }

    // ==========================================
    // 6. CAPTURE PHOTO (SINGLE / SLOW-SHUTTER LONG EXPOSURE + NON-DESTRUCTIVE DIGICAM STATE!)
    // ==========================================
    function playShutterClick(isBeep = false) {
        if (!state.soundOn) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            if (!audioCtx) audioCtx = new AC();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = isBeep ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(isBeep ? 880 : 190, now);
            if (!isBeep) osc.frequency.exponentialRampToValueAtTime(55, now + 0.06);
            gain.gain.setValueAtTime(isBeep ? 0.08 : 0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (isBeep ? 0.08 : 0.07));
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        } catch (_) {}
    }

    async function triggerShutter() {
        if (state.countingDown || state.capturingLong) return;
        if (!state.stream && !state.demoMode) {
            window.svnLens?.toast?.('Kamera belum aktif — ketuk PRATINJAU atau KAMERA BAWAAN HP', 2400);
            return;
        }
        if (state.timerSec > 0) {
            state.countingDown = true;
            countdownEl.classList.remove('hidden');
            for (let s = state.timerSec; s >= 1; s--) {
                if (!state.isOpen || !state.countingDown) {
                    countdownEl.classList.add('hidden');
                    state.countingDown = false;
                    return;
                }
                countdownEl.textContent = String(s);
                playShutterClick(true);
                await new Promise((r) => setTimeout(r, 1000));
            }
            countdownEl.classList.add('hidden');
            state.countingDown = false;
        }

        if (state.flashOn && state.facingMode === 'user' && !state.demoMode) {
            flashVeilEl.classList.add('screen-flash');
            await new Promise((r) => setTimeout(r, 150));
            await captureCurrentFrame();
            await new Promise((r) => setTimeout(r, 110));
            flashVeilEl.classList.remove('screen-flash');
        } else {
            await captureCurrentFrame();
        }
    }

    async function captureCurrentFrame() {
        const srcEl = state.demoMode ? state.demoSourceCanvas : videoEl;
        const srcW = state.demoMode ? (srcEl ? srcEl.width : 0) : (videoEl ? videoEl.videoWidth : 0);
        const srcH = state.demoMode ? (srcEl ? srcEl.height : 0) : (videoEl ? videoEl.videoHeight : 0);
        if (!srcEl || !srcW || !srcH) return;

        const targetAr = getActiveRatioValue() || (frameEl.clientWidth / Math.max(1, frameEl.clientHeight));
        const srcAr = srcW / srcH;
        let baseCropW = srcW;
        let baseCropH = srcH;
        if (srcAr > targetAr) {
            baseCropH = srcH;
            baseCropW = srcH * targetAr;
        } else {
            baseCropW = srcW;
            baseCropH = srcW / targetAr;
        }

        const digitalZoom = state.hwZoomSupported && !state.demoMode ? 1 : state.zoom;
        const cropW = Math.max(16, baseCropW / digitalZoom);
        const cropH = Math.max(16, baseCropH / digitalZoom);
        const sx = (srcW - cropW) / 2;
        const sy = (srcH - cropH) / 2;

        const maxOut = 2400;
        const sc = Math.min(1, maxOut / Math.max(cropW, cropH));
        const outW = Math.max(16, Math.round(cropW * sc));
        const outH = Math.max(16, Math.round(cropH * sc));

        const outCv = document.createElement('canvas');
        outCv.width = outW;
        outCv.height = outH;
        const oCtx = outCv.getContext('2d');

        const drawFrame = (alpha) => {
            oCtx.save();
            oCtx.globalAlpha = alpha;
            if (state.facingMode === 'user' && state.mirrorFront && !state.demoMode) {
                oCtx.translate(outW, 0);
                oCtx.scale(-1, 1);
            }
            oCtx.drawImage(srcEl, sx, sy, cropW, cropH, 0, 0, outW, outH);
            oCtx.restore();
        };

        // Slow-Shutter Multi-Frame Accumulation nyata untuk 1/15s .. 1/2" pada live camera!
        const shStop = getShutterStop();
        const shutterBtn = document.getElementById('camShutterBtn');
        if (!state.demoMode && shStop.frames > 1) {
            state.capturingLong = true;
            if (shutterBtn) shutterBtn.classList.add('exposing');
            const totalMs = Math.min(550, Math.max(140, Math.round(shStop.sec * 1000)));
            const stepMs = Math.max(24, Math.round(totalMs / shStop.frames));
            for (let k = 0; k < shStop.frames; k++) {
                drawFrame(1 / (k + 1));
                if (k < shStop.frames - 1) await new Promise((r) => setTimeout(r, stepMs));
            }
            if (shutterBtn) shutterBtn.classList.remove('exposing');
            state.capturingLong = false;
        } else {
            drawFrame(1);
        }

        playShutterClick(false);
        flashVeilEl.classList.remove('snap');
        void flashVeilEl.offsetWidth;
        flashVeilEl.classList.add('snap');

        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

        const ev = computeExposureEV();
        const isoStop = getIsoStop();
        const apStop = getApertureStop();

        if (window.svnLens && window.svnLens.addCapturedPhoto) {
            const item = window.svnLens.addCapturedPhoto(outCv, `CAM_${stamp}`, {
                presetId: state.filterId,
                evAdjust: Math.abs(ev) > 0.04 ? Math.round(ev * 24) : 0,
                grain: isoStop.grain,
                lensBlurAmount: apStop.bokeh,
                dateStamp: state.dateStampOn ? getTodayDigicamStamp() : ''
            });
            state.shotsCount += 1;
            setLastThumb(item.id, item.editedThumbUrl || item.thumbUrl, state.shotsCount);

            const tags = [];
            if (state.filterId !== 'original') {
                const fltObj = CAM_FILTERS.find((f) => f.id === state.filterId);
                if (fltObj) tags.push(fltObj.code);
            }
            if (state.iso > 0) tags.push(`ISO ${state.iso}`);
            if (state.aperture > 0) tags.push(apStop.label);
            if (state.shutterSec > 0) tags.push(shStop.label);
            window.svnLens.toast?.(`✓ Foto tersimpan${tags.length ? ' · ' + tags.join(' ') : ''}`, 2200);
        }
    }

    function setLastThumb(photoId, url, count) {
        state.lastPhotoId = photoId;
        state.lastThumbUrl = url || '';
        const btn = document.getElementById('camLastThumb');
        const img = document.getElementById('camLastThumbImg');
        const badge = document.getElementById('camLastThumbCount');
        const ph = btn ? btn.querySelector('.cam-last-placeholder') : null;
        if (!btn || !img) return;
        if (url) {
            img.src = url;
            img.classList.remove('hidden');
            btn.classList.remove('empty');
            if (ph) ph.classList.add('hidden');
        }
        if (badge) {
            if (count > 0) {
                badge.textContent = String(count);
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    // ==========================================
    // 7. HORIZON LEVEL SENSOR (MOBILE TILT)
    // ==========================================
    function toggleLevelSensor() {
        state.levelOn = !state.levelOn;
        syncDigicamUI();
        if (levelBarEl) levelBarEl.classList.toggle('hidden', !state.levelOn);
        if (state.levelOn && !orientationBound) {
            orientationBound = true;
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission().then((res) => {
                    if (res === 'granted') window.addEventListener('deviceorientation', handleDeviceOrientation);
                }).catch(() => {});
            } else {
                window.addEventListener('deviceorientation', handleDeviceOrientation);
            }
        }
        updateLevelVisual(state.tiltDeg);
    }

    function handleDeviceOrientation(e) {
        if (!state.isOpen || !state.levelOn) return;
        if (typeof e.gamma !== 'number' && typeof e.beta !== 'number') return;
        const isLandscape = window.innerWidth > window.innerHeight;
        let deg = isLandscape ? (e.beta || 0) : (e.gamma || 0);
        deg = Math.max(-45, Math.min(45, deg));
        state.tiltDeg = deg;
        updateLevelVisual(deg);
    }

    function updateLevelVisual(deg) {
        if (!levelLineEl || !levelLabelEl || !levelBarEl) return;
        const isLevel = Math.abs(deg) <= 1.5;
        levelLineEl.style.transform = `rotate(${(-deg).toFixed(1)}deg)`;
        levelLabelEl.textContent = `${Math.round(deg)}°`;
        levelBarEl.classList.toggle('is-level', isLevel);
    }

    // ==========================================
    // 8. EVENT BINDINGS
    // ==========================================
    function bindCameraUIEvents() {
        document.getElementById('camBtnClose').addEventListener('click', () => closeCameraStudio());

        document.getElementById('camBtnRatio').addEventListener('click', () => {
            const idx = CAM_RATIOS.findIndex((r) => r.id === state.ratioId);
            state.ratioId = CAM_RATIOS[(idx + 1) % CAM_RATIOS.length].id;
            syncDigicamUI();
            layoutViewfinder();
        });

        document.getElementById('camBtnTimer').addEventListener('click', () => {
            state.timerSec = state.timerSec === 0 ? 3 : state.timerSec === 3 ? 10 : 0;
            syncDigicamUI();
        });

        document.getElementById('camBtnFlash').addEventListener('click', () => {
            state.flashOn = !state.flashOn;
            syncDigicamUI();
            applyHardwareTrackSettings();
        });

        document.getElementById('camBtnLevel').addEventListener('click', toggleLevelSensor);

        document.getElementById('camBtnDate').addEventListener('click', () => {
            state.dateStampOn = !state.dateStampOn;
            if (dateOverlayEl) dateOverlayEl.textContent = getTodayDigicamStamp();
            syncDigicamUI();
        });

        document.getElementById('camBtnMirror').addEventListener('click', () => {
            state.mirrorFront = !state.mirrorFront;
            syncDigicamUI();
            applyLiveVisualFilter();
        });

        const triggerNativeCamera = () => {
            const inp = document.getElementById('nativeCameraInput');
            if (!inp) return;
            inp.value = '';
            inp.click();
        };
        document.getElementById('camBtnNative').addEventListener('click', triggerNativeCamera);
        document.getElementById('camBtnFallbackNative').addEventListener('click', triggerNativeCamera);
        document.getElementById('camBtnFallbackRetry').addEventListener('click', startCameraStream);
        document.getElementById('camBtnFallbackDemo').addEventListener('click', enableDemoPreviewMode);

        // AUTO / M toggle button: klik saat M -> reset semua ISO/F/S ke AUTO; klik saat AUTO -> masuk Manual default (ISO 200 · f/2.8 · 1/125)
        document.getElementById('camBtnMode').addEventListener('click', () => {
            if (isManualExposure()) {
                state.iso = 0;
                state.aperture = 0;
                state.shutterSec = 0;
            } else {
                state.iso = 200;
                state.aperture = 2.8;
                state.shutterSec = 1 / 125;
                if (!state.activePanel) state.activePanel = 'iso';
            }
            applyHardwareTrackSettings();
            if (state.demoMode) renderDemoPreviewFrame(); else applyLiveVisualFilter();
            renderTray();
        });

        // Digicam LCD buttons (ISO / F / S / GRID / FILTER)
        document.querySelectorAll('#camLcdStrip [data-panel]').forEach((btn) => {
            btn.addEventListener('click', () => togglePanel(btn.dataset.panel));
        });

        // Zoom quick pills inside viewfinder edge (1x, 2x, 3x)
        document.querySelectorAll('#camZoomGroup .cam-zoom-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                setCameraZoom(parseFloat(btn.dataset.zoom) || 1);
            });
        });

        // Shutter, Switch Camera, Last Shot Thumbnail
        document.getElementById('camShutterBtn').addEventListener('click', triggerShutter);
        document.getElementById('camSwitchBtn').addEventListener('click', async () => {
            state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
            state.zoom = 1;
            updateZoomButtonsUI();
            syncDigicamUI();
            if (!state.demoMode) await startCameraStream();
        });
        document.getElementById('camLastThumb').addEventListener('click', () => {
            if (state.lastPhotoId) {
                closeCameraStudio(state.lastPhotoId);
            } else {
                closeCameraStudio();
                window.svnLens?.showView?.('viewLibrary');
            }
        });

        // Tap pada viewfinder: tutup tray bila terbuka + animasi Tap-to-Focus
        frameEl.addEventListener('click', (e) => {
            if (e.target.closest('#camFallback, #camZoomGroup')) return;
            if (state.activePanel) {
                state.activePanel = null;
                renderTray();
                syncDigicamUI();
            }
            const r = frameEl.getBoundingClientRect();
            const px = e.clientX - r.left;
            const py = e.clientY - r.top;
            focusRingEl.style.left = `${px}px`;
            focusRingEl.style.top = `${py}px`;
            focusRingEl.classList.remove('active');
            void focusRingEl.offsetWidth;
            focusRingEl.classList.add('active');

            if (state.stream) {
                const track = state.stream.getVideoTracks()[0];
                if (track && typeof track.applyConstraints === 'function') {
                    track.applyConstraints({
                        advanced: [{ pointsOfInterest: [{ x: px / r.width, y: py / r.height }] }]
                    }).catch(() => {});
                }
            }
        });

        // Pinch-to-zoom 2 jari di HP
        frameEl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[1].clientX - e.touches[0].clientX;
                const dy = e.touches[1].clientY - e.touches[0].clientY;
                pinchStart = { dist: Math.max(10, Math.hypot(dx, dy)), zoom: state.zoom };
            }
        }, { passive: true });
        frameEl.addEventListener('touchmove', (e) => {
            if (pinchStart && e.touches.length === 2) {
                const dx = e.touches[1].clientX - e.touches[0].clientX;
                const dy = e.touches[1].clientY - e.touches[0].clientY;
                const dist = Math.max(10, Math.hypot(dx, dy));
                setCameraZoom(pinchStart.zoom * (dist / pinchStart.dist));
            }
        }, { passive: true });
        frameEl.addEventListener('touchend', () => { pinchStart = null; }, { passive: true });

        // Native camera file input handler
        const nativeInput = document.getElementById('nativeCameraInput');
        if (nativeInput && !nativeInput.dataset.camBound) {
            nativeInput.dataset.camBound = '1';
            nativeInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                nativeInput.value = '';
                try {
                    const bmp = window.createImageBitmap ? await createImageBitmap(file) : await loadFallbackImg(file);
                    const maxD = 2400;
                    const sc = Math.min(1, maxD / Math.max(bmp.width, bmp.height));
                    const cv = document.createElement('canvas');
                    cv.width = Math.max(16, Math.round(bmp.width * sc));
                    cv.height = Math.max(16, Math.round(bmp.height * sc));
                    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
                    if (bmp.close) bmp.close();
                    if (window.svnLens && window.svnLens.addCapturedPhoto) {
                        const ev = computeExposureEV();
                        const item = window.svnLens.addCapturedPhoto(cv, file.name || 'Camera_Photo', {
                            presetId: state.filterId,
                            evAdjust: Math.abs(ev) > 0.04 ? Math.round(ev * 24) : 0,
                            grain: getIsoStop().grain,
                            lensBlurAmount: getApertureStop().bokeh,
                            dateStamp: state.dateStampOn ? getTodayDigicamStamp() : ''
                        });
                        closeCameraStudio(item.id);
                    }
                } catch (err) {
                    window.svnLens?.toast?.('Gagal membaca foto dari kamera perangkat', 2800);
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            if (!state.isOpen) return;
            if (e.code === 'Escape') {
                e.preventDefault();
                if (state.activePanel) { state.activePanel = null; renderTray(); syncDigicamUI(); }
                else closeCameraStudio();
            } else if (e.code === 'Space') {
                e.preventDefault();
                triggerShutter();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && state.isOpen && state.stream) stopCameraStream();
            else if (!document.hidden && state.isOpen && !state.demoMode && !state.stream) startCameraStream();
        });
        window.addEventListener('pagehide', stopCameraStream);
    }

    function loadFallbackImg(file) {
        return new Promise((res, rej) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); res(img); };
            img.onerror = (err) => { URL.revokeObjectURL(url); rej(err); };
            img.src = url;
        });
    }

    function setCameraZoom(nextZoom) {
        const maxZ = state.hwZoomSupported && !state.demoMode ? Math.max(3, state.maxHwZoom) : 4;
        state.zoom = Math.max(1, Math.min(maxZ, nextZoom));
        updateZoomButtonsUI();
        applyHardwareTrackSettings();
        applyLiveVisualFilter();
    }

    function updateZoomButtonsUI() {
        document.querySelectorAll('#camZoomGroup .cam-zoom-btn').forEach((b) => {
            const z = parseFloat(b.dataset.zoom) || 1;
            b.classList.toggle('active', Math.abs(state.zoom - z) < 0.28);
        });
    }

    // ==========================================
    // 9. WIRE GLOBAL ENTRY BUTTONS
    // ==========================================
    function wireEntryButtons() {
        ['btnHomeCamera', 'btnNavCamera', 'btnLibCamera', 'btnEditorCamera'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', openCameraStudio);
        });
        window.svnLensCamera = { open: openCameraStudio, close: closeCameraStudio };
        if (window.svnLens) window.svnLens.openCamera = openCameraStudio;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireEntryButtons);
    } else {
        wireEntryButtons();
    }
})();
