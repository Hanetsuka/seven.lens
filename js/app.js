/**
 * svn.lens Studio — Main Application & Darkroom Engine
 */

(function () {
    // ==========================================
    // 1. STATE & DATA STORE
    // ==========================================
    let libraryPhotos = []; // Array of { id, title, originalCanvas, thumbUrl, editedThumbUrl, isEdited, editState }
    let currentPhotoId = null;
    let libFilterMode = 'all'; // 'all' | 'edited'

    let myCubeLuts = window.createDefaultSampleLUTs();
    let favoritePresetIds = new Set(['p400', 'fuji_chrome', 'cinestill800t']);
    let customFontsList = [...window.EDITORIAL_FONTS];

    // Canvases
    const mainCanvas = document.getElementById('mainCanvas');
    const ctx = mainCanvas.getContext('2d');

    const basePhotoCanvas = document.createElement('canvas'); // Menyimpan bitmap foto saat ini (setelah crop/rotasi/bg remove)
    const basePhotoCtx = basePhotoCanvas.getContext('2d');

    const gradedCanvas = document.createElement('canvas');
    const gradedCtx = gradedCanvas.getContext('2d');

    const brushCanvas = document.createElement('canvas');
    const brushCtx = brushCanvas.getContext('2d');

    const thumbGenCanvas = document.createElement('canvas');
    thumbGenCanvas.width = 96;
    thumbGenCanvas.height = 96;
    const thumbGenCtx = thumbGenCanvas.getContext('2d');

    // Default Non-Destructive Edit State per Photo
    function createDefaultEditState() {
        return {
            presetId: 'original',
            presetStrength: 100,
            activeCubeLutId: null,
            adjust: {
                exposure: 0,
                contrast: 0,
                highlights: 0,
                shadows: 0,
                curves: 0,
                brightness: 0,
                fade: 0,
                temperature: 0,
                tint: 0,
                saturation: 0,
                vibrance: 0,
                hue: 0,
                sepia: 0,
                sharpness: 0,
                grain: 0,
                blur: 0,
                vignette: 0,
                straighten: 0
            },
            flipH: false,
            flipV: false,
            bgReplaceColor: 'transparent',
            effectId: 'none_leak',
            effectStrength: 75,
            dustId: 'none_dust',
            dustStrength: 50,
            texts: [], // { id, text, x, y, font, fontName, size, color, opacity, rotate, bold, italic, shadow, outline, align }
            selectedTextId: null
        };
    }

    let state = createDefaultEditState();

    // Active UI Context inside Editor
    let activeEditorMainTab = 'Presets'; // 'Presets' | 'Tools' | 'Effects' | 'Text'
    let activePresetCat = 'negative';
    let activeToolCat = 'all';
    let activeToolKey = 'exposure';
    let activeEffectCat = 'leaks';

    // Slider binding mode: 'preset' | 'tool' | 'effect'
    let masterSliderMode = 'preset';

    // Gestures & Interactive Modes
    let isHoldingCompare = false;
    let isDraggingText = false;
    let dragTextOffset = { x: 0, y: 0 };

    // Crop State
    let isCropping = false;
    let cropRatio = 'free';
    let cropRect = { x: 40, y: 40, w: 220, h: 220 };
    let cropDragMode = null;
    let cropDragStart = null;

    // Magic Wand & Brush Modes
    let magicWandActive = false;
    let brushModeActive = false;
    let brushDrawing = false;
    let brushStyle = 'solid'; // 'solid' | 'neon' | 'eraser'
    let brushColor = '#ffffff';
    let brushSize = 14;
    let lastBrushPt = { x: 0, y: 0 };

    // History Stack (Undo / Redo)
    let historyStack = [];
    let historyIndex = -1;

    // ==========================================
    // 2. TOOL DEFINITIONS (02 TOOLS)
    // ==========================================
    const TOOLS_CONFIG = [
        // LIGHT
        { key: 'exposure', name: 'Exposure', cat: 'light', min: -100, max: 100, def: 0, icon: `<circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>` },
        { key: 'contrast', name: 'Contrast', cat: 'light', min: -100, max: 100, def: 0, icon: `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/>` },
        { key: 'highlights', name: 'Highlights', cat: 'light', min: -100, max: 100, def: 0, icon: `<circle cx="12" cy="12" r="9"/><path d="M3 12a9 9 0 0 1 18 0Z" fill="currentColor"/>` },
        { key: 'shadows', name: 'Shadows', cat: 'light', min: -100, max: 100, def: 0, icon: `<circle cx="12" cy="12" r="9"/><path d="M3 12a9 9 0 0 0 18 0Z" fill="currentColor"/>` },
        { key: 'curves', name: 'Curves', cat: 'light', min: -100, max: 100, def: 0, icon: `<rect x="3" y="3" width="18" height="18"/><path d="M3 21C9 21 9 3 21 3"/>` },
        { key: 'brightness', name: 'Brightness', cat: 'light', min: -100, max: 100, def: 0, icon: `<circle cx="12" cy="12" r="6"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>` },
        { key: 'fade', name: 'Fade', cat: 'light', min: 0, max: 100, def: 0, icon: `<rect x="3" y="5" width="18" height="14"/><line x1="3" y1="14" x2="21" y2="14"/>` },

        // COLOR
        { key: 'temperature', name: 'Warmth', cat: 'color', min: -100, max: 100, def: 0, icon: `<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>` },
        { key: 'tint', name: 'Tint', cat: 'color', min: -100, max: 100, def: 0, icon: `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>` },
        { key: 'saturation', name: 'Saturation', cat: 'color', min: -100, max: 100, def: 0, icon: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>` },
        { key: 'vibrance', name: 'Vibrance', cat: 'color', min: -100, max: 100, def: 0, icon: `<polygon points="12 2 19 21 12 17 5 21 12 2"/>` },
        { key: 'hue', name: 'Hue Shift', cat: 'color', min: -180, max: 180, def: 0, icon: `<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 6"/>` },
        { key: 'sepia', name: 'Sepia', cat: 'color', min: 0, max: 100, def: 0, icon: `<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="4"/>` },

        // DETAIL
        { key: 'sharpness', name: 'Sharpness', cat: 'detail', min: 0, max: 100, def: 0, icon: `<polygon points="12 3 20 20 4 20"/>` },
        { key: 'grain', name: 'Film Grain', cat: 'detail', min: 0, max: 100, def: 0, icon: `<circle cx="7" cy="7" r="1.5"/><circle cx="16" cy="8" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="8" cy="17" r="1.5"/><circle cx="17" cy="16" r="1.5"/>` },
        { key: 'blur', name: 'Soft Blur', cat: 'detail', min: 0, max: 25, def: 0, icon: `<circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/>` },

        // OPTICS
        { key: 'vignette', name: 'Vignette', cat: 'optics', min: 0, max: 100, def: 0, icon: `<rect x="3" y="3" width="18" height="18" rx="2"/><ellipse cx="12" cy="12" rx="6" ry="6"/>` },
        { key: 'action_halation', name: 'Halation', cat: 'optics', isAction: true, icon: `<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/>` },
        { key: 'action_bokeh', name: 'Bokeh Blur', cat: 'optics', isAction: true, icon: `<circle cx="12" cy="10" r="3"/><path d="M7 20c0-2.8 2.2-5 5-5s5 2.2 5 5"/><rect x="3" y="3" width="18" height="18" rx="2"/>` },
        { key: 'action_glitch', name: 'RGB Glitch', cat: 'optics', isAction: true, icon: `<path d="M4 8h16M4 16h16"/><rect x="5" y="5" width="14" height="14"/>` },

        // GEO & CROP
        { key: 'straighten', name: 'Straighten', cat: 'geo', min: -45, max: 45, def: 0, icon: `<line x1="2" y1="12" x2="22" y2="12"/><path d="M6 8l12 8"/>` },
        { key: 'context_crop', name: 'Crop', cat: 'geo', isContext: 'crop', icon: `<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>` },
        { key: 'action_rot_left', name: 'Rotate -90°', cat: 'geo', isAction: true, icon: `<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>` },
        { key: 'action_rot_right', name: 'Rotate +90°', cat: 'geo', isAction: true, icon: `<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>` },
        { key: 'action_flip_h', name: 'Flip Horiz', cat: 'geo', isAction: true, icon: `<path d="m3 7 5 5-5 5V7"/><path d="m21 7-5 5 5 5V7"/><line x1="12" y1="3" x2="12" y2="21" stroke-dasharray="2 2"/>` },
        { key: 'action_flip_v', name: 'Flip Vert', cat: 'geo', isAction: true, icon: `<path d="m7 3 5 5 5-5H7"/><path d="m7 21 5-5 5 5H7"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2"/>` },

        // AI & BG REMOVAL & BRUSH
        { key: 'action_ai_enhance', name: 'AI Enhance', cat: 'ai', isAction: true, icon: `<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/>` },
        { key: 'action_auto_bg', name: 'Auto Hapus BG', cat: 'ai', isAction: true, icon: `<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="4"/>` },
        { key: 'context_wand_bg', name: 'Magic Wand BG', cat: 'ai', isContext: 'wand', icon: `<path d="m15 4-1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4Z"/><line x1="4" y1="20" x2="13" y2="11"/>` },
        { key: 'context_bg_color', name: 'Warna Latar', cat: 'ai', isContext: 'bgcolor', icon: `<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 15h18"/>` },
        { key: 'context_brush', name: 'Brush Doodle', cat: 'ai', isContext: 'brush', icon: `<path d="m18 5-3-3-9 9v3h3l9-9Z"/><path d="M5 19h14"/>` }
    ];

    // ==========================================
    // 3. INITIALIZATION & STARTER LIBRARY PHOTOS
    // ==========================================
    function init() {
        generateStarterLibraryPhotos();
        renderLibraryGrid();
        renderMyLutsView();
        bindStudioNavigation();
        bindEditorEvents();
    }

    /**
     * Membuat 3 Foto Awal di "Your library" yang menyerupai foto pada Screenshot 9:
     * 01: Dreamy Cloud in Blue Sky (dengan teks contoh "Rearrange the light")
     * 02: Overhead Matcha & Iced Coffee Table
     * 03: Warm Living Room Interior
     */
    function generateStarterLibraryPhotos() {
        // Photo 01: Dreamy Cloud in Blue Sky (Matches screenshots 2, 3, 4, 5, 6, 7, 9, 10)
        const c1 = document.createElement('canvas');
        c1.width = 900;
        c1.height = 1125; // 4:5 portrait
        const ctx1 = c1.getContext('2d');

        const skyGrad = ctx1.createLinearGradient(0, 0, 0, c1.height);
        skyGrad.addColorStop(0, '#3e6294');
        skyGrad.addColorStop(0.45, '#5c7ea8');
        skyGrad.addColorStop(1, '#798da3');
        ctx1.fillStyle = skyGrad;
        ctx1.fillRect(0, 0, c1.width, c1.height);

        // Gambar awan kumulus lembut berlapis
        const puffs = [
            // Dasar awan abu-kebiruan
            { x: 450, y: 820, r: 340, col: 'rgba(130, 146, 168, 0.85)' },
            { x: 240, y: 760, r: 260, col: 'rgba(138, 154, 175, 0.85)' },
            { x: 680, y: 780, r: 280, col: 'rgba(134, 150, 172, 0.85)' },
            // Bagian tengah awan hangat
            { x: 380, y: 520, r: 210, col: 'rgba(220, 224, 230, 0.92)' },
            { x: 540, y: 580, r: 190, col: 'rgba(210, 216, 224, 0.9)' },
            { x: 240, y: 590, r: 165, col: 'rgba(195, 204, 215, 0.88)' },
            { x: 690, y: 600, r: 175, col: 'rgba(205, 212, 222, 0.88)' },
            // Puncak awan terang terkena cahaya matahari
            { x: 370, y: 390, r: 135, col: 'rgba(252, 250, 245, 0.96)' },
            { x: 465, y: 440, r: 120, col: 'rgba(254, 252, 247, 0.96)' },
            { x: 250, y: 420, r: 95, col: 'rgba(244, 244, 242, 0.92)' },
            { x: 635, y: 490, r: 115, col: 'rgba(248, 247, 244, 0.94)' }
        ];

        puffs.forEach((p) => {
            const g = ctx1.createRadialGradient(p.x - p.r * 0.15, p.y - p.r * 0.15, p.r * 0.1, p.x, p.y, p.r);
            g.addColorStop(0, p.col);
            g.addColorStop(0.65, p.col);
            g.addColorStop(1, 'rgba(125, 145, 170, 0)');
            ctx1.fillStyle = g;
            ctx1.beginPath();
            ctx1.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx1.fill();
        });

        addPhotoToLibrary(c1, 'Cloud Study 01', true);

        // Photo 02: Overhead Matcha & Iced Latte Cafe Table
        const c2 = document.createElement('canvas');
        c2.width = 900;
        c2.height = 1125;
        const ctx2 = c2.getContext('2d');
        ctx2.fillStyle = '#6c6f74';
        ctx2.fillRect(0, 0, c2.width, c2.height);
        // Tekstur kayu meja
        for (let i = 0; i < 60; i++) {
            ctx2.fillStyle = i % 2 === 0 ? 'rgba(40,42,46,0.18)' : 'rgba(210,210,210,0.08)';
            ctx2.fillRect(0, i * 19, c2.width, 8);
        }
        // Majalah terbuka di kiri atas
        ctx2.save();
        ctx2.translate(220, 340);
        ctx2.rotate(-0.42);
        ctx2.fillStyle = '#e5e7eb';
        ctx2.fillRect(-180, -220, 360, 440);
        ctx2.fillStyle = '#9ca3af';
        ctx2.fillRect(-150, -180, 130, 160);
        ctx2.restore();
        // Gelas Matcha Latte
        drawCafeCup(ctx2, 510, 450, 92, '#84a98c');
        // Gelas Iced Coffee Latte
        drawCafeCup(ctx2, 430, 740, 96, '#b08968');

        addPhotoToLibrary(c2, 'Matcha & Coffee 02', false);

        // Photo 03: Warm Aesthetic Interior & Studio Subject (Bagus untuk tes Hapus BG & LUT)
        const c3 = document.createElement('canvas');
        c3.width = 900;
        c3.height = 1125;
        const ctx3 = c3.getContext('2d');
        ctx3.fillStyle = '#e7e2d8';
        ctx3.fillRect(0, 0, c3.width, c3.height);
        // Lantai hangat
        ctx3.fillStyle = '#9c826b';
        ctx3.fillRect(0, 760, c3.width, 365);
        // Dekorasi dinding & tanaman
        ctx3.fillStyle = '#283618';
        ctx3.fillRect(580, 260, 180, 500);
        // Subjek utama kontras di tengah (mudah dihapus BG-nya dengan Magic Wand / Auto BG)
        ctx3.fillStyle = '#bc6c25';
        ctx3.beginPath();
        ctx3.arc(450, 620, 190, 0, Math.PI * 2);
        ctx3.fill();
        ctx3.fillStyle = '#dda15e';
        ctx3.beginPath();
        ctx3.arc(450, 460, 110, 0, Math.PI * 2);
        ctx3.fill();

        addPhotoToLibrary(c3, 'Warm Interior 03', false);

        currentPhotoId = libraryPhotos[0].id;
    }

    function drawCafeCup(c, x, y, r, drinkColor) {
        c.save();
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.beginPath();
        c.arc(x + 12, y + 16, r, 0, Math.PI * 2);
        c.fill();

        c.fillStyle = '#f8fafc';
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();

        c.fillStyle = drinkColor;
        c.beginPath();
        c.arc(x, y, r * 0.84, 0, Math.PI * 2);
        c.fill();

        // Es batu & sedotan
        c.fillStyle = 'rgba(255,255,255,0.45)';
        c.fillRect(x - 25, y - 20, 26, 26);
        c.fillRect(x + 6, y + 4, 24, 24);

        c.strokeStyle = '#1e293b';
        c.lineWidth = 8;
        c.beginPath();
        c.moveTo(x + 10, y + 10);
        c.lineTo(x + 55, y + 60);
        c.stroke();
        c.restore();
    }

    function addPhotoToLibrary(canvasEl, title, markEdited = false) {
        const thumbUrl = canvasEl.toDataURL('image/jpeg', 0.82);
        const editState = createDefaultEditState();

        const item = {
            id: 'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            title,
            originalCanvas: canvasEl,
            workingBaseCanvas: cloneCanvas(canvasEl),
            workingBrushCanvas: createBlankCanvas(canvasEl.width, canvasEl.height),
            thumbUrl,
            editedThumbUrl: thumbUrl,
            isEdited: markEdited,
            editState
        };

        libraryPhotos.unshift(item);
        updatePhotoCountLabels();
        return item;
    }

    function cloneCanvas(src) {
        const c = document.createElement('canvas');
        c.width = src.width;
        c.height = src.height;
        c.getContext('2d').drawImage(src, 0, 0);
        return c;
    }

    function createBlankCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    function updatePhotoCountLabels() {
        const countStr = String(libraryPhotos.length).padStart(2, '0') + ' PHOTOS';
        document.getElementById('homePhotoCount').textContent = countStr;
        document.getElementById('libTopMeta').textContent = `STUDIO / ${countStr}`;
    }

    // ==========================================
    // 4. STUDIO SHELL NAVIGATION (HOME / LIBRARY / LUTS)
    // ==========================================
    function switchStudioView(viewId) {
        document.getElementById('editorShell').classList.add('hidden');
        document.getElementById('studioShell').classList.remove('hidden');

        document.querySelectorAll('.studio-view').forEach((v) => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');

        document.querySelectorAll('.studio-nav-item').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
        });

        if (viewId === 'viewLibrary') renderLibraryGrid();
        if (viewId === 'viewLuts') renderMyLutsView();
    }

    function bindStudioNavigation() {
        // Bottom Nav (01 HOME | 02 LIBRARY | 03 LUTS)
        document.querySelectorAll('.studio-nav-item').forEach((btn) => {
            btn.addEventListener('click', () => {
                switchStudioView(btn.getAttribute('data-view'));
            });
        });

        // Home Actions
        document.getElementById('btnContinueEditing').addEventListener('click', () => {
            if (libraryPhotos.length > 0) {
                openPhotoInEditor(currentPhotoId || libraryPhotos[0].id);
            }
        });

        document.getElementById('btnHomeImportPhoto').addEventListener('click', () => {
            document.getElementById('photoFileInput').click();
        });

        document.getElementById('btnLibImport').addEventListener('click', () => {
            document.getElementById('photoFileInput').click();
        });

        document.getElementById('btnHomeBrowsePresets').addEventListener('click', () => {
            if (libraryPhotos.length > 0) {
                openPhotoInEditor(currentPhotoId || libraryPhotos[0].id, 'Presets');
            }
        });

        document.getElementById('btnCloseTip').addEventListener('click', () => {
            document.getElementById('tipBanner').classList.add('hidden');
        });

        // Guide Modal ("Good to know.")
        const gestureModal = document.getElementById('gestureModal');
        document.getElementById('btnShowGuideModal').addEventListener('click', () => {
            gestureModal.classList.remove('hidden');
        });
        document.getElementById('btnOpenSettings').addEventListener('click', () => {
            gestureModal.classList.remove('hidden');
        });
        document.getElementById('btnGotItModal').addEventListener('click', () => {
            gestureModal.classList.add('hidden');
        });

        // Backup JSON
        document.getElementById('btnBackupData').addEventListener('click', () => {
            const backup = {
                app: 'svn.lens Studio Local',
                exportedAt: new Date().toISOString(),
                favorites: Array.from(favoritePresetIds),
                lutsCount: myCubeLuts.length,
                photosCount: libraryPhotos.length
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'svnlens-studio-backup.json';
            a.click();
        });

        // Photo File Input
        document.getElementById('photoFileInput').addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            let loadedCount = 0;
            let lastAdded = null;
            files.forEach((file) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        const c = document.createElement('canvas');
                        c.width = img.width;
                        c.height = img.height;
                        c.getContext('2d').drawImage(img, 0, 0);
                        lastAdded = addPhotoToLibrary(c, file.name);
                        loadedCount++;
                        if (loadedCount === files.length && lastAdded) {
                            renderLibraryGrid();
                            openPhotoInEditor(lastAdded.id);
                        }
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        });

        // Library Filter (ALL | EDITED) & Grid Columns (3 | 1 | 2)
        document.querySelectorAll('.lib-filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.lib-filter-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                libFilterMode = btn.getAttribute('data-filter');
                renderLibraryGrid();
            });
        });

        document.querySelectorAll('.grid-mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.grid-mode-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                const cols = btn.getAttribute('data-cols');
                const grid = document.getElementById('libraryGrid');
                grid.className = `library-grid cols-${cols}`;
            });
        });

        // LUT File Input (.cube)
        document.getElementById('btnImportCubeMain').addEventListener('click', () => {
            document.getElementById('lutFileInput').click();
        });

        document.getElementById('lutFileInput').addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            files.forEach((file) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const parsed = window.parseCubeLUT(ev.target.result, file.name);
                        myCubeLuts.push(parsed);
                        renderMyLutsView();
                        if (!document.getElementById('editorShell').classList.contains('hidden')) {
                            activePresetCat = 'myluts';
                            renderPresetsStrip();
                            selectCubeLutInEditor(parsed.id);
                        }
                    } catch (err) {
                        alert(err.message);
                    }
                };
                reader.readAsText(file);
            });
            e.target.value = '';
        });
    }

    function renderLibraryGrid() {
        const grid = document.getElementById('libraryGrid');
        grid.innerHTML = '';

        const list = libraryPhotos.filter((p) => (libFilterMode === 'edited' ? p.isEdited : true));

        list.forEach((photo, idx) => {
            const numStr = String(idx + 1).padStart(2, '0');
            const card = document.createElement('div');
            card.className = 'lib-photo-card';
            card.innerHTML = `
                <div class="lib-thumb-wrap">
                    <img src="${photo.editedThumbUrl || photo.thumbUrl}" alt="${photo.title}">
                    ${libraryPhotos.length > 1 ? `<button class="lib-card-Delete" title="Hapus foto">×</button>` : ''}
                </div>
                <div class="lib-card-meta">
                    <span>${numStr}</span>
                    ${photo.isEdited ? `<span class="edited-dot" title="Edited"></span>` : ''}
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('lib-card-Delete')) {
                    e.stopPropagation();
                    libraryPhotos = libraryPhotos.filter((item) => item.id !== photo.id);
                    updatePhotoCountLabels();
                    renderLibraryGrid();
                    return;
                }
                openPhotoInEditor(photo.id);
            });

            grid.appendChild(card);
        });
    }

    function renderMyLutsView() {
        const listEl = document.getElementById('myLutsList');
        listEl.innerHTML = '';
        document.getElementById('lutCountMeta').textContent = `/ ${String(myCubeLuts.length).padStart(2, '0')}`;

        myCubeLuts.forEach((lut, idx) => {
            const numStr = String(idx + 1).padStart(2, '0');
            const row = document.createElement('div');
            row.className = 'lut-row';
            row.innerHTML = `
                <span class="lut-row-num">${numStr}</span>
                <div class="lut-swatch-box" style="background:${lut.swatch}"></div>
                <div class="lut-row-info">
                    <div class="lut-row-title">${lut.title}</div>
                    <div class="lut-row-sub">${lut.pointsLabel}</div>
                </div>
                <button class="link-underlined btn-remove-lut">REMOVE</button>
            `;
            row.querySelector('.btn-remove-lut').addEventListener('click', () => {
                myCubeLuts = myCubeLuts.filter((l) => l.id !== lut.id);
                renderMyLutsView();
            });
            listEl.appendChild(row);
        });
    }

    // ==========================================
    // 5. OPENING A PHOTO IN DARKROOM EDITOR
    // ==========================================
    function openPhotoInEditor(photoId, initialTab = 'Presets') {
        const photo = libraryPhotos.find((p) => p.id === photoId) || libraryPhotos[0];
        if (!photo) return;

        currentPhotoId = photo.id;
        state = JSON.parse(JSON.stringify(photo.editState));

        const w = photo.workingBaseCanvas.width;
        const h = photo.workingBaseCanvas.height;

        basePhotoCanvas.width = w;
        basePhotoCanvas.height = h;
        basePhotoCtx.clearRect(0, 0, w, h);
        basePhotoCtx.drawImage(photo.workingBaseCanvas, 0, 0);

        brushCanvas.width = w;
        brushCanvas.height = h;
        brushCtx.clearRect(0, 0, w, h);
        brushCtx.drawImage(photo.workingBrushCanvas, 0, 0);

        document.getElementById('studioShell').classList.add('hidden');
        document.getElementById('editorShell').classList.remove('hidden');

        // Generate thumbnail base (96x96) for live preset & effect strip previews
        thumbGenCtx.clearRect(0, 0, 96, 96);
        const minSide = Math.min(w, h);
        const sx = (w - minSide) / 2;
        const sy = (h - minSide) / 2;
        thumbGenCtx.drawImage(basePhotoCanvas, sx, sy, minSide, minSide, 0, 0, 96, 96);

        historyStack = [];
        historyIndex = -1;
        pushHistory('Open Photo');

        switchEditorMainTab(initialTab);
        renderEditorCanvas();
    }

    function saveCurrentPhotoBackToLibrary() {
        const photo = libraryPhotos.find((p) => p.id === currentPhotoId);
        if (!photo) return;

        photo.editState = JSON.parse(JSON.stringify(state));
        photo.workingBaseCanvas = cloneCanvas(basePhotoCanvas);
        photo.workingBrushCanvas = cloneCanvas(brushCanvas);

        // Render thumbnail tanpa border seleksi teks
        const prevSel = state.selectedTextId;
        state.selectedTextId = null;
        renderEditorCanvas();
        photo.editedThumbUrl = mainCanvas.toDataURL('image/jpeg', 0.8);
        state.selectedTextId = prevSel;

        // Tandai edited jika ada perubahan dari default
        const isDefault =
            state.presetId === 'original' &&
            !state.activeCubeLutId &&
            state.effectId === 'none_leak' &&
            state.texts.length === 0 &&
            Object.values(state.adjust).every((v) => v === 0);
        photo.isEdited = !isDefault;
    }

    // ==========================================
    // 6. CORE DARKROOM RENDERING PIPELINE
    // ==========================================
    function renderEditorCanvas() {
        const photo = libraryPhotos.find((p) => p.id === currentPhotoId);
        if (!photo) return;

        const w = basePhotoCanvas.width;
        const h = basePhotoCanvas.height;
        if (mainCanvas.width !== w || mainCanvas.height !== h) {
            mainCanvas.width = w;
            mainCanvas.height = h;
            gradedCanvas.width = w;
            gradedCanvas.height = h;
        }

        // Jika pengguna sedang menahan foto (Hold to Compare), tampilkan foto asli
        if (isHoldingCompare) {
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(photo.originalCanvas, 0, 0, w, h);
            return;
        }

        // 1. Transform (Flip & Straighten)
        gradedCtx.clearRect(0, 0, w, h);
        gradedCtx.save();
        gradedCtx.translate(w / 2, h / 2);
        if (state.adjust.straighten !== 0) {
            const rad = (state.adjust.straighten * Math.PI) / 180;
            const zoomComp = 1 + Math.abs(Math.sin(rad)) * 0.3;
            gradedCtx.rotate(rad);
            gradedCtx.scale(zoomComp, zoomComp);
        }
        gradedCtx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
        gradedCtx.drawImage(basePhotoCanvas, -w / 2, -h / 2);
        gradedCtx.restore();

        // 2. Soft Blur jika > 0
        if (state.adjust.blur > 0) {
            const tmp = cloneCanvas(gradedCanvas);
            gradedCtx.clearRect(0, 0, w, h);
            gradedCtx.save();
            gradedCtx.filter = `blur(${state.adjust.blur}px)`;
            gradedCtx.drawImage(tmp, 0, 0);
            gradedCtx.restore();
        }

        // 3. Pixel-level Color Grading (Film Preset / 3D .CUBE LUT / Tools Adjustments)
        const imgData = gradedCtx.getImageData(0, 0, w, h);
        applyColorPipelineToImageData(imgData, w, h, state);
        gradedCtx.putImageData(imgData, 0, 0);

        // 4. Vignette
        if (state.adjust.vignette > 0) {
            const vStr = state.adjust.vignette / 100;
            const g = gradedCtx.createRadialGradient(
                w / 2, h / 2, Math.min(w, h) * 0.25,
                w / 2, h / 2, Math.max(w, h) * 0.72
            );
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(1, `rgba(0,0,0,${(vStr * 0.85).toFixed(2)})`);
            gradedCtx.save();
            gradedCtx.globalCompositeOperation = 'source-atop';
            gradedCtx.fillStyle = g;
            gradedCtx.fillRect(0, 0, w, h);
            gradedCtx.restore();
        }

        // 5. Komposisi ke mainCanvas
        ctx.clearRect(0, 0, w, h);

        // Background Color Replace (jika bukan transparent)
        if (state.bgReplaceColor && state.bgReplaceColor !== 'transparent') {
            ctx.fillStyle = state.bgReplaceColor;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.drawImage(gradedCanvas, 0, 0);

        // 6. Analog Effects (Light Leaks, Film Burns, Vintage Dust)
        renderAnalogEffectsOverlay(ctx, w, h, state.effectId, state.effectStrength / 100);
        renderDustOverlay(ctx, w, h, state.dustId, state.dustStrength / 100);

        // 7. Layer Brush / Doodle
        ctx.drawImage(brushCanvas, 0, 0);

        // 8. Layer Teks & Stiker ("Rearrange the light" dengan dashed selection box)
        state.texts.forEach((t) => {
            ctx.save();
            ctx.translate(t.x, t.y);
            if (t.rotate) {
                ctx.rotate((t.rotate * Math.PI) / 180);
            }
            ctx.globalAlpha = (t.opacity ?? 100) / 100;

            const weight = t.bold ? '700' : '400';
            const style = t.italic ? 'italic' : 'normal';
            ctx.font = `${style} ${weight} ${t.size}px ${t.font}`;
            ctx.textAlign = t.align || 'center';
            ctx.textBaseline = 'middle';

            if (t.shadow) {
                ctx.shadowColor = 'rgba(0,0,0,0.45)';
                ctx.shadowBlur = Math.max(4, t.size * 0.12);
                ctx.shadowOffsetY = 2;
            }

            if (t.outline) {
                ctx.lineWidth = Math.max(2, t.size * 0.06);
                ctx.strokeStyle = '#1c1917';
                ctx.strokeText(t.text, 0, 0);
            }

            ctx.fillStyle = t.color || '#ffffff';
            ctx.fillText(t.text, 0, 0);

            // Dashed white selection rectangle persis seperti Screenshot 2 & 4
            if (t.id === state.selectedTextId) {
                const metrics = ctx.measureText(t.text);
                const bw = Math.max(60, metrics.width + 28);
                const bh = t.size * 1.32;
                let boxX = -bw / 2;
                if (t.align === 'left') boxX = -14;
                if (t.align === 'right') boxX = -bw + 14;

                ctx.shadowColor = 'transparent';
                ctx.strokeStyle = 'rgba(244, 241, 234, 0.85)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 4]);
                ctx.strokeRect(boxX, -bh / 2, bw, bh);
            }
            ctx.restore();
        });
    }

    function applyColorPipelineToImageData(imgData, w, h, currentState) {
        const adj = currentState.adjust;
        const preset = window.FILM_PRESETS.find((p) => p.id === currentState.presetId) || window.FILM_PRESETS[0];
        const p = preset.params || {};
        const pStr = (currentState.presetStrength ?? 100) / 100;

        const d = imgData.data;

        const exposure = adj.exposure + (p.exposure || 0) * pStr;
        const brightness = adj.brightness + (p.brightness || 0) * pStr;
        const contrast = adj.contrast + (p.contrast || 0) * pStr + adj.curves * 0.65;
        const highlights = adj.highlights;
        const shadows = adj.shadows;
        const fade = adj.fade + (p.fade || 0) * pStr;
        const warmth = adj.temperature + (p.warmth || 0) * pStr;
        const tint = adj.tint + (p.tint || 0) * pStr;
        const saturation = adj.saturation + (p.saturation || 0) * pStr;
        const vibrance = adj.vibrance;
        const hueDeg = adj.hue;
        const sepiaAmt = adj.sepia / 100;
        const grainAmt = adj.grain;

        const isNeutral =
            exposure === 0 && brightness === 0 && contrast === 0 &&
            highlights === 0 && shadows === 0 && fade === 0 &&
            warmth === 0 && tint === 0 && saturation === 0 &&
            vibrance === 0 && hueDeg === 0 && sepiaAmt === 0 &&
            grainAmt === 0 && adj.sharpness === 0 &&
            !p.splitStrength && !currentState.activeCubeLutId;

        if (isNeutral) return;

        const expFactor = Math.pow(2, exposure / 65);
        const brightOffset = brightness * 1.75;
        const contrastFactor = Math.pow((contrast + 100) / 100, 2);
        const satFactor = (saturation + 100) / 100;
        const vibFactor = vibrance / 100;
        const fadeLift = (fade / 100) * 46;

        const hasSplit = p.shadowsTint && p.highlightsTint && p.splitStrength;
        const splitStr = hasSplit ? p.splitStrength * pStr : 0;

        let hueCos = 1, hueSin = 0;
        if (hueDeg !== 0) {
            const rad = (hueDeg * Math.PI) / 180;
            hueCos = Math.cos(rad);
            hueSin = Math.sin(rad);
        }

        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] === 0) continue;

            let r = d[i];
            let g = d[i + 1];
            let b = d[i + 2];

            // Exposure & Brightness
            r = r * expFactor + brightOffset;
            g = g * expFactor + brightOffset;
            b = b * expFactor + brightOffset;

            // Highlights & Shadows
            if (shadows !== 0 || highlights !== 0) {
                const lum = Math.min(1, Math.max(0, (0.299 * r + 0.587 * g + 0.114 * b) / 255));
                if (shadows !== 0) {
                    const sw = Math.pow(1 - lum, 1.8) * shadows * 1.15;
                    r += sw; g += sw; b += sw;
                }
                if (highlights !== 0) {
                    const hw = Math.pow(lum, 1.8) * highlights * 1.15;
                    r += hw; g += hw; b += hw;
                }
            }

            // Contrast & Curves
            if (contrast !== 0) {
                r = (r - 128) * contrastFactor + 128;
                g = (g - 128) * contrastFactor + 128;
                b = (b - 128) * contrastFactor + 128;
            }

            // Matte Fade
            if (fadeLift > 0) {
                r = fadeLift + r * ((255 - fadeLift) / 255);
                g = fadeLift + g * ((255 - fadeLift) / 255);
                b = fadeLift + b * ((255 - fadeLift) / 255);
            }

            // Warmth & Tint
            if (warmth !== 0) {
                r += warmth * 0.92;
                g += warmth * 0.14;
                b -= warmth * 0.92;
            }
            if (tint !== 0) {
                g -= tint * 0.75;
                r += tint * 0.35;
                b += tint * 0.35;
            }

            // Split Toning (Film Presets)
            if (splitStr > 0) {
                const lum = Math.min(1, Math.max(0, (0.299 * r + 0.587 * g + 0.114 * b) / 255));
                const sT = p.shadowsTint;
                const hT = p.highlightsTint;
                const tr = sT[0] * (1 - lum) + hT[0] * lum;
                const tg = sT[1] * (1 - lum) + hT[1] * lum;
                const tb = sT[2] * (1 - lum) + hT[2] * lum;
                r = r * (1 - splitStr) + tr * splitStr;
                g = g * (1 - splitStr) + tg * splitStr;
                b = b * (1 - splitStr) + tb * splitStr;
            }

            // Saturation & Vibrance
            if (saturation !== 0 || vibrance !== 0) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                let s = satFactor;
                if (vibrance !== 0) {
                    const maxC = Math.max(r, g, b);
                    const minC = Math.min(r, g, b);
                    s += vibFactor * (1 - (maxC - minC) / 255);
                }
                r = gray + (r - gray) * s;
                g = gray + (g - gray) * s;
                b = gray + (b - gray) * s;
            }

            // Hue Shift
            if (hueDeg !== 0) {
                const y = 0.299 * r + 0.587 * g + 0.114 * b;
                const ic = 0.596 * r - 0.274 * g - 0.322 * b;
                const qc = 0.211 * r - 0.523 * g + 0.312 * b;
                const ir = ic * hueCos - qc * hueSin;
                const qr = ic * hueSin + qc * hueCos;
                r = y + 0.956 * ir + 0.621 * qr;
                g = y - 0.272 * ir - 0.647 * qr;
                b = y - 1.106 * ir + 1.703 * qr;
            }

            // Sepia
            if (sepiaAmt > 0) {
                const sr = r * 0.393 + g * 0.769 + b * 0.189;
                const sg = r * 0.349 + g * 0.686 + b * 0.168;
                const sb = r * 0.272 + g * 0.534 + b * 0.131;
                r = r * (1 - sepiaAmt) + sr * sepiaAmt;
                g = g * (1 - sepiaAmt) + sg * sepiaAmt;
                b = b * (1 - sepiaAmt) + sb * sepiaAmt;
            }

            // Film Grain
            if (grainAmt > 0) {
                const n = (Math.random() - 0.5) * grainAmt * 1.35;
                r += n; g += n; b += n;
            }

            d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
            d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
            d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        }

        // Jika pengguna memilih 3D LUT dari My LUTs
        if (currentState.activeCubeLutId) {
            const lutObj = myCubeLuts.find((l) => l.id === currentState.activeCubeLutId);
            if (lutObj) {
                window.applyCubeLUTToImageData(imgData, lutObj, pStr);
            }
        }
    }

    /**
     * Merender Efek Light Leaks & Film Burns (03 EFFECTS) menggunakan Screen Blending
     */
    function renderAnalogEffectsOverlay(targetCtx, w, h, effectId, strength = 0.75) {
        if (!effectId || effectId.startsWith('none') || strength <= 0) return;
        const eff = window.ANALOG_EFFECTS.find((e) => e.id === effectId);
        if (!eff || !eff.stops || !eff.stops.length) return;

        targetCtx.save();
        targetCtx.globalCompositeOperation = 'screen';
        targetCtx.globalAlpha = Math.min(1, Math.max(0, strength));

        let grad;
        if (eff.angle === 'top-left') {
            grad = targetCtx.createRadialGradient(0, 0, w * 0.05, 0, 0, Math.max(w, h) * 0.85);
        } else if (eff.angle === 'right-edge') {
            grad = targetCtx.createLinearGradient(w, h * 0.4, w * 0.2, h * 0.55);
        } else if (eff.angle === 'bottom-edge') {
            grad = targetCtx.createLinearGradient(w * 0.5, h, w * 0.5, h * 0.35);
        } else if (eff.angle === 'top-edge') {
            grad = targetCtx.createLinearGradient(w * 0.45, 0, w * 0.55, h * 0.65);
        } else if (eff.angle === 'left-violet') {
            grad = targetCtx.createLinearGradient(0, h * 0.6, w * 0.75, h * 0.3);
        } else if (eff.angle === 'corner-glow') {
            grad = targetCtx.createRadialGradient(w, 0, w * 0.02, w, 0, Math.max(w, h) * 0.9);
        } else if (eff.angle === 'double-side') {
            grad = targetCtx.createLinearGradient(0, 0, w, 0);
        } else if (eff.angle === 'bottom-right') {
            grad = targetCtx.createRadialGradient(w, h, w * 0.05, w, h, Math.max(w, h) * 0.85);
        } else {
            grad = targetCtx.createLinearGradient(0, 0, w, h);
        }

        eff.stops.forEach((s) => grad.addColorStop(s.pos, s.color));
        targetCtx.fillStyle = grad;
        targetCtx.fillRect(0, 0, w, h);
        targetCtx.restore();
    }

    function renderDustOverlay(targetCtx, w, h, dustId, strength = 0.5) {
        if (!dustId || dustId === 'none_dust' || strength <= 0) return;
        targetCtx.save();
        targetCtx.globalCompositeOperation = 'screen';
        targetCtx.fillStyle = `rgba(245, 238, 225, ${(strength * 0.55).toFixed(2)})`;
        targetCtx.strokeStyle = `rgba(245, 238, 225, ${(strength * 0.4).toFixed(2)})`;

        const count = dustId === 'dust_02' ? 95 : 42;
        for (let i = 0; i < count; i++) {
            // Posisi deterministik agar tidak berkedip saat digeser slider
            const px = ((i * 173 + 41) % 997) / 997 * w;
            const py = ((i * 317 + 83) % 991) / 991 * h;
            const pr = 1 + (i % 3) * 0.8;
            targetCtx.beginPath();
            targetCtx.arc(px, py, pr, 0, Math.PI * 2);
            targetCtx.fill();
        }

        if (dustId === 'dust_03') {
            targetCtx.lineWidth = 1.2;
            for (let s = 0; s < 5; s++) {
                const sx = ((s * 223 + 90) % 100) / 100 * w;
                targetCtx.beginPath();
                targetCtx.moveTo(sx, 0);
                targetCtx.lineTo(sx + (s % 2 === 0 ? 8 : -8), h);
                targetCtx.stroke();
            }
        }
        targetCtx.restore();
    }

    // ==========================================
    // 7. EDITOR UI TABS & LIVE THUMBNAIL STRIPS
    // ==========================================
    function switchEditorMainTab(tabName) {
        activeEditorMainTab = tabName;

        document.querySelectorAll('.ed-tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-edtab') === tabName);
        });

        document.querySelectorAll('.deck-panel').forEach((p) => p.classList.remove('active'));
        document.getElementById(`panel${tabName}`).classList.add('active');

        const masterSliderBlock = document.getElementById('masterSliderBlock');
        const gestureHint = document.getElementById('gestureHintText');

        // Matikan crop / brush jika pindah tab utama
        if (tabName !== 'Tools') {
            closeCropOverlay();
            magicWandActive = false;
            brushModeActive = false;
            mainCanvas.style.cursor = 'default';
        }

        if (tabName === 'Presets') {
            masterSliderBlock.classList.remove('hidden');
            gestureHint.textContent = 'HOLD PHOTO TO COMPARE · HOLD A PRESET TO FAVORITE';
            renderPresetsStrip();
            syncMasterSliderForPreset();
        } else if (tabName === 'Tools') {
            masterSliderBlock.classList.remove('hidden');
            gestureHint.textContent = 'HOLD TO COMPARE · DOUBLE-CLICK SLIDER TO RESET';
            renderToolsStrip();
            selectToolKey(activeToolKey);
        } else if (tabName === 'Effects') {
            masterSliderBlock.classList.remove('hidden');
            gestureHint.textContent = 'HOLD TO COMPARE · ADJUST ANALOG EFFECT STRENGTH';
            renderEffectsStrip();
            syncMasterSliderForEffect();
        } else if (tabName === 'Text') {
            masterSliderBlock.classList.add('hidden');
            gestureHint.textContent = 'DRAG TEXT ON PHOTO TO MOVE · SELECT FONT BELOW';
            renderTextTabUI();
        }
    }

    /**
     * Render Strip 01 PRESETS dengan Live Photo Preview di setiap kotak thumbnail!
     */
    function renderPresetsStrip() {
        const strip = document.getElementById('presetStrip');
        strip.innerHTML = '';

        // Jika sub-tab MY LUTS aktif, tampilkan semua 3D LUT (.cube)
        if (activePresetCat === 'myluts') {
            myCubeLuts.forEach((lut) => {
                const isSelected = state.activeCubeLutId === lut.id;
                const card = document.createElement('div');
                card.className = `thumb-card ${isSelected ? 'active' : ''}`;

                const c = document.createElement('canvas');
                c.width = 76;
                c.height = 76;
                const cCtx = c.getContext('2d');
                cCtx.drawImage(thumbGenCanvas, 0, 0, 76, 76);
                const idata = cCtx.getImageData(0, 0, 76, 76);
                window.applyCubeLUTToImageData(idata, lut, 1.0);
                cCtx.putImageData(idata, 0, 0);

                card.innerHTML = `<div class="thumb-box"></div><span class="thumb-label">${lut.title}</span>`;
                card.querySelector('.thumb-box').appendChild(c);

                card.addEventListener('click', () => selectCubeLutInEditor(lut.id));
                strip.appendChild(card);
            });

            // Tambahkan kartu "+ .CUBE" di ujung
            const addCard = document.createElement('div');
            addCard.className = 'thumb-card';
            addCard.innerHTML = `
                <div class="thumb-box" style="display:flex;align-items:center;justify-content:center;border:1px dashed #6e655c;color:#e7e2d8;font-size:1.3rem;">+</div>
                <span class="thumb-label">IMPORT .CUBE</span>
            `;
            addCard.addEventListener('click', () => document.getElementById('lutFileInput').click());
            strip.appendChild(addCard);
            return;
        }

        // Filter daftar preset berdasarkan kategori
        let list = [];
        if (activePresetCat === 'favorites') {
            list = window.FILM_PRESETS.filter((p) => p.id === 'original' || favoritePresetIds.has(p.id));
        } else {
            list = window.FILM_PRESETS.filter((p) => p.id === 'original' || p.category === activePresetCat);
        }

        list.forEach((preset) => {
            const isSelected = !state.activeCubeLutId && state.presetId === preset.id;
            const isFav = favoritePresetIds.has(preset.id);

            const card = document.createElement('div');
            card.className = `thumb-card ${isSelected ? 'active' : ''}`;

            const c = document.createElement('canvas');
            c.width = 76;
            c.height = 76;
            const cCtx = c.getContext('2d');
            cCtx.drawImage(thumbGenCanvas, 0, 0, 76, 76);

            if (preset.id !== 'original') {
                const idata = cCtx.getImageData(0, 0, 76, 76);
                const dummyState = createDefaultEditState();
                dummyState.presetId = preset.id;
                dummyState.presetStrength = 100;
                applyColorPipelineToImageData(idata, 76, 76, dummyState);
                cCtx.putImageData(idata, 0, 0);
            }

            const box = document.createElement('div');
            box.className = 'thumb-box';
            box.appendChild(c);

            if (preset.id !== 'original') {
                const star = document.createElement('span');
                star.className = `fav-star-badge ${isFav ? 'is-fav' : ''}`;
                star.textContent = isFav ? '★' : '☆';
                star.title = 'Klik untuk simpan ke ★ MY PRESETS';
                star.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavoritePreset(preset.id);
                });
                box.appendChild(star);
            }

            const lbl = document.createElement('span');
            lbl.className = 'thumb-label';
            lbl.textContent = preset.code;

            card.appendChild(box);
            card.appendChild(lbl);

            card.addEventListener('click', () => {
                state.activeCubeLutId = null;
                state.presetId = preset.id;
                syncMasterSliderForPreset();
                renderPresetsStrip();
                renderEditorCanvas();
                pushHistory(`Preset ${preset.code}`);
            });

            strip.appendChild(card);
        });
    }

    function selectCubeLutInEditor(lutId) {
        state.activeCubeLutId = lutId;
        syncMasterSliderForPreset();
        renderPresetsStrip();
        renderEditorCanvas();
        const lut = myCubeLuts.find((l) => l.id === lutId);
        if (lut) pushHistory(`3D LUT: ${lut.title}`);
    }

    function toggleFavoritePreset(presetId) {
        if (favoritePresetIds.has(presetId)) {
            favoritePresetIds.delete(presetId);
        } else {
            favoritePresetIds.add(presetId);
        }
        renderPresetsStrip();
    }

    function syncMasterSliderForPreset() {
        masterSliderMode = 'preset';
        const slider = document.getElementById('masterSlider');
        slider.min = 0;
        slider.max = 100;
        slider.value = state.presetStrength;

        if (state.activeCubeLutId) {
            const lut = myCubeLuts.find((l) => l.id === state.activeCubeLutId);
            document.getElementById('activeParamCategory').textContent = '3D LUT (.CUBE)';
            document.getElementById('activeParamTitle').textContent = lut ? lut.title : 'Custom LUT';
            document.getElementById('activeParamValue').textContent = state.presetStrength;
        } else {
            const preset = window.FILM_PRESETS.find((p) => p.id === state.presetId) || window.FILM_PRESETS[0];
            document.getElementById('activeParamCategory').textContent = preset.subLabel || 'FILM PRESET';
            document.getElementById('activeParamTitle').textContent = preset.name;
            document.getElementById('activeParamValue').textContent = preset.id === 'original' ? '' : state.presetStrength;
        }
    }

    /**
     * Render Strip 02 TOOLS dengan ikon geometris minimalis
     */
    function renderToolsStrip() {
        const strip = document.getElementById('toolsStrip');
        strip.innerHTML = '';

        const list = TOOLS_CONFIG.filter((t) => activeToolCat === 'all' || t.cat === activeToolCat);

        list.forEach((tool) => {
            const isSelected = activeToolKey === tool.key;
            const isModified = !tool.isAction && !tool.isContext && state.adjust[tool.key] !== 0;

            const btn = document.createElement('button');
            btn.className = `tool-icon-card ${isSelected ? 'active' : ''}`;
            btn.innerHTML = `
                ${isModified ? `<span class="tool-modified-dot"></span>` : ''}
                <div class="tool-svg-wrap">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        ${tool.icon}
                    </svg>
                </div>
                <span class="tool-name">${tool.name}</span>
            `;

            btn.addEventListener('click', () => handleToolClick(tool));
            strip.appendChild(btn);
        });
    }

    function handleToolClick(tool) {
        // Matikan mode khusus jika memilih tool lain
        if (tool.isContext !== 'crop') closeCropOverlay();
        if (tool.isContext !== 'wand') magicWandActive = false;
        if (tool.isContext !== 'brush') brushModeActive = false;
        mainCanvas.style.cursor = 'default';

        // Jika tool merupakan aksi instan (Rotate, Flip, AI Enhance, Bokeh, Glitch, Halation, Auto Hapus BG)
        if (tool.isAction) {
            executeInstantToolAction(tool.key);
            return;
        }

        // Jika tool membuka sub-bar kontekstual (Crop, Magic Wand, Warna Latar, Brush)
        if (tool.isContext) {
            activeToolKey = tool.key;
            renderToolsStrip();
            openToolContextBar(tool.isContext, tool.name);
            return;
        }

        // Tool berbasis slider normal
        document.getElementById('toolContextExtras').classList.add('hidden');
        selectToolKey(tool.key);
    }

    function selectToolKey(key) {
        const tool = TOOLS_CONFIG.find((t) => t.key === key) || TOOLS_CONFIG[0];
        activeToolKey = tool.key;
        masterSliderMode = 'tool';

        const val = state.adjust[tool.key] ?? 0;
        const slider = document.getElementById('masterSlider');
        slider.min = tool.min;
        slider.max = tool.max;
        slider.value = val;

        document.getElementById('activeParamCategory').textContent = 'ADJUST';
        document.getElementById('activeParamTitle').textContent = tool.name;
        document.getElementById('activeParamValue').textContent = val;

        renderToolsStrip();
    }

    function executeInstantToolAction(actionKey) {
        if (actionKey === 'action_rot_left') {
            rotateBaseCanvas(-1);
        } else if (actionKey === 'action_rot_right') {
            rotateBaseCanvas(1);
        } else if (actionKey === 'action_flip_h') {
            state.flipH = !state.flipH;
        } else if (actionKey === 'action_flip_v') {
            state.flipV = !state.flipV;
        } else if (actionKey === 'action_ai_enhance') {
            state.adjust.exposure = 6;
            state.adjust.contrast = 15;
            state.adjust.highlights = -12;
            state.adjust.shadows = 18;
            state.adjust.vibrance = 22;
            state.adjust.sharpness = 16;
            selectToolKey('exposure');
        } else if (actionKey === 'action_auto_bg') {
            window.AITools.autoRemoveBackground(basePhotoCanvas, 34, 16);
        } else if (actionKey === 'action_halation') {
            window.AITools.applyFilmHalation(basePhotoCanvas);
        } else if (actionKey === 'action_bokeh') {
            window.AITools.applyPortraitBokeh(basePhotoCanvas);
        } else if (actionKey === 'action_glitch') {
            window.AITools.applyChromaticGlitch(basePhotoCanvas, 9);
        }

        renderEditorCanvas();
        renderToolsStrip();
        pushHistory(actionKey.replace('action_', '').toUpperCase());
    }

    function openToolContextBar(contextType, title) {
        const bar = document.getElementById('toolContextExtras');
        bar.classList.remove('hidden');
        bar.innerHTML = '';

        document.getElementById('activeParamCategory').textContent = 'STUDIO TOOL';
        document.getElementById('activeParamTitle').textContent = title;
        document.getElementById('activeParamValue').textContent = '';

        if (contextType === 'crop') {
            openCropOverlay();
            const ratios = ['free', '1:1', '4:5', '9:16', '16:9'];
            ratios.forEach((r) => {
                const chip = document.createElement('button');
                chip.className = `dark-chip ${cropRatio === r ? 'active' : ''}`;
                chip.textContent = r.toUpperCase();
                chip.addEventListener('click', () => {
                    cropRatio = r;
                    initCropBoxRect();
                    openToolContextBar('crop', 'Crop');
                });
                bar.appendChild(chip);
            });

            const applyBtn = document.createElement('button');
            applyBtn.className = 'dark-chip active';
            applyBtn.textContent = '✓ TERAPKAN CROP';
            applyBtn.addEventListener('click', applyCropSelection);
            bar.appendChild(applyBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'dark-chip';
            cancelBtn.textContent = '✕ BATAL';
            cancelBtn.addEventListener('click', () => {
                closeCropOverlay();
                bar.classList.add('hidden');
            });
            bar.appendChild(cancelBtn);
        } else if (contextType === 'wand') {
            magicWandActive = true;
            mainCanvas.style.cursor = 'crosshair';
            document.getElementById('gestureHintText').textContent = 'KLIK WARNA BACKGROUND DI FOTO UNTUK MENGHAPUSNYA';
            const autoBtn = document.createElement('button');
            autoBtn.className = 'dark-chip active';
            autoBtn.textContent = '✨ AUTO HAPUS TEPI';
            autoBtn.addEventListener('click', () => {
                window.AITools.autoRemoveBackground(basePhotoCanvas, 34, 16);
                renderEditorCanvas();
                pushHistory('Auto Remove BG');
            });
            bar.appendChild(autoBtn);
        } else if (contextType === 'bgcolor') {
            const colors = [
                { label: 'TRANSPARENT', val: 'transparent' },
                { label: 'CREAM', val: '#f4f1ea' },
                { label: 'WHITE', val: '#ffffff' },
                { label: 'BLACK', val: '#141210' },
                { label: 'PAS FOTO MERAH', val: '#dc2626' },
                { label: 'PAS FOTO BIRU', val: '#2563eb' }
            ];
            colors.forEach((c) => {
                const chip = document.createElement('button');
                chip.className = `dark-chip ${state.bgReplaceColor === c.val ? 'active' : ''}`;
                chip.textContent = c.label;
                chip.addEventListener('click', () => {
                    state.bgReplaceColor = c.val;
                    renderEditorCanvas();
                    openToolContextBar('bgcolor', 'Warna Latar');
                });
                bar.appendChild(chip);
            });
        } else if (contextType === 'brush') {
            brushModeActive = true;
            mainCanvas.style.cursor = 'crosshair';
            document.getElementById('gestureHintText').textContent = 'CORET LANGSUNG DI ATAS FOTO UNTUK MENGGAMBAR';

            [
                { id: 'solid', label: 'SOLID PEN' },
                { id: 'neon', label: 'NEON GLOW' },
                { id: 'eraser', label: 'ERASER' }
            ].forEach((m) => {
                const chip = document.createElement('button');
                chip.className = `dark-chip ${brushStyle === m.id ? 'active' : ''}`;
                chip.textContent = m.label;
                chip.addEventListener('click', () => {
                    brushStyle = m.id;
                    openToolContextBar('brush', 'Brush Doodle');
                });
                bar.appendChild(chip);
            });

            ['#ffffff', '#f43f5e', '#fbbf24', '#38bdf8', '#1c1917'].forEach((col) => {
                const dot = document.createElement('button');
                dot.className = `color-dot ${brushColor === col ? 'active' : ''}`;
                dot.style.background = col;
                dot.style.flexShrink = '0';
                dot.addEventListener('click', () => {
                    brushColor = col;
                    openToolContextBar('brush', 'Brush Doodle');
                });
                bar.appendChild(dot);
            });

            const clearBtn = document.createElement('button');
            clearBtn.className = 'dark-chip';
            clearBtn.textContent = 'CLEAR BRUSH';
            clearBtn.addEventListener('click', () => {
                brushCtx.clearRect(0, 0, brushCanvas.width, brushCanvas.height);
                renderEditorCanvas();
            });
            bar.appendChild(clearBtn);
        }
    }

    /**
     * Render Strip 03 EFFECTS (Light Leaks, Film Burns, Vintage Dust, Date Stamps)
     * Persis seperti Screenshot 5 (Light Leak 01..05 dengan preview langsung di atas awan/foto!)
     */
    function renderEffectsStrip() {
        const strip = document.getElementById('effectsStrip');
        strip.innerHTML = '';

        if (activeEffectCat === 'stamps') {
            const stamps = [
                { label: "'98 DATE", text: "'98 11 14", font: "'Space Mono', monospace", color: '#ff7b00' },
                { label: 'KODAK 400', text: '→ 24A  KODAK PORTRA 400', font: "'Space Mono', monospace", color: '#f59e0b' },
                { label: 'SPARKLE ✨', text: '✨', font: 'sans-serif', color: '#ffffff' },
                { label: 'FILM 🎞️', text: '🎞️', font: 'sans-serif', color: '#ffffff' },
                { label: 'HEART 🤍', text: '🤍', font: 'sans-serif', color: '#ffffff' }
            ];
            stamps.forEach((s) => {
                const card = document.createElement('div');
                card.className = 'thumb-card';
                card.innerHTML = `
                    <div class="thumb-box" style="display:flex;align-items:center;justify-content:center;color:${s.color};font-family:${s.font};font-size:0.75rem;text-align:center;padding:6px;">
                        ${s.text.slice(0, 10)}
                    </div>
                    <span class="thumb-label">${s.label}</span>
                `;
                card.addEventListener('click', () => {
                    addTextLayerToPhoto(s.text, s.font, s.label, s.color, basePhotoCanvas.width * 0.72, basePhotoCanvas.height * 0.88);
                });
                strip.appendChild(card);
            });
            return;
        }

        const list = window.ANALOG_EFFECTS.filter((e) => e.category === activeEffectCat);

        list.forEach((eff) => {
            const isSelected =
                activeEffectCat === 'dust' ? state.dustId === eff.id : state.effectId === eff.id;

            const card = document.createElement('div');
            card.className = `thumb-card ${isSelected ? 'active' : ''}`;

            const c = document.createElement('canvas');
            c.width = 76;
            c.height = 76;
            const cCtx = c.getContext('2d');
            cCtx.drawImage(thumbGenCanvas, 0, 0, 76, 76);

            if (activeEffectCat === 'dust') {
                renderDustOverlay(cCtx, 76, 76, eff.id, 0.85);
            } else {
                renderAnalogEffectsOverlay(cCtx, 76, 76, eff.id, 0.9);
            }

            card.innerHTML = `<div class="thumb-box"></div><span class="thumb-label">${eff.code}</span>`;
            card.querySelector('.thumb-box').appendChild(c);

            card.addEventListener('click', () => {
                if (activeEffectCat === 'dust') {
                    state.dustId = eff.id;
                } else {
                    state.effectId = eff.id;
                }
                syncMasterSliderForEffect();
                renderEffectsStrip();
                renderEditorCanvas();
                pushHistory(eff.name);
            });

            strip.appendChild(card);
        });
    }

    function syncMasterSliderForEffect() {
        masterSliderMode = 'effect';
        const slider = document.getElementById('masterSlider');
        slider.min = 0;
        slider.max = 100;

        if (activeEffectCat === 'dust') {
            const eff = window.ANALOG_EFFECTS.find((e) => e.id === state.dustId) || window.ANALOG_EFFECTS[0];
            slider.value = state.dustStrength;
            document.getElementById('activeParamCategory').textContent = 'STRENGTH';
            document.getElementById('activeParamTitle').textContent = eff.name;
            document.getElementById('activeParamValue').textContent = state.dustStrength;
        } else {
            const eff = window.ANALOG_EFFECTS.find((e) => e.id === state.effectId) || window.ANALOG_EFFECTS[0];
            slider.value = state.effectStrength;
            document.getElementById('activeParamCategory').textContent = 'STRENGTH';
            document.getElementById('activeParamTitle').textContent = eff.name;
            document.getElementById('activeParamValue').textContent = state.effectStrength;
        }
    }

    // ==========================================
    // 8. PANEL 04: TEXT ("Rearrange the light" UI)
    // ==========================================
    function renderTextTabUI() {
        const pillsRow = document.getElementById('textPillsRow');
        pillsRow.innerHTML = '';

        state.texts.forEach((t, idx) => {
            const num = String(idx + 1).padStart(2, '0');
            const pill = document.createElement('button');
            pill.className = `text-layer-pill ${t.id === state.selectedTextId ? 'active' : ''}`;
            pill.textContent = `${num} ${t.text.slice(0, 20) || 'Text'}`;
            pill.addEventListener('click', () => {
                state.selectedTextId = t.id;
                renderTextTabUI();
                renderEditorCanvas();
            });
            pillsRow.appendChild(pill);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-dashed-add';
        addBtn.textContent = '+ Add text';
        addBtn.addEventListener('click', () => {
            addTextLayerToPhoto('Rearrange the light', "'DM Serif Display', serif", 'DM SERIF DISPLAY', '#ffffff');
        });
        pillsRow.appendChild(addBtn);

        const activeText = state.texts.find((t) => t.id === state.selectedTextId);
        const controls = document.getElementById('textEditorControls');
        const delBtn = document.getElementById('btnDeleteTextItem');

        if (!activeText) {
            document.getElementById('activeFontLabel').textContent = 'ADD A LINE OF TEXT';
            document.getElementById('activeTextHeading').textContent = 'Text';
            controls.classList.add('hidden');
            delBtn.classList.add('hidden');
            return;
        }

        controls.classList.remove('hidden');
        delBtn.classList.remove('hidden');

        document.getElementById('activeFontLabel').textContent = activeText.fontName || 'EDITORIAL FONT';
        document.getElementById('activeTextHeading').textContent = activeText.text || 'Text';
        document.getElementById('textLiveInput').value = activeText.text;

        document.getElementById('sliderTextSize').value = activeText.size;
        document.getElementById('valTextSize').textContent = activeText.size;
        document.getElementById('sliderTextOpacity').value = activeText.opacity ?? 100;
        document.getElementById('valTextOpacity').textContent = `${activeText.opacity ?? 100}%`;
        document.getElementById('sliderTextRotate').value = activeText.rotate ?? 0;
        document.getElementById('valTextRotate').textContent = `${activeText.rotate ?? 0}°`;

        document.getElementById('btnToggleBold').classList.toggle('active', !!activeText.bold);
        document.getElementById('btnToggleItalic').classList.toggle('active', !!activeText.italic);
        document.getElementById('btnToggleShadow').classList.toggle('active', !!activeText.shadow);
        document.getElementById('btnToggleOutline').classList.toggle('active', !!activeText.outline);

        renderFontCardsStrip(activeText);
    }

    function renderFontCardsStrip(activeText) {
        const strip = document.getElementById('fontCardsStrip');
        strip.innerHTML = '';

        // Kartu "+ ADD FONT" persis seperti Screenshot 4
        const addFontCard = document.createElement('button');
        addFontCard.className = 'font-card dashed';
        addFontCard.innerHTML = `
            <span class="font-card-sample">+</span>
            <span class="font-card-name">ADD FONT</span>
        `;
        addFontCard.addEventListener('click', () => {
            document.getElementById('customFontInput').click();
        });
        strip.appendChild(addFontCard);

        customFontsList.forEach((f) => {
            const isSelected = activeText && activeText.font === f.family;
            const card = document.createElement('button');
            card.className = `font-card ${isSelected ? 'active' : ''}`;
            card.innerHTML = `
                <span class="font-card-sample" style="font-family:${f.family}">${f.sample}</span>
                <span class="font-card-name">${f.name}</span>
            `;
            card.addEventListener('click', () => {
                if (!activeText) return;
                activeText.font = f.family;
                activeText.fontName = f.name;
                renderTextTabUI();
                renderEditorCanvas();
            });
            strip.appendChild(card);
        });
    }

    function addTextLayerToPhoto(textStr, fontFamily, fontName, color = '#ffffff', customX = null, customY = null) {
        const newLayer = {
            id: 'txt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
            text: textStr,
            x: customX ?? basePhotoCanvas.width / 2,
            y: customY ?? basePhotoCanvas.height * 0.42,
            font: fontFamily,
            fontName: fontName,
            size: Math.max(36, Math.round(basePhotoCanvas.width * 0.055)),
            color: color,
            opacity: 100,
            rotate: 0,
            bold: false,
            italic: false,
            shadow: true,
            outline: false,
            align: 'center'
        };
        state.texts.push(newLayer);
        state.selectedTextId = newLayer.id;
        if (activeEditorMainTab === 'Text') renderTextTabUI();
        renderEditorCanvas();
        pushHistory(`Text: ${textStr.slice(0, 12)}`);
    }

    // ==========================================
    // 9. EDITOR EVENT BINDINGS & GESTURES
    // ==========================================
    function bindEditorEvents() {
        // Back to Library
        document.getElementById('btnBackToLibrary').addEventListener('click', () => {
            saveCurrentPhotoBackToLibrary();
            switchStudioView('viewLibrary');
        });

        // Bottom Primary Editor Tabs (01 PRESETS | 02 TOOLS | 03 EFFECTS | 04 TEXT)
        document.querySelectorAll('.ed-tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                switchEditorMainTab(btn.getAttribute('data-edtab'));
            });
        });

        // Sub-categories under 01 PRESETS
        document.querySelectorAll('#presetCatBar .subcat-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#presetCatBar .subcat-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                activePresetCat = btn.getAttribute('data-pcat');
                renderPresetsStrip();
            });
        });

        // Sub-categories under 02 TOOLS
        document.querySelectorAll('#toolCatBar .subcat-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#toolCatBar .subcat-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                activeToolCat = btn.getAttribute('data-tcat');
                renderToolsStrip();
            });
        });

        // Sub-categories under 03 EFFECTS
        document.querySelectorAll('#effectCatBar .subcat-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#effectCatBar .subcat-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                activeEffectCat = btn.getAttribute('data-ecat');
                renderEffectsStrip();
                syncMasterSliderForEffect();
            });
        });

        // Master Slider Input & Double-Click Reset
        const masterSlider = document.getElementById('masterSlider');
        masterSlider.addEventListener('input', () => {
            const val = parseInt(masterSlider.value, 10);
            document.getElementById('activeParamValue').textContent = val;

            if (masterSliderMode === 'preset') {
                state.presetStrength = val;
            } else if (masterSliderMode === 'tool') {
                state.adjust[activeToolKey] = val;
                renderToolsStrip();
            } else if (masterSliderMode === 'effect') {
                if (activeEffectCat === 'dust') state.dustStrength = val;
                else state.effectStrength = val;
            }
            renderEditorCanvas();
        });

        masterSlider.addEventListener('change', () => {
            pushHistory(`Adjust ${document.getElementById('activeParamTitle').textContent}`);
        });

        masterSlider.addEventListener('dblclick', () => {
            if (masterSliderMode === 'preset') {
                state.presetStrength = 100;
                masterSlider.value = 100;
            } else if (masterSliderMode === 'tool') {
                state.adjust[activeToolKey] = 0;
                masterSlider.value = 0;
                renderToolsStrip();
            } else if (masterSliderMode === 'effect') {
                state.effectStrength = 75;
                masterSlider.value = 75;
            }
            document.getElementById('activeParamValue').textContent = masterSlider.value;
            renderEditorCanvas();
        });

        // Text Editor Controls
        const textLiveInput = document.getElementById('textLiveInput');
        textLiveInput.addEventListener('input', () => {
            const t = state.texts.find((item) => item.id === state.selectedTextId);
            if (!t) return;
            t.text = textLiveInput.value;
            document.getElementById('activeTextHeading').textContent = t.text || 'Text';
            renderEditorCanvas();
        });

        document.getElementById('btnDeleteTextItem').addEventListener('click', () => {
            if (!state.selectedTextId) return;
            state.texts = state.texts.filter((t) => t.id !== state.selectedTextId);
            state.selectedTextId = state.texts[0]?.id || null;
            renderTextTabUI();
            renderEditorCanvas();
            pushHistory('Delete Text');
        });

        document.querySelectorAll('#textSubTabBar .subcat-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#textSubTabBar .subcat-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.getAttribute('data-txttab');
                document.querySelectorAll('.text-sub-panel').forEach((p) => p.classList.remove('active'));
                const map = { font: 'textSubFont', style: 'textSubStyle', color: 'textSubColor', align: 'textSubAlign' };
                document.getElementById(map[tab]).classList.add('active');
            });
        });

        document.getElementById('sliderTextSize').addEventListener('input', (e) => {
            const t = state.texts.find((item) => item.id === state.selectedTextId);
            if (!t) return;
            t.size = parseInt(e.target.value, 10);
            document.getElementById('valTextSize').textContent = t.size;
            renderEditorCanvas();
        });

        document.getElementById('sliderTextOpacity').addEventListener('input', (e) => {
            const t = state.texts.find((item) => item.id === state.selectedTextId);
            if (!t) return;
            t.opacity = parseInt(e.target.value, 10);
            document.getElementById('valTextOpacity').textContent = `${t.opacity}%`;
            renderEditorCanvas();
        });

        document.getElementById('sliderTextRotate').addEventListener('input', (e) => {
            const t = state.texts.find((item) => item.id === state.selectedTextId);
            if (!t) return;
            t.rotate = parseInt(e.target.value, 10);
            document.getElementById('valTextRotate').textContent = `${t.rotate}°`;
            renderEditorCanvas();
        });

        [
            ['btnToggleBold', 'bold'],
            ['btnToggleItalic', 'italic'],
            ['btnToggleShadow', 'shadow'],
            ['btnToggleOutline', 'outline']
        ].forEach(([id, prop]) => {
            document.getElementById(id).addEventListener('click', (e) => {
                const t = state.texts.find((item) => item.id === state.selectedTextId);
                if (!t) return;
                t[prop] = !t[prop];
                e.currentTarget.classList.toggle('active', t[prop]);
                renderEditorCanvas();
            });
        });

        document.querySelectorAll('#textColorStrip .color-dot').forEach((dot) => {
            dot.addEventListener('click', () => {
                const t = state.texts.find((item) => item.id === state.selectedTextId);
                if (!t) return;
                document.querySelectorAll('#textColorStrip .color-dot').forEach((d) => d.classList.remove('active'));
                dot.classList.add('active');
                t.color = dot.getAttribute('data-color');
                renderEditorCanvas();
            });
        });

        document.getElementById('customTextColorPicker').addEventListener('input', (e) => {
            const t = state.texts.find((item) => item.id === state.selectedTextId);
            if (!t) return;
            t.color = e.target.value;
            renderEditorCanvas();
        });

        document.querySelectorAll('.align-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const t = state.texts.find((item) => item.id === state.selectedTextId);
                if (!t) return;
                document.querySelectorAll('.align-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                t.align = btn.getAttribute('data-align');
                renderEditorCanvas();
            });
        });

        document.getElementById('btnCenterOnCanvas').addEventListener('click', () => {
            const t = state.texts.find((item) => item.id === state.selectedTextId);
            if (!t) return;
            t.x = basePhotoCanvas.width / 2;
            t.y = basePhotoCanvas.height / 2;
            renderEditorCanvas();
        });

        document.getElementById('btnAdd90sDate').addEventListener('click', () => {
            addTextLayerToPhoto("'98 11 14", "'Space Mono', monospace", 'SPACE MONO', '#ff7b00', basePhotoCanvas.width * 0.78, basePhotoCanvas.height * 0.9);
        });

        // Custom Font Upload (.ttf / .otf / .woff)
        document.getElementById('customFontInput').addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const fontNameClean = file.name.replace(/\.[^.]+$/, '').toUpperCase();
                const fontFamilyId = 'CustomFont_' + Date.now();
                const buf = await file.arrayBuffer();
                const fontFace = new FontFace(fontFamilyId, buf);
                await fontFace.load();
                document.fonts.add(fontFace);

                const newFontEntry = {
                    id: fontFamilyId,
                    name: fontNameClean,
                    sample: 'Aa',
                    family: `'${fontFamilyId}', sans-serif`
                };
                customFontsList.unshift(newFontEntry);

                const activeText = state.texts.find((t) => t.id === state.selectedTextId);
                if (activeText) {
                    activeText.font = newFontEntry.family;
                    activeText.fontName = newFontEntry.name;
                }
                renderTextTabUI();
                renderEditorCanvas();
            } catch (err) {
                alert('Gagal memuat file font: ' + err.message);
            }
            e.target.value = '';
        });

        // Canvas Pointer Interaction (Drag Text, Magic Wand, Brush, or Hold Photo to Compare)
        bindCanvasGestures();

        // Crop Box Dragging
        bindCropDragEvents();

        // Undo / Redo / Reset
        document.getElementById('btnUndo').addEventListener('click', undo);
        document.getElementById('btnRedo').addEventListener('click', redo);
        document.getElementById('btnResetPhoto').addEventListener('click', () => {
            const photo = libraryPhotos.find((p) => p.id === currentPhotoId);
            if (!photo) return;
            basePhotoCanvas.width = photo.originalCanvas.width;
            basePhotoCanvas.height = photo.originalCanvas.height;
            basePhotoCtx.drawImage(photo.originalCanvas, 0, 0);
            brushCtx.clearRect(0, 0, brushCanvas.width, brushCanvas.height);
            state = createDefaultEditState();
            switchEditorMainTab(activeEditorMainTab);
            renderEditorCanvas();
            pushHistory('Reset All');
        });

        // Export Modal
        bindExportModalEvents();
    }

    function getCanvasPt(e) {
        const rect = mainCanvas.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: ((cx - rect.left) / rect.width) * mainCanvas.width,
            y: ((cy - rect.top) / rect.height) * mainCanvas.height
        };
    }

    function bindCanvasGestures() {
        const startPointer = (e) => {
            if (isCropping) return;
            const pt = getCanvasPt(e);

            // 1. Magic Wand BG Removal
            if (magicWandActive) {
                window.AITools.removeBackgroundAtPoint(basePhotoCanvas, pt.x, pt.y, 34, 16, true);
                renderEditorCanvas();
                pushHistory('Magic Wand BG');
                return;
            }

            // 2. Brush Drawing
            if (brushModeActive) {
                brushDrawing = true;
                lastBrushPt = pt;
                strokeBrushLine(pt, pt);
                renderEditorCanvas();
                return;
            }

            // 3. Cek apakah mengklik layer Teks di atas foto
            for (let i = state.texts.length - 1; i >= 0; i--) {
                const t = state.texts[i];
                ctx.font = `${t.bold ? '700' : '400'} ${t.size}px ${t.font}`;
                const tw = Math.max(80, ctx.measureText(t.text).width + 36);
                const th = t.size * 1.45;
                if (
                    pt.x >= t.x - tw / 2 &&
                    pt.x <= t.x + tw / 2 &&
                    pt.y >= t.y - th / 2 &&
                    pt.y <= t.y + th / 2
                ) {
                    state.selectedTextId = t.id;
                    isDraggingText = true;
                    dragTextOffset = { x: pt.x - t.x, y: pt.y - t.y };
                    if (activeEditorMainTab === 'Text') renderTextTabUI();
                    renderEditorCanvas();
                    return;
                }
            }

            // 4. Jika tidak mengenai teks, aktifkan "Hold the photo to see original"
            isHoldingCompare = true;
            renderEditorCanvas();
        };

        const movePointer = (e) => {
            if (brushDrawing && brushModeActive) {
                const pt = getCanvasPt(e);
                strokeBrushLine(lastBrushPt, pt);
                lastBrushPt = pt;
                renderEditorCanvas();
                return;
            }
            if (isDraggingText && state.selectedTextId) {
                const pt = getCanvasPt(e);
                const t = state.texts.find((item) => item.id === state.selectedTextId);
                if (t) {
                    t.x = pt.x - dragTextOffset.x;
                    t.y = pt.y - dragTextOffset.y;
                    renderEditorCanvas();
                }
            }
        };

        const endPointer = () => {
            if (isHoldingCompare) {
                isHoldingCompare = false;
                renderEditorCanvas();
            }
            if (brushDrawing) {
                brushDrawing = false;
                pushHistory('Brush Doodle');
            }
            if (isDraggingText) {
                isDraggingText = false;
                pushHistory('Move Text');
            }
        };

        mainCanvas.addEventListener('mousedown', startPointer);
        mainCanvas.addEventListener('touchstart', startPointer, { passive: true });
        window.addEventListener('mousemove', movePointer);
        window.addEventListener('touchmove', movePointer, { passive: true });
        window.addEventListener('mouseup', endPointer);
        window.addEventListener('touchend', endPointer);
    }

    function strokeBrushLine(from, to) {
        brushCtx.save();
        brushCtx.lineCap = 'round';
        brushCtx.lineJoin = 'round';
        brushCtx.lineWidth = brushSize;

        if (brushStyle === 'eraser') {
            brushCtx.globalCompositeOperation = 'destination-out';
            brushCtx.strokeStyle = 'rgba(0,0,0,1)';
        } else if (brushStyle === 'neon') {
            brushCtx.globalCompositeOperation = 'source-over';
            brushCtx.shadowColor = brushColor;
            brushCtx.shadowBlur = 18;
            brushCtx.strokeStyle = '#ffffff';
        } else {
            brushCtx.globalCompositeOperation = 'source-over';
            brushCtx.strokeStyle = brushColor;
        }

        brushCtx.beginPath();
        brushCtx.moveTo(from.x, from.y);
        brushCtx.lineTo(to.x, to.y);
        brushCtx.stroke();
        brushCtx.restore();
    }

    // ==========================================
    // 10. CROP & GEOMETRY HELPERS
    // ==========================================
    function openCropOverlay() {
        isCropping = true;
        document.getElementById('cropOverlay').classList.remove('hidden');
        initCropBoxRect();
    }

    function closeCropOverlay() {
        isCropping = false;
        document.getElementById('cropOverlay').classList.add('hidden');
    }

    function initCropBoxRect() {
        const dw = mainCanvas.clientWidth;
        const dh = mainCanvas.clientHeight;
        let w = dw * 0.82;
        let h = dh * 0.82;

        if (cropRatio !== 'free') {
            const [rw, rh] = cropRatio.split(':').map(Number);
            const target = rw / rh;
            if (w / h > target) w = h * target;
            else h = w / target;
        }

        cropRect = { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
        updateCropBoxDOM();
    }

    function updateCropBoxDOM() {
        const box = document.getElementById('cropBox');
        box.style.left = `${cropRect.x}px`;
        box.style.top = `${cropRect.y}px`;
        box.style.width = `${cropRect.w}px`;
        box.style.height = `${cropRect.h}px`;
    }

    function bindCropDragEvents() {
        const cropBox = document.getElementById('cropBox');
        const overlay = document.getElementById('cropOverlay');

        cropBox.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            cropDragMode = e.target.getAttribute('data-handle') || 'move';
            cropDragStart = { mx: e.clientX, my: e.clientY, rect: { ...cropRect } };
        });

        window.addEventListener('mousemove', (e) => {
            if (!isCropping || !cropDragMode) return;
            const bounds = overlay.getBoundingClientRect();
            const dx = e.clientX - cropDragStart.mx;
            const dy = e.clientY - cropDragStart.my;
            const maxW = bounds.width;
            const maxH = bounds.height;
            const r = { ...cropDragStart.rect };

            if (cropDragMode === 'move') {
                r.x = Math.max(0, Math.min(maxW - r.w, r.x + dx));
                r.y = Math.max(0, Math.min(maxH - r.h, r.y + dy));
            } else {
                if (cropDragMode.includes('e')) r.w = Math.max(40, Math.min(maxW - r.x, r.w + dx));
                if (cropDragMode.includes('s')) r.h = Math.max(40, Math.min(maxH - r.y, r.h + dy));
                if (cropDragMode.includes('w')) {
                    const nw = Math.max(40, r.w - dx);
                    r.x += r.w - nw;
                    r.w = nw;
                }
                if (cropDragMode.includes('n')) {
                    const nh = Math.max(40, r.h - dy);
                    r.y += r.h - nh;
                    r.h = nh;
                }
                if (cropRatio !== 'free') {
                    const [rw, rh] = cropRatio.split(':').map(Number);
                    r.h = r.w / (rw / rh);
                }
            }
            cropRect = r;
            updateCropBoxDOM();
        });

        window.addEventListener('mouseup', () => {
            cropDragMode = null;
        });
    }

    function applyCropSelection() {
        const sx = Math.max(0, Math.round((cropRect.x / mainCanvas.clientWidth) * basePhotoCanvas.width));
        const sy = Math.max(0, Math.round((cropRect.y / mainCanvas.clientHeight) * basePhotoCanvas.height));
        const sw = Math.min(basePhotoCanvas.width - sx, Math.round((cropRect.w / mainCanvas.clientWidth) * basePhotoCanvas.width));
        const sh = Math.min(basePhotoCanvas.height - sy, Math.round((cropRect.h / mainCanvas.clientHeight) * basePhotoCanvas.height));

        if (sw > 20 && sh > 20) {
            const tmpB = createBlankCanvas(sw, sh);
            tmpB.getContext('2d').drawImage(basePhotoCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
            basePhotoCanvas.width = sw;
            basePhotoCanvas.height = sh;
            basePhotoCtx.drawImage(tmpB, 0, 0);

            const tmpBr = createBlankCanvas(sw, sh);
            tmpBr.getContext('2d').drawImage(brushCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
            brushCanvas.width = sw;
            brushCanvas.height = sh;
            brushCtx.drawImage(tmpBr, 0, 0);

            state.texts.forEach((t) => {
                t.x -= sx;
                t.y -= sy;
            });
        }
        closeCropOverlay();
        document.getElementById('toolContextExtras').classList.add('hidden');
        renderEditorCanvas();
        pushHistory('Crop Photo');
    }

    function rotateBaseCanvas(dir) {
        const ow = basePhotoCanvas.width;
        const oh = basePhotoCanvas.height;
        const nw = oh;
        const nh = ow;

        const rot = (src) => {
            const c = createBlankCanvas(nw, nh);
            const cCtx = c.getContext('2d');
            cCtx.translate(nw / 2, nh / 2);
            cCtx.rotate((dir * Math.PI) / 2);
            cCtx.drawImage(src, -ow / 2, -oh / 2);
            return c;
        };

        const rb = rot(basePhotoCanvas);
        const rbr = rot(brushCanvas);

        basePhotoCanvas.width = nw;
        basePhotoCanvas.height = nh;
        basePhotoCtx.drawImage(rb, 0, 0);

        brushCanvas.width = nw;
        brushCanvas.height = nh;
        brushCtx.drawImage(rbr, 0, 0);
    }

    // ==========================================
    // 11. HISTORY (UNDO / REDO) & EXPORT
    // ==========================================
    function pushHistory(label) {
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }
        historyStack.push({
            label,
            stateSnap: JSON.parse(JSON.stringify(state)),
            baseUrl: basePhotoCanvas.toDataURL('image/png'),
            brushUrl: brushCanvas.toDataURL('image/png'),
            w: basePhotoCanvas.width,
            h: basePhotoCanvas.height
        });
        if (historyStack.length > 18) historyStack.shift();
        historyIndex = historyStack.length - 1;
        updateHistoryBtns();
    }

    function restoreHistory(idx) {
        if (idx < 0 || idx >= historyStack.length) return;
        historyIndex = idx;
        const snap = historyStack[historyIndex];
        state = JSON.parse(JSON.stringify(snap.stateSnap));

        const img1 = new Image();
        const img2 = new Image();
        let count = 0;
        const done = () => {
            count++;
            if (count < 2) return;
            basePhotoCanvas.width = snap.w;
            basePhotoCanvas.height = snap.h;
            basePhotoCtx.drawImage(img1, 0, 0);

            brushCanvas.width = snap.w;
            brushCanvas.height = snap.h;
            brushCtx.drawImage(img2, 0, 0);

            switchEditorMainTab(activeEditorMainTab);
            renderEditorCanvas();
            updateHistoryBtns();
        };
        img1.onload = done;
        img2.onload = done;
        img1.src = snap.baseUrl;
        img2.src = snap.brushUrl;
    }

    function undo() {
        if (historyIndex > 0) restoreHistory(historyIndex - 1);
    }

    function redo() {
        if (historyIndex < historyStack.length - 1) restoreHistory(historyIndex + 1);
    }

    function updateHistoryBtns() {
        document.getElementById('btnUndo').disabled = historyIndex <= 0;
        document.getElementById('btnRedo').disabled = historyIndex >= historyStack.length - 1;
    }

    function bindExportModalEvents() {
        const modal = document.getElementById('exportModal');
        const qSlider = document.getElementById('exportQuality');

        document.getElementById('btnOpenExport').addEventListener('click', () => {
            state.selectedTextId = null;
            renderEditorCanvas();
            modal.classList.remove('hidden');
        });

        document.getElementById('btnCloseExportModal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        qSlider.addEventListener('input', () => {
            document.getElementById('valExportQuality').textContent = `${qSlider.value}%`;
        });

        document.getElementById('btnDownloadNow').addEventListener('click', () => {
            const fname = document.getElementById('exportFileName').value.trim() || 'svnlens-edit';
            const fmt = document.getElementById('exportFormat').value;
            const qual = parseInt(qSlider.value, 10) / 100;
            const ext = fmt === 'image/png' ? 'png' : fmt === 'image/webp' ? 'webp' : 'jpg';

            const out = createBlankCanvas(mainCanvas.width, mainCanvas.height);
            const oCtx = out.getContext('2d');
            if (fmt === 'image/jpeg') {
                oCtx.fillStyle = '#f4f1ea';
                oCtx.fillRect(0, 0, out.width, out.height);
            }
            oCtx.drawImage(mainCanvas, 0, 0);

            const a = document.createElement('a');
            a.download = `${fname}.${ext}`;
            a.href = out.toDataURL(fmt, qual);
            a.click();

            saveCurrentPhotoBackToLibrary();
            modal.classList.add('hidden');
        });
    }

    window.addEventListener('DOMContentLoaded', init);
})();
