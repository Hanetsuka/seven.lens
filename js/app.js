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
    const gradedCtx = gradedCanvas.getContext('2d', { willReadFrequently: true });
    const fastCanvas = document.createElement('canvas'); // buffer resolusi preview (render cepat)
    const fastCtx = fastCanvas.getContext('2d', { willReadFrequently: true });
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    const thumbCache = new Map(); // cache thumbnail preset per foto

    const brushCanvas = document.createElement('canvas');
    const brushCtx = brushCanvas.getContext('2d');

    const thumbGenCanvas = document.createElement('canvas');
    thumbGenCanvas.width = 96;
    thumbGenCanvas.height = 96;
    const thumbGenCtx = thumbGenCanvas.getContext('2d');

    // Default Non-Destructive Edit State per Photo
    function createIdentityCurves() {
        return {
            rgb: [[0, 0], [255, 255]],
            r: [[0, 0], [255, 255]],
            g: [[0, 0], [255, 255]],
            b: [[0, 0], [255, 255]]
        };
    }

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
            curves: createIdentityCurves(),
            flipH: false,
            flipV: false,
            bgReplaceColor: 'transparent',
            effectId: 'none_leak',
            effectStrength: 75,
            dustId: 'none_dust',
            dustStrength: 50,
            frameId: 'none_frame',
            frameStrength: 60,
            texts: [], // { id, text, x, y, font, fontName, size, color, opacity, rotate, bold, italic, shadow, outline, align }
            selectedTextId: null
        };
    }

    let state = createDefaultEditState();

    // Active UI Context inside Editor
    let activeEditorMainTab = 'Presets'; // 'Presets' | 'Tools' | 'Effects' | 'Text'
    let activePresetCat = 'genz';
    let activeToolCat = 'all';
    let activeToolKey = 'exposure';
    let activeEffectCat = 'leaks';
    let activeCurveChannel = 'rgb'; // 'rgb' | 'r' | 'g' | 'b'

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
        { key: 'context_curves', name: 'Tone Curve', cat: 'light', isContext: 'curves', icon: `<rect x="3" y="3" width="18" height="18"/><path d="M3 21C9 21 9 3 21 3"/>` },
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
        bindCurvesEditorEvents();
    }

    /**
     * Memuat 3 Foto Awal di "Your library" dari sample-photos.js (Image 2, 3, 4)
     * menggunakan Data URI agar 100% bebas Canvas Taint di mode offline (file://).
     */
    function generateStarterLibraryPhotos() {
        const samples = Array.isArray(window.STARTER_SAMPLE_PHOTOS) ? window.STARTER_SAMPLE_PHOTOS : [];

        if (!samples.length) {
            const fallback = document.createElement('canvas');
            fallback.width = 764;
            fallback.height = 1024;
            const ctx = fallback.getContext('2d');
            ctx.fillStyle = '#e7e2d8';
            ctx.fillRect(0, 0, fallback.width, fallback.height);
            addPhotoToLibrary(fallback, 'Studio Canvas 01', false);
            currentPhotoId = libraryPhotos[0].id;
            return;
        }

        // addPhotoToLibrary memakai unshift(), jadi kita iterasi terbalik agar urutannya 01, 02, 03
        samples.slice().reverse().forEach((sample) => {
            const w = sample.width || 764;
            const h = sample.height || 1024;

            const placeholder = document.createElement('canvas');
            placeholder.width = w;
            placeholder.height = h;
            const pCtx = placeholder.getContext('2d');
            pCtx.fillStyle = '#e7e2d8';
            pCtx.fillRect(0, 0, w, h);

            const item = addPhotoToLibrary(placeholder, sample.title || 'Sample Photo', !!sample.markEdited);
            if (sample.dataUrl) {
                item.thumbUrl = sample.dataUrl;
                item.editedThumbUrl = sample.dataUrl;

                const img = new Image();
                img.onload = () => {
                    const realCanvas = document.createElement('canvas');
                    realCanvas.width = img.naturalWidth || w;
                    realCanvas.height = img.naturalHeight || h;
                    realCanvas.getContext('2d').drawImage(img, 0, 0, realCanvas.width, realCanvas.height);

                    item.originalCanvas = realCanvas;
                    item.workingBaseCanvas = cloneCanvas(realCanvas);
                    item.workingBrushCanvas = createBlankCanvas(realCanvas.width, realCanvas.height);

                    const thumb = generateThumbnailDataUrl(realCanvas, 480) || sample.dataUrl;
                    item.thumbUrl = thumb;
                    item.editedThumbUrl = thumb;

                    if (editorShell && !editorShell.classList.contains('hidden') && currentPhotoId === item.id) {
                        openPhotoInEditor(item.id);
                    }
                    renderLibraryGrid();
                };
                img.src = sample.dataUrl;
            }
        });

        currentPhotoId = libraryPhotos[0].id;
    }

    function generateThumbnailDataUrl(canvasEl, maxSide = 480) {
        const w = canvasEl.width;
        const h = canvasEl.height;
        if (!w || !h) return '';
        const scale = Math.min(1, maxSide / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));
        const tc = document.createElement('canvas');
        tc.width = tw;
        tc.height = th;
        tc.getContext('2d').drawImage(canvasEl, 0, 0, tw, th);
        return tc.toDataURL('image/jpeg', 0.82);
    }

    function addPhotoToLibrary(canvasEl, title, markEdited = false) {
        const thumbUrl = generateThumbnailDataUrl(canvasEl, 480);
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
        if (viewId === 'viewTemplates' && window.svnLensTemplates) window.svnLensTemplates.renderGallery();
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

        const triggerPhotoPicker = () => {
            const input = document.getElementById('photoFileInput');
            input.value = '';
            input.click();
        };

        document.getElementById('btnHomeImportPhoto').addEventListener('click', triggerPhotoPicker);
        document.getElementById('btnLibImport').addEventListener('click', triggerPhotoPicker);
        document.getElementById('btnEditorImport').addEventListener('click', triggerPhotoPicker);

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

        function showLoadingToast(msg) {
            const toast = document.getElementById('loadingToast');
            const textEl = document.getElementById('loadingToastText');
            if (toast && textEl) {
                textEl.textContent = msg;
                toast.classList.remove('hidden');
            }
        }

        function hideLoadingToast() {
            const toast = document.getElementById('loadingToast');
            if (toast) toast.classList.add('hidden');
        }

        function decodeBlobToCanvas(blob, fileName) {
            return new Promise((resolve, reject) => {
                const maxEditorDim = 2400;

                const drawScaled = (sourceEl, natW, natH) => {
                    const scale = Math.min(1, maxEditorDim / Math.max(natW, natH));
                    const w = Math.max(1, Math.round(natW * scale));
                    const h = Math.max(1, Math.round(natH * scale));
                    const c = document.createElement('canvas');
                    c.width = w;
                    c.height = h;
                    c.getContext('2d').drawImage(sourceEl, 0, 0, w, h);
                    return c;
                };

                const fallbackReader = () => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const img = new Image();
                        img.onload = () => {
                            const nw = img.naturalWidth || img.width;
                            const nh = img.naturalHeight || img.height;
                            if (!nw || !nh) {
                                reject(new Error(`Dimensi foto "${fileName}" tidak valid.`));
                                return;
                            }
                            resolve(drawScaled(img, nw, nh));
                        };
                        img.onerror = () => reject(new Error(`Format foto "${fileName}" tidak didukung browser.`));
                        img.src = ev.target.result;
                    };
                    reader.onerror = () => reject(new Error(`Gagal membaca file "${fileName}".`));
                    reader.readAsDataURL(blob);
                };

                if (typeof URL !== 'undefined' && URL.createObjectURL) {
                    const objectUrl = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        const nw = img.naturalWidth || img.width;
                        const nh = img.naturalHeight || img.height;
                        URL.revokeObjectURL(objectUrl);
                        if (!nw || !nh) {
                            fallbackReader();
                            return;
                        }
                        resolve(drawScaled(img, nw, nh));
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(objectUrl);
                        fallbackReader();
                    };
                    img.src = objectUrl;
                } else {
                    fallbackReader();
                }
            });
        }

        async function loadImageFileToCanvas(file) {
            const isHeic =
                /\.(heic|heif)$/i.test(file.name) ||
                file.type === 'image/heic' ||
                file.type === 'image/heif';

            const convertWithHeic2Any = async () => {
                if (typeof window.heic2any !== 'function') {
                    throw new Error(`Decoder HEIC belum siap untuk "${file.name}".`);
                }
                showLoadingToast(`Mengonversi HEIC: ${file.name.slice(0, 22)}...`);
                const converted = await window.heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.94
                });
                const resultBlob = Array.isArray(converted) ? converted[0] : converted;
                return decodeBlobToCanvas(resultBlob, file.name);
            };

            if (isHeic) {
                try {
                    return await convertWithHeic2Any();
                } catch (heicErr) {
                    // Jika file .heic ternyata sudah JPEG/browser-readable (code 1), coba decode langsung
                    try {
                        return await decodeBlobToCanvas(file, file.name);
                    } catch (nativeErr) {
                        throw new Error(`Gagal membuka file HEIC "${file.name}".`);
                    }
                }
            }

            try {
                return await decodeBlobToCanvas(file, file.name);
            } catch (nativeErr) {
                // Fallback jika file tanpa ekstensi .heic ternyata berformat HEIC
                if (typeof window.heic2any === 'function') {
                    try {
                        return await convertWithHeic2Any();
                    } catch (_) {
                        throw nativeErr;
                    }
                }
                throw nativeErr;
            }
        }

        async function handleImportedPhotoFiles(fileList) {
            const files = Array.from(fileList || []);
            if (!files.length) return;

            let lastAdded = null;
            let errorMessages = [];

            showLoadingToast('Memuat foto...');
            try {
                for (const file of files) {
                    try {
                        const canvas = await loadImageFileToCanvas(file);
                        lastAdded = addPhotoToLibrary(canvas, file.name);
                    } catch (err) {
                        errorMessages.push(err.message || `Gagal memuat ${file.name}`);
                    }
                }
            } finally {
                hideLoadingToast();
            }

            if (lastAdded) {
                renderLibraryGrid();
                openPhotoInEditor(lastAdded.id, 'Presets');
            } else if (errorMessages.length) {
                alert('Tidak dapat memuat foto:\n' + errorMessages.join('\n') + '\n\nPastikan format foto adalah JPG, PNG, WebP, atau HEIC.');
            }
        }

        // Photo File Input
        const photoInput = document.getElementById('photoFileInput');
        photoInput.addEventListener('change', async (e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (!files.length) return;
            await handleImportedPhotoFiles(files);
            photoInput.value = '';
        });

        // Drag & Drop foto (termasuk HEIC) langsung ke jendela aplikasi
        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        window.addEventListener('drop', async (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer?.files || []);
            if (!files.length) return;

            const imageFiles = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name));
            if (imageFiles.length) {
                await handleImportedPhotoFiles(imageFiles);
            }
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
        thumbCache.clear();
        state = JSON.parse(JSON.stringify(photo.editState));
        if (!state.curves) state.curves = createIdentityCurves();

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
        window.scrollTo(0, 0);

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
        renderEditorCanvasSync();
        photo.editedThumbUrl = generateThumbnailDataUrl(mainCanvas, 480);
        // Salinan hasil edit (maks 2160px) agar bisa dipakai di Templates
        const sc = Math.min(1, 2160 / Math.max(mainCanvas.width, mainCanvas.height));
        const ec = createBlankCanvas(Math.round(mainCanvas.width * sc), Math.round(mainCanvas.height * sc));
        ec.getContext('2d').drawImage(mainCanvas, 0, 0, ec.width, ec.height);
        photo.editedCanvas = ec;
        state.selectedTextId = prevSel;

        // Tandai edited jika ada perubahan dari default
        const isDefault =
            state.presetId === 'original' &&
            !state.activeCubeLutId &&
            state.effectId === 'none_leak' &&
            (!state.frameId || state.frameId === 'none_frame') &&
            state.texts.length === 0 &&
            isCurvesIdentity(state.curves) &&
            Object.values(state.adjust).every((v) => v === 0);
        photo.isEdited = !isDefault;
    }

    // ==========================================
    // 6. CORE DARKROOM RENDERING PIPELINE
    // ==========================================
    // Render dijadwalkan per frame (rAF) pada resolusi preview, lalu diulang penuh saat idle.
    let rcRaf = 0, rcIdle = 0;
    function renderEditorCanvas() {
        if (mainCanvas.width !== basePhotoCanvas.width || mainCanvas.height !== basePhotoCanvas.height) {
            renderEditorCanvasSync();
            return;
        }
        if (rcRaf) return;
        rcRaf = requestAnimationFrame(() => {
            rcRaf = 0;
            renderEditorCanvasNow(true);
            clearTimeout(rcIdle);
            if (Math.max(basePhotoCanvas.width, basePhotoCanvas.height) > 1000) {
                rcIdle = setTimeout(() => renderEditorCanvasNow(false), 280);
            }
        });
    }
    function renderEditorCanvasSync() {
        cancelAnimationFrame(rcRaf);
        rcRaf = 0;
        clearTimeout(rcIdle);
        renderEditorCanvasNow(false);
    }

    function renderEditorCanvasNow(fast) {
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

        // 1-4. Transform, blur, color grading & vignette (mode cepat = resolusi preview ±1000px)
        const q = fast ? Math.min(1, 1000 / Math.max(w, h)) : 1;
        const gw = Math.max(1, Math.round(w * q));
        const gh = Math.max(1, Math.round(h * q));
        let gc = gradedCanvas, gx = gradedCtx;
        if (q < 1) {
            if (fastCanvas.width !== gw || fastCanvas.height !== gh) { fastCanvas.width = gw; fastCanvas.height = gh; }
            gc = fastCanvas; gx = fastCtx;
        }
        gx.clearRect(0, 0, gw, gh);
        gx.save();
        gx.translate(gw / 2, gh / 2);
        if (state.adjust.straighten !== 0) {
            const rad = (state.adjust.straighten * Math.PI) / 180;
            const zoomComp = 1 + Math.abs(Math.sin(rad)) * 0.3;
            gx.rotate(rad);
            gx.scale(zoomComp, zoomComp);
        }
        gx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
        gx.drawImage(basePhotoCanvas, -gw / 2, -gh / 2, gw, gh);
        gx.restore();

        if (state.adjust.blur > 0) {
            if (tmpCanvas.width !== gw || tmpCanvas.height !== gh) { tmpCanvas.width = gw; tmpCanvas.height = gh; }
            tmpCtx.clearRect(0, 0, gw, gh);
            tmpCtx.drawImage(gc, 0, 0);
            gx.clearRect(0, 0, gw, gh);
            gx.save();
            gx.filter = `blur(${state.adjust.blur * q}px)`;
            gx.drawImage(tmpCanvas, 0, 0);
            gx.restore();
        }

        const imgData = gx.getImageData(0, 0, gw, gh);
        applyColorPipelineToImageData(imgData, gw, gh, state);
        gx.putImageData(imgData, 0, 0);

        if (state.adjust.vignette > 0) {
            const vStr = state.adjust.vignette / 100;
            const g = gx.createRadialGradient(gw / 2, gh / 2, Math.min(gw, gh) * 0.25, gw / 2, gh / 2, Math.max(gw, gh) * 0.72);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(1, `rgba(0,0,0,${(vStr * 0.85).toFixed(2)})`);
            gx.save();
            gx.globalCompositeOperation = 'source-atop';
            gx.fillStyle = g;
            gx.fillRect(0, 0, gw, gh);
            gx.restore();
        }
        if (q < 1) {
            gradedCtx.clearRect(0, 0, w, h);
            gradedCtx.drawImage(fastCanvas, 0, 0, w, h);
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
        renderFrameOverlay(ctx, w, h, state.frameId, (state.frameStrength ?? 60) / 100);

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
        const contrast = adj.contrast + (p.contrast || 0) * pStr;
        const highlights = adj.highlights + (p.highlights || 0) * pStr;
        const shadows = adj.shadows + (p.shadows || 0) * pStr;
        const fade = adj.fade + (p.fade || 0) * pStr;
        const warmth = adj.temperature + (p.warmth || 0) * pStr;
        const tint = adj.tint + (p.tint || 0) * pStr;
        const saturation = adj.saturation + (p.saturation || 0) * pStr;
        const vibrance = adj.vibrance + (p.vibrance || 0) * pStr;
        const hueDeg = adj.hue;
        const sepiaAmt = adj.sepia / 100;
        const grainAmt = adj.grain + (p.grain || 0) * pStr;
        const curveLuts = buildCombinedCurveLuts(p.curve, pStr, currentState.curves);

        const isNeutral =
            exposure === 0 && brightness === 0 && contrast === 0 &&
            highlights === 0 && shadows === 0 && fade === 0 &&
            warmth === 0 && tint === 0 && saturation === 0 &&
            vibrance === 0 && hueDeg === 0 && sepiaAmt === 0 &&
            grainAmt === 0 && adj.sharpness === 0 &&
            !curveLuts && !p.splitStrength && !currentState.activeCubeLutId;

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

            // Tone Curve (Preset curve + User curve, per channel)
            if (curveLuts) {
                d[i] = curveLuts.r[d[i]];
                d[i + 1] = curveLuts.g[d[i + 1]];
                d[i + 2] = curveLuts.b[d[i + 2]];
            }
        }

        // Jika pengguna memilih 3D LUT dari My LUTs
        if (currentState.activeCubeLutId) {
            const lutObj = myCubeLuts.find((l) => l.id === currentState.activeCubeLutId);
            if (lutObj) {
                window.applyCubeLUTToImageData(imgData, lutObj, pStr);
            }
        }
    }

    // ==========================================
    // TONE CURVE ENGINE (Monotone Cubic / Fritsch–Carlson)
    // ==========================================
    function isIdentityCurve(points) {
        return !points || (points.length === 2 &&
            points[0][0] === 0 && points[0][1] === 0 &&
            points[1][0] === 255 && points[1][1] === 255);
    }

    function isCurvesIdentity(curves) {
        return !curves || ['rgb', 'r', 'g', 'b'].every((ch) => isIdentityCurve(curves[ch]));
    }

    /** Menghasilkan tabel 256 nilai dari titik-titik kurva (halus & tanpa overshoot). */
    function buildCurveTable(points) {
        const table = new Float32Array(256);
        const pts = (points || [[0, 0], [255, 255]]).slice().sort((a, b) => a[0] - b[0]);
        const n = pts.length;
        if (n < 2) {
            for (let x = 0; x < 256; x++) table[x] = x;
            return table;
        }

        const xs = pts.map((pt) => pt[0]);
        const ys = pts.map((pt) => pt[1]);
        const dx = [], slope = [];
        for (let i = 0; i < n - 1; i++) {
            dx[i] = Math.max(1e-6, xs[i + 1] - xs[i]);
            slope[i] = (ys[i + 1] - ys[i]) / dx[i];
        }

        const m = new Array(n);
        m[0] = slope[0];
        m[n - 1] = slope[n - 2];
        for (let i = 1; i < n - 1; i++) {
            m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
        }
        for (let i = 0; i < n - 1; i++) {
            if (slope[i] === 0) {
                m[i] = 0; m[i + 1] = 0;
                continue;
            }
            const a = m[i] / slope[i];
            const b = m[i + 1] / slope[i];
            const s = a * a + b * b;
            if (s > 9) {
                const t = 3 / Math.sqrt(s);
                m[i] = t * a * slope[i];
                m[i + 1] = t * b * slope[i];
            }
        }

        let seg = 0;
        for (let x = 0; x < 256; x++) {
            if (x <= xs[0]) { table[x] = ys[0]; continue; }
            if (x >= xs[n - 1]) { table[x] = ys[n - 1]; continue; }
            while (seg < n - 2 && x > xs[seg + 1]) seg++;
            const h = dx[seg];
            const t = (x - xs[seg]) / h;
            const t2 = t * t, t3 = t2 * t;
            table[x] =
                (2 * t3 - 3 * t2 + 1) * ys[seg] +
                (t3 - 2 * t2 + t) * h * m[seg] +
                (-2 * t3 + 3 * t2) * ys[seg + 1] +
                (t3 - t2) * h * m[seg + 1];
        }
        for (let x = 0; x < 256; x++) table[x] = Math.min(255, Math.max(0, table[x]));
        return table;
    }

    /**
     * Menggabungkan kurva preset (dengan strength) + kurva pengguna menjadi 3 tabel per channel.
     * Mengembalikan null jika keduanya identitas (tanpa biaya proses).
     */
    function buildCombinedCurveLuts(presetCurve, presetStrength, userCurves) {
        const hasPreset = presetCurve && presetStrength > 0 && !isCurvesIdentity(presetCurve);
        const hasUser = !isCurvesIdentity(userCurves);
        if (!hasPreset && !hasUser) return null;

        const stage = (curves, strength) => {
            const rgb = buildCurveTable(curves.rgb);
            const out = {};
            ['r', 'g', 'b'].forEach((ch) => {
                const chan = buildCurveTable(curves[ch]);
                const t = new Float32Array(256);
                for (let x = 0; x < 256; x++) {
                    const v = chan[Math.round(rgb[x])];
                    t[x] = x + (v - x) * strength;
                }
                out[ch] = t;
            });
            return out;
        };

        const pre = hasPreset ? stage(presetCurve, presetStrength) : null;
        const usr = hasUser ? stage(userCurves, 1) : null;

        const result = {};
        ['r', 'g', 'b'].forEach((ch) => {
            const lut = new Uint8ClampedArray(256);
            for (let x = 0; x < 256; x++) {
                let v = pre ? pre[ch][x] : x;
                if (usr) v = usr[ch][Math.round(Math.min(255, Math.max(0, v)))];
                lut[x] = v;
            }
            result[ch] = lut;
        });
        return result;
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
        } else if (eff.angle === 'bottom-left') {
            grad = targetCtx.createRadialGradient(0, h, w * 0.05, 0, h, Math.max(w, h) * 0.85);
        } else if (eff.angle === 'left-edge') {
            grad = targetCtx.createLinearGradient(0, h * 0.5, w * 0.7, h * 0.45);
        } else if (eff.angle === 'center-glow') {
            grad = targetCtx.createRadialGradient(w * 0.5, h * 0.55, w * 0.02, w * 0.5, h * 0.55, Math.max(w, h) * 0.7);
        } else if (eff.angle === 'stripe-diag') {
            grad = targetCtx.createLinearGradient(w * 0.15, 0, w * 0.55, h);
        } else if (eff.angle === 'bottom-center') {
            grad = targetCtx.createRadialGradient(w * 0.5, h, w * 0.03, w * 0.5, h, Math.max(w, h) * 0.8);
        } else {
            grad = targetCtx.createLinearGradient(0, 0, w, h);
        }

        eff.stops.forEach((s) => grad.addColorStop(s.pos, s.color));
        targetCtx.fillStyle = grad;
        targetCtx.fillRect(0, 0, w, h);
        targetCtx.restore();
    }

    const FRAMES = [
        { id: 'none_frame', code: 'NONE', name: 'No Frame' },
        { id: 'frm_polaroid', code: 'POLAROID', name: 'Polaroid Frame' },
        { id: 'frm_instax', code: 'INSTAX', name: 'Instax Frame' },
        { id: 'frm_film', code: 'FILM STRIP', name: 'Film Strip' },
        { id: 'frm_black', code: 'BLACK', name: 'Black Border' },
        { id: 'frm_white', code: 'WHITE', name: 'White Border' },
        { id: 'frm_round', code: 'ROUNDED', name: 'Rounded Corners' },
        { id: 'frm_cam', code: 'CAMCORDER', name: 'Camcorder UI' },
        { id: 'frm_ccd', code: 'DIGICAM UI', name: 'Digicam UI' }
    ];

    function renderFrameOverlay(c, w, h, id, k) {
        if (!id || id === 'none_frame') return;
        const m = Math.min(w, h), t = m * (0.02 + k * 0.08);
        const bars = (col, top, right, bottom, left) => {
            c.fillStyle = col;
            c.fillRect(0, 0, w, top); c.fillRect(0, h - bottom, w, bottom);
            c.fillRect(0, top, left, h - top - bottom); c.fillRect(w - right, top, right, h - top - bottom);
        };
        const corners = (x0, y0, x1, y1, len) => {
            c.beginPath();
            [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, dx, dy]) => { c.moveTo(x + dx * len, y); c.lineTo(x, y); c.lineTo(x, y + dy * len); });
            c.stroke();
        };
        c.save();
        if (id === 'frm_polaroid') bars('#f7f4ee', t, t, t * 3.4, t);
        else if (id === 'frm_instax') bars('#fbfaf6', t * 1.1, t * 1.1, t * 2.6, t * 1.1);
        else if (id === 'frm_black') bars('#0b0b0b', t, t, t, t);
        else if (id === 'frm_white') bars('#ffffff', t, t, t, t);
        else if (id === 'frm_round') {
            c.fillStyle = '#0b0b0b'; c.beginPath(); c.rect(0, 0, w, h);
            c.roundRect(t * 0.6, t * 0.6, w - t * 1.2, h - t * 1.2, m * (0.04 + k * 0.14)); c.fill('evenodd');
        } else if (id === 'frm_film') {
            const b = t * 2.2;
            bars('#111111', b, 0, b, 0);
            c.fillStyle = '#f1e9d8';
            for (let x = b * 0.5; x < w - b * 0.4; x += b * 1.05) {
                c.beginPath(); c.roundRect(x, b * 0.3, b * 0.5, b * 0.4, b * 0.08); c.roundRect(x, h - b * 0.7, b * 0.5, b * 0.4, b * 0.08); c.fill();
            }
        } else {
            const fs = m * 0.035, pad = m * 0.05;
            c.strokeStyle = 'rgba(255,255,255,0.92)'; c.lineWidth = Math.max(1.5, m * 0.004);
            c.font = `700 ${fs}px "Space Mono", monospace`; c.textBaseline = 'top';
            if (id === 'frm_cam') {
                corners(pad, pad, w - pad, h - pad, m * 0.07);
                c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(pad * 1.6, pad * 1.55 + fs * 0.5, fs * 0.42, 0, 7); c.fill();
                c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.fillText('REC', pad * 1.6 + fs, pad * 1.55);
                c.textAlign = 'right'; c.fillText('▮▮▮ SP', w - pad * 1.5, pad * 1.55);
                c.textAlign = 'left'; c.fillText('00:00:12', pad * 1.5, h - pad * 1.5 - fs);
            } else {
                const fz = m * 0.1;
                corners(w / 2 - fz, h / 2 - fz, w / 2 + fz, h / 2 + fz, fz * 0.55);
                c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.fillText('AUTO', pad * 1.5, pad * 1.5);
                c.textAlign = 'right'; c.fillText('1/125  F2.8', w - pad * 1.5, pad * 1.5);
                c.fillStyle = '#ff7b00'; c.fillText("'03 11 14", w - pad * 1.5, h - pad * 1.5 - fs);
                c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.fillText('ISO 100', pad * 1.5, h - pad * 1.5 - fs);
            }
        }
        c.restore();
    }

    function renderDustOverlay(targetCtx, w, h, dustId, strength = 0.5) {
        if (!dustId || dustId === 'none_dust' || strength <= 0) return;
        targetCtx.save();
        targetCtx.globalCompositeOperation = 'screen';
        targetCtx.fillStyle = `rgba(245, 238, 225, ${(strength * 0.55).toFixed(2)})`;
        targetCtx.strokeStyle = `rgba(245, 238, 225, ${(strength * 0.4).toFixed(2)})`;

        const count = dustId === 'dust_02' ? 95 : dustId === 'dust_04' ? 170 : (dustId === 'dust_05' || dustId === 'dust_06') ? 0 : 42;
        for (let i = 0; i < count; i++) {
            // Posisi deterministik agar tidak berkedip saat digeser slider
            const px = ((i * 173 + 41) % 997) / 997 * w;
            const py = ((i * 317 + 83) % 991) / 991 * h;
            const pr = 1 + (i % 3) * 0.8;
            targetCtx.beginPath();
            targetCtx.arc(px, py, pr, 0, Math.PI * 2);
            targetCtx.fill();
        }

        if (dustId === 'dust_05') { // serat / rambut
            targetCtx.lineWidth = Math.max(1, w / 900);
            for (let s = 0; s < 8; s++) {
                const sx = ((s * 211 + 37) % 100) / 100 * w, sy = ((s * 137 + 11) % 100) / 100 * h, len = w * (0.04 + (s % 3) * 0.03);
                targetCtx.beginPath();
                targetCtx.moveTo(sx, sy);
                targetCtx.quadraticCurveTo(sx + len * 0.6, sy - len * 0.5, sx + len, sy + len * (s % 2 ? 0.3 : -0.2));
                targetCtx.stroke();
            }
        }
        if (dustId === 'dust_06') { // bokeh debu
            targetCtx.fillStyle = `rgba(255, 240, 210, ${(strength * 0.16).toFixed(2)})`;
            for (let s = 0; s < 16; s++) {
                const px = ((s * 193 + 57) % 97) / 97 * w, py = ((s * 271 + 19) % 89) / 89 * h;
                targetCtx.beginPath();
                targetCtx.arc(px, py, Math.min(w, h) * (0.02 + (s % 4) * 0.018), 0, Math.PI * 2);
                targetCtx.fill();
            }
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
    function presetThumb(preset) {
        const key = currentPhotoId + '|' + preset.id;
        let c = thumbCache.get(key);
        if (!c) {
            c = document.createElement('canvas');
            c.width = 76;
            c.height = 76;
            const cCtx = c.getContext('2d', { willReadFrequently: true });
            cCtx.drawImage(thumbGenCanvas, 0, 0, 76, 76);
            if (preset.id !== 'original') {
                const idata = cCtx.getImageData(0, 0, 76, 76);
                const dummyState = createDefaultEditState();
                dummyState.presetId = preset.id;
                dummyState.presetStrength = 100;
                applyColorPipelineToImageData(idata, 76, 76, dummyState);
                cCtx.putImageData(idata, 0, 0);
            }
            thumbCache.set(key, c);
        }
        return c;
    }

    let lastPresetCat = null;
    function renderPresetsStrip() {
        const s = document.getElementById('presetStrip');
        const keep = lastPresetCat === activePresetCat ? s.scrollLeft : 0;
        renderPresetsStripInner();
        lastPresetCat = activePresetCat;
        s.scrollLeft = keep;
    }

    function renderPresetsStripInner() {
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

            const c = presetThumb(preset);

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
                pushHistory(`Preset ${preset.code}`, true);
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
        if (lut) pushHistory(`3D LUT: ${lut.title}`, true);
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
            const isModified = tool.isContext === 'curves'
                ? !isCurvesIdentity(state.curves)
                : !tool.isAction && !tool.isContext && state.adjust[tool.key] !== 0;

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
        if (tool.isContext !== 'curves') document.getElementById('curvesEditor').classList.add('hidden');
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
        let tool = TOOLS_CONFIG.find((t) => t.key === key) || TOOLS_CONFIG[0];

        // Tone Curve tetap terbuka (mis. setelah Undo/Redo atau pindah tab)
        if (tool.isContext === 'curves') {
            activeToolKey = tool.key;
            renderToolsStrip();
            openToolContextBar('curves', tool.name);
            return;
        }
        // Tool non-slider lain tidak bisa diikat ke slider utama
        if (tool.isContext || tool.isAction) tool = TOOLS_CONFIG[0];

        activeToolKey = tool.key;
        masterSliderMode = 'tool';
        document.getElementById('curvesEditor').classList.add('hidden');

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
        masterSliderMode = 'context'; // Slider utama tidak mengubah apapun saat tool kontekstual aktif

        document.getElementById('activeParamCategory').textContent = 'STUDIO TOOL';
        document.getElementById('activeParamTitle').textContent = title;
        document.getElementById('activeParamValue').textContent = '';

        if (contextType === 'curves') {
            renderCurvesContextBar(bar);
            document.getElementById('curvesEditor').classList.remove('hidden');
            drawCurvesEditor();
            return;
        }

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

    // ==========================================
    // TONE CURVE EDITOR UI (02 TOOLS → Tone Curve)
    // ==========================================
    const CURVE_PAD = 18;
    const CURVE_MAX_POINTS = 14;
    const CURVE_CHANNEL_COLORS = { rgb: '#f4f1ea', r: '#f87171', g: '#4ade80', b: '#60a5fa' };
    const CURVE_QUICK_PRESETS = [
        { label: 'LINEAR', curves: null },
        { label: 'SOFT S', curves: { rgb: [[0, 0], [64, 54], [192, 202], [255, 255]] } },
        { label: 'STRONG S', curves: { rgb: [[0, 0], [64, 40], [192, 218], [255, 255]] } },
        { label: 'MATTE', curves: { rgb: [[0, 36], [64, 70], [192, 196], [255, 240]] } },
        { label: 'FADED', curves: { rgb: [[0, 50], [128, 134], [255, 226]] } },
        {
            label: 'CROSS',
            curves: {
                r: [[0, 0], [64, 50], [192, 210], [255, 255]],
                g: [[0, 0], [64, 58], [192, 204], [255, 255]],
                b: [[0, 28], [255, 224]]
            }
        }
    ];

    let curveDragIdx = -1;
    let curveDidChange = false;
    let curveRenderQueued = false;
    let curveLastTap = { time: 0, idx: -1 };

    function renderCurvesContextBar(bar) {
        [
            { id: 'rgb', label: 'RGB' },
            { id: 'r', label: 'R' },
            { id: 'g', label: 'G' },
            { id: 'b', label: 'B' }
        ].forEach((ch) => {
            const chip = document.createElement('button');
            chip.className = `dark-chip chip-${ch.id} ${activeCurveChannel === ch.id ? 'active' : ''}`;
            chip.textContent = ch.label;
            chip.addEventListener('click', () => {
                activeCurveChannel = ch.id;
                openToolContextBar('curves', 'Tone Curve');
            });
            bar.appendChild(chip);
        });

        CURVE_QUICK_PRESETS.forEach((qp) => {
            const chip = document.createElement('button');
            chip.className = 'dark-chip';
            chip.textContent = qp.label;
            chip.addEventListener('click', () => {
                const next = createIdentityCurves();
                if (qp.curves) {
                    Object.keys(qp.curves).forEach((ch) => {
                        next[ch] = qp.curves[ch].map((pt) => pt.slice());
                    });
                }
                state.curves = next;
                commitCurveChange(`Curve ${qp.label}`);
            });
            bar.appendChild(chip);
        });

        const resetBtn = document.createElement('button');
        resetBtn.className = 'dark-chip';
        resetBtn.textContent = `RESET ${activeCurveChannel.toUpperCase()}`;
        resetBtn.addEventListener('click', () => {
            state.curves[activeCurveChannel] = [[0, 0], [255, 255]];
            commitCurveChange('Reset Curve');
        });
        bar.appendChild(resetBtn);
    }

    function commitCurveChange(label) {
        drawCurvesEditor();
        renderEditorCanvas();
        renderToolsStrip();
        pushHistory(label, true);
    }

    function curveValueToCanvas(v, size) {
        return CURVE_PAD + (v / 255) * (size - CURVE_PAD * 2);
    }

    function drawCurveLine(c, points, size, color, width) {
        const table = buildCurveTable(points);
        c.strokeStyle = color;
        c.lineWidth = width;
        c.beginPath();
        for (let x = 0; x < 256; x++) {
            const px = curveValueToCanvas(x, size);
            const py = size - curveValueToCanvas(table[x], size);
            if (x === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
        }
        c.stroke();
    }

    function drawCurvesEditor() {
        const canvas = document.getElementById('curvesCanvas');
        if (!canvas || !state.curves) return;
        const c = canvas.getContext('2d');
        const size = canvas.width;
        const inner = size - CURVE_PAD * 2;
        c.clearRect(0, 0, size, size);

        // Histogram (dari thumbnail foto)
        const hist = new Uint32Array(256);
        const tData = thumbGenCtx.getImageData(0, 0, 96, 96).data;
        const chIdx = { r: 0, g: 1, b: 2 }[activeCurveChannel];
        for (let i = 0; i < tData.length; i += 4) {
            const v = chIdx === undefined
                ? Math.round(0.299 * tData[i] + 0.587 * tData[i + 1] + 0.114 * tData[i + 2])
                : tData[i + chIdx];
            hist[v]++;
        }
        let maxH = 1;
        for (let i = 0; i < 256; i++) if (hist[i] > maxH) maxH = hist[i];
        c.fillStyle = 'rgba(244, 241, 234, 0.10)';
        for (let i = 0; i < 256; i++) {
            const hh = Math.sqrt(hist[i] / maxH) * inner * 0.9;
            c.fillRect(curveValueToCanvas(i, size), size - CURVE_PAD - hh, inner / 256 + 1, hh);
        }

        // Grid 4x4 + garis diagonal referensi
        c.strokeStyle = 'rgba(244, 241, 234, 0.12)';
        c.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const p = CURVE_PAD + (inner * i) / 4;
            c.beginPath(); c.moveTo(p, CURVE_PAD); c.lineTo(p, size - CURVE_PAD); c.stroke();
            c.beginPath(); c.moveTo(CURVE_PAD, p); c.lineTo(size - CURVE_PAD, p); c.stroke();
        }
        c.setLineDash([6, 6]);
        c.beginPath(); c.moveTo(CURVE_PAD, size - CURVE_PAD); c.lineTo(size - CURVE_PAD, CURVE_PAD); c.stroke();
        c.setLineDash([]);

        // Kurva channel lain (samar) lalu channel aktif
        ['rgb', 'r', 'g', 'b'].forEach((ch) => {
            if (ch !== activeCurveChannel && !isIdentityCurve(state.curves[ch])) {
                c.globalAlpha = 0.35;
                drawCurveLine(c, state.curves[ch], size, CURVE_CHANNEL_COLORS[ch], 2);
                c.globalAlpha = 1;
            }
        });
        const activeColor = CURVE_CHANNEL_COLORS[activeCurveChannel];
        drawCurveLine(c, state.curves[activeCurveChannel], size, activeColor, 3.5);

        // Titik kontrol
        state.curves[activeCurveChannel].forEach((pt, idx) => {
            const px = curveValueToCanvas(pt[0], size);
            const py = size - curveValueToCanvas(pt[1], size);
            c.beginPath();
            c.arc(px, py, idx === curveDragIdx ? 11 : 8, 0, Math.PI * 2);
            c.fillStyle = idx === curveDragIdx ? activeColor : '#2a2420';
            c.fill();
            c.lineWidth = 3;
            c.strokeStyle = activeColor;
            c.stroke();
        });
    }

    function curveEventToValue(e) {
        const canvas = document.getElementById('curvesCanvas');
        const rect = canvas.getBoundingClientRect();
        const size = canvas.width;
        const sx = ((e.clientX - rect.left) / rect.width) * size;
        const sy = ((e.clientY - rect.top) / rect.height) * size;
        const inner = size - CURVE_PAD * 2;
        const clamp = (v) => Math.round(Math.min(255, Math.max(0, v)));
        return {
            x: clamp(((sx - CURVE_PAD) / inner) * 255),
            y: clamp(((size - sy - CURVE_PAD) / inner) * 255)
        };
    }

    function scheduleCurveRender() {
        if (curveRenderQueued) return;
        curveRenderQueued = true;
        requestAnimationFrame(() => {
            curveRenderQueued = false;
            drawCurvesEditor();
            renderEditorCanvas();
        });
    }

    function bindCurvesEditorEvents() {
        const canvas = document.getElementById('curvesCanvas');
        if (!canvas) return;

        canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const pts = state.curves[activeCurveChannel];
            const v = curveEventToValue(e);

            // Cari titik terdekat (radius ~14 dari 255)
            let idx = -1;
            let best = 14;
            pts.forEach((pt, i) => {
                const dist = Math.hypot(pt[0] - v.x, pt[1] - v.y);
                if (dist < best) { best = dist; idx = i; }
            });

            // Double-tap pada titik tengah → hapus titik
            const now = Date.now();
            if (idx > 0 && idx < pts.length - 1 && curveLastTap.idx === idx && now - curveLastTap.time < 320) {
                pts.splice(idx, 1);
                curveLastTap = { time: 0, idx: -1 };
                commitCurveChange('Remove Curve Point');
                return;
            }
            curveLastTap = { time: now, idx };

            // Tambah titik baru jika tidak menyentuh titik yang ada
            if (idx === -1) {
                if (pts.length >= CURVE_MAX_POINTS) return;
                if (pts.some((pt) => Math.abs(pt[0] - v.x) < 4)) return;
                pts.push([v.x, v.y]);
                pts.sort((a, b) => a[0] - b[0]);
                idx = pts.findIndex((pt) => pt[0] === v.x && pt[1] === v.y);
                curveLastTap = { time: now, idx };
                curveDidChange = true;
            }

            curveDragIdx = idx;
            canvas.setPointerCapture(e.pointerId);
            scheduleCurveRender();
        });

        canvas.addEventListener('pointermove', (e) => {
            if (curveDragIdx < 0) return;
            const pts = state.curves[activeCurveChannel];
            const pt = pts[curveDragIdx];
            if (!pt) return;
            const v = curveEventToValue(e);

            // Titik ujung hanya bergerak vertikal; titik tengah dibatasi oleh tetangganya
            if (curveDragIdx > 0 && curveDragIdx < pts.length - 1) {
                pt[0] = Math.min(pts[curveDragIdx + 1][0] - 3, Math.max(pts[curveDragIdx - 1][0] + 3, v.x));
            }
            pt[1] = v.y;
            curveDidChange = true;
            scheduleCurveRender();
        });

        const endDrag = () => {
            if (curveDragIdx < 0) return;
            curveDragIdx = -1;
            if (curveDidChange) {
                curveDidChange = false;
                commitCurveChange('Tone Curve');
            } else {
                drawCurvesEditor();
            }
        };
        canvas.addEventListener('pointerup', endDrag);
        canvas.addEventListener('pointercancel', endDrag);
    }

    /**
     * Render Strip 03 EFFECTS (Light Leaks, Film Burns, Vintage Dust, Date Stamps)
     * Persis seperti Screenshot 5 (Light Leak 01..05 dengan preview langsung di atas awan/foto!)
     */
    let lastEffectCat = null;
    function renderEffectsStrip() {
        const s = document.getElementById('effectsStrip');
        const keep = lastEffectCat === activeEffectCat ? s.scrollLeft : 0;
        renderEffectsStripInner();
        lastEffectCat = activeEffectCat;
        s.scrollLeft = keep;
    }

    function renderEffectsStripInner() {
        const strip = document.getElementById('effectsStrip');
        strip.innerHTML = '';

        if (activeEffectCat === 'frames') {
            FRAMES.forEach((f) => {
                const card = document.createElement('div');
                card.className = `thumb-card ${(state.frameId || 'none_frame') === f.id ? 'active' : ''}`;
                const c = document.createElement('canvas');
                c.width = 76;
                c.height = 76;
                const cCtx = c.getContext('2d');
                cCtx.drawImage(thumbGenCanvas, 0, 0, 76, 76);
                renderFrameOverlay(cCtx, 76, 76, f.id, 0.6);
                card.innerHTML = `<div class="thumb-box"></div><span class="thumb-label">${f.code}</span>`;
                card.querySelector('.thumb-box').appendChild(c);
                card.addEventListener('click', () => {
                    state.frameId = f.id;
                    syncMasterSliderForEffect();
                    renderEffectsStrip();
                    renderEditorCanvas();
                    pushHistory(f.name, true);
                });
                strip.appendChild(card);
            });
            return;
        }

        if (activeEffectCat === 'stamps') {
            const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
            const today = `'${String(d.getFullYear()).slice(2)} ${p2(d.getMonth() + 1)} ${p2(d.getDate())}`;
            const mono = "'Space Mono', monospace";
            const stamps = [
                { label: "'98 DATE", text: "'98 11 14", font: mono, color: '#ff7b00' },
                { label: 'TODAY', text: today, font: mono, color: '#ff7b00' },
                { label: 'KODAK 400', text: '→ 24A  KODAK PORTRA 400', font: mono, color: '#f59e0b' },
                { label: 'REC ●', text: 'REC ●', font: mono, color: '#ff3b30' },
                { label: 'PLAY ▶', text: '▶ PLAY', font: mono, color: '#ffffff' },
                { label: 'DV TIMER', text: '00:12:04', font: mono, color: '#ffffff' },
                { label: 'LOW BATT', text: '▯ LOW BATT', font: mono, color: '#ff3b30' },
                { label: 'FLASH ⚡', text: '⚡ AUTO', font: mono, color: '#fde047' },
                { label: 'ISO 400', text: 'ISO 400  F1.8', font: mono, color: '#ffffff' },
                { label: 'POLAROID', text: 'POLAROID 600', font: mono, color: '#f4f1ea' },
                { label: 'SVN.LENS', text: 'svn.lens', font: "'Playfair Display', serif", color: '#ffffff' },
                { label: 'GOOD VIBES', text: 'good vibes only', font: "'Caveat', cursive", color: '#ffffff' },
                { label: 'MEMORIES', text: 'memories', font: "'Dancing Script', cursive", color: '#ffffff' },
                { label: 'SPARKLE ✨', text: '✨', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'STAR ⭐', text: '⭐', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'HEART 🤍', text: '🤍', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'PINK 💖', text: '💖', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'BUTTERFLY', text: '🦋', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'FLOWER 🌸', text: '🌸', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'RIBBON 🎀', text: '🎀', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'CLOUD ☁️', text: '☁️', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'CD 💿', text: '💿', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'CAMERA 📷', text: '📷', font: 'sans-serif', color: '#ffffff', sticker: true },
                { label: 'FILM 🎞️', text: '🎞️', font: 'sans-serif', color: '#ffffff', sticker: true }
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
                    const px = s.sticker ? basePhotoCanvas.width * (0.25 + Math.random() * 0.5) : basePhotoCanvas.width * 0.72;
                    const py = s.sticker ? basePhotoCanvas.height * (0.2 + Math.random() * 0.5) : basePhotoCanvas.height * 0.88;
                    addTextLayerToPhoto(s.text, s.font, s.label, s.color, px, py);
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
                pushHistory(eff.name, true);
            });

            strip.appendChild(card);
        });
    }

    function syncMasterSliderForEffect() {
        masterSliderMode = 'effect';
        const slider = document.getElementById('masterSlider');
        slider.min = 0;
        slider.max = 100;

        if (activeEffectCat === 'frames') {
            const f = FRAMES.find((x) => x.id === (state.frameId || 'none_frame')) || FRAMES[0];
            slider.value = state.frameStrength ?? 60;
            document.getElementById('activeParamCategory').textContent = 'THICKNESS';
            document.getElementById('activeParamTitle').textContent = f.name;
            document.getElementById('activeParamValue').textContent = slider.value;
            return;
        }
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
        pushHistory(`Text: ${textStr.slice(0, 12)}`, true);
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
                else if (activeEffectCat === 'frames') state.frameStrength = val;
                else state.effectStrength = val;
            }
            renderEditorCanvas();
        });

        masterSlider.addEventListener('change', () => {
            pushHistory(`Adjust ${document.getElementById('activeParamTitle').textContent}`, true);
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
                if (activeEffectCat === 'frames') state.frameStrength = 60; else state.effectStrength = 75;
                masterSlider.value = activeEffectCat === 'frames' ? 60 : 75;
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
            pushHistory('Delete Text', true);
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
                pushHistory('Move Text', true);
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
    function pushHistory(label, light) {
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }
        const prev = historyStack[historyIndex];
        const reuse = light && prev && prev.w === basePhotoCanvas.width && prev.h === basePhotoCanvas.height;
        historyStack.push({
            label,
            stateSnap: JSON.parse(JSON.stringify(state)),
            baseSnap: reuse ? prev.baseSnap : cloneCanvas(basePhotoCanvas),
            brushSnap: reuse ? prev.brushSnap : cloneCanvas(brushCanvas),
            w: basePhotoCanvas.width,
            h: basePhotoCanvas.height
        });
        if (historyStack.length > 15) historyStack.shift();
        historyIndex = historyStack.length - 1;
        updateHistoryBtns();
    }

    function restoreHistory(idx) {
        if (idx < 0 || idx >= historyStack.length) return;
        historyIndex = idx;
        const snap = historyStack[historyIndex];
        state = JSON.parse(JSON.stringify(snap.stateSnap));

        basePhotoCanvas.width = snap.w;
        basePhotoCanvas.height = snap.h;
        basePhotoCtx.clearRect(0, 0, snap.w, snap.h);
        basePhotoCtx.drawImage(snap.baseSnap, 0, 0);

        brushCanvas.width = snap.w;
        brushCanvas.height = snap.h;
        brushCtx.clearRect(0, 0, snap.w, snap.h);
        brushCtx.drawImage(snap.brushSnap, 0, 0);

        switchEditorMainTab(activeEditorMainTab);
        renderEditorCanvas();
        updateHistoryBtns();
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

            renderEditorCanvasSync();
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

    // Jembatan untuk fitur Templates
    window.svnLens = { photos: () => libraryPhotos, showView: switchStudioView };

    window.addEventListener('DOMContentLoaded', init);
})();


/* ==========================================
   TEMPLATES — Carousel & Collage Editor
   ========================================== */
/* svn.lens — Templates: carousel & collage editor. Self-contained; injects its own UI. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const W = 1080, RA = { '4:5': 1.25, '1:1': 1, '3:4': 4 / 3, '9:16': 16 / 9, '16:9': 9 / 16 };
const FONTS = ['Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Bebas Neue', 'Oswald', 'Inter', 'Space Mono', 'Caveat', 'Great Vibes', 'Dancing Script'];
const SW = ['#ffffff', '#f4f1ea', '#eaeaea', '#cacaca', '#fde68a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#fb923c', '#f43f5e', '#26211e', '#000000'];
const IMG = {};
let uid = Date.now() % 1e6, st, hist = [], hi = -1, sel = null, mode = null, cur = 0, pv = false, S = 1, drag = null, pend = null, allSl = false;
const H = (s = st) => Math.round(W * RA[s.ra]), id = () => 'l' + uid++, lay = i => st.L.find(l => l.id === i);
const esc = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
const bgOf = s => s.bg2 ? `linear-gradient(${s.bg} 50%,${s.bg2} 50%)` : s.bg;

/* ---------- Template catalogue (x in slide-widths, y in slide-heights, w/h/fs in slide-widths) ---------- */
const p = (x, y, w, h, o) => ({ t: 'p', x, y, w, h, ...o }), tx = (x, y, s, fs, o) => ({ t: 't', x, y, s, fs, ...o }), sq = (x, y, w, h, c, o) => ({ t: 's', x, y, w, h, c, ...o });
const pol = (x, y, r) => { const a = r * Math.PI / 180; return [sq(x, y, .52, .62, '#ffffff', { r, sh: 1 }), p(x + .06 * Math.sin(a), (y * 1.25 - .06 * Math.cos(a)) / 1.25, .44, .44, { r })]; };
const mono = c => ({ f: 'Space Mono', c });
const T = [
  { n: 'Split', sl: [['#eaeaea', '#dddddd'], ['#eaeaea', '#dddddd']], L: [0, 1].flatMap(i => [p(i + .5, .2275, .3, .3), p(i + .5, .7225, .3, .3), tx(i + .19, .5, i ? 'two' : 'one', .075, { c: '#6b6b6b', f: 'Inter' }), tx(i + .8, .5, i ? 'worlds' : 'world', .075, { c: '#6b6b6b', f: 'Inter' })]) },
  { n: 'Panorama', sl: [['#f4f1ea'], ['#f4f1ea'], ['#f4f1ea']], L: [p(1.5, .46, 2.88, 1), tx(.5, .93, 'swipe', .032, mono('#78716c')), tx(2.5, .93, 'fin.', .032, mono('#78716c'))] },
  { n: 'Triptych', sl: [['#1c1917'], ['#1c1917'], ['#1c1917']], L: [0, 1, 2].flatMap(i => [p(i + .5, .47, .84, 1.05), tx(i + .5, .93, '0' + (i + 1), .036, mono('#a8a29e'))]) },
  { n: 'Polaroid', sl: [['#e7e0d3']], L: [...pol(.34, .28, -6), ...pol(.66, .66, 5), tx(.5, .955, 'moments', .07, { f: 'Caveat', c: '#57534e' })] },
  { n: 'Photo dump', sl: [['#f4f1ea']], L: [[.27, .252], [.73, .252], [.27, .628], [.73, .628]].map(([x, y]) => p(x, y, .43, .43)).concat(tx(.5, .9, 'photo dump', .07, { f: 'Caveat', c: '#292524' })) },
  { n: 'Quote', sl: [['#26211e'], ['#f4f1ea']], L: [p(.5, .5, 1, 1.25), tx(.5, .8, 'Craft the\nlight.', .13, { c: '#ffffff', sh: 1 }), tx(1.5, .45, 'Keep it\nsimple,\nkeep it you.', .1, { f: 'Cormorant Garamond', c: '#26211e', it: 1 }), tx(1.5, .92, '@svn.lens', .035, mono('#78716c'))] },
  { n: 'Blank', sl: [['#f4f1ea']], L: [] }
];
function fromT(t) {
  const s = { ra: '4:5', sl: t.sl.map(([bg, bg2]) => ({ bg, bg2 })), L: [] }, h = H(s);
  s.L = t.L.map(o => { const l = { id: id(), r: 0, rad: 0, zoom: 1, op: 1, k: 'r', c: '#ffffff', f: 'Playfair Display', ...o }; l.x *= W; l.y *= h; if (l.t === 't') l.fs *= W; else { l.w *= W; l.h *= W; } return l; });
  return s;
}

/* ---------- Rendering (shared by gallery thumbnails and the editor) ---------- */
function mk(l) {
  const e = document.createElement('div'); e.className = 'tl tl-' + l.t; e.dataset.id = l.id;
  e.innerHTML = l.t === 'p' ? '<div class="in"><img alt=""><i class="plus">+</i></div>' : '<div class="in"></div>'; return e;
}
function up(e, l) {
  const s = e.style, n = e.firstChild, q = n.style;
  s.left = l.x + 'px'; s.top = l.y + 'px'; s.opacity = l.op; s.transform = `translate(-50%,-50%) rotate(${l.r}deg)`;
  if (l.t === 't') { n.textContent = l.s; q.font = `${l.it ? 'italic ' : ''}${l.b ? 700 : 400} ${l.fs}px/1.15 "${l.f}",serif`; q.color = l.c; q.textShadow = l.sh ? '0 4px 24px rgba(0,0,0,.35)' : 'none'; return; }
  s.width = l.w + 'px'; s.height = l.h + 'px'; q.borderRadius = l.k === 'o' ? '50%' : l.rad + 'px'; q.boxShadow = l.sh ? '0 14px 44px rgba(0,0,0,.28)' : 'none';
  if (l.t === 's') { q.background = l.c; return; }
  const [im, pl] = n.children, ok = l.src && IMG[l.src]; q.background = ok ? 'none' : '#cacaca'; im.hidden = !ok; pl.hidden = !!ok;
  if (ok) { if (im.dataset.k !== l.src) { im.src = IMG[l.src].url; im.dataset.k = l.src; } im.style.transform = `scale(${l.zoom})`; }
  const z = Math.min(l.w, l.h) * .38; pl.style.cssText = `width:${z}px;height:${z}px;font-size:${z * .7}px`;
}
function build(root, s) {
  const h = H(s); root.innerHTML = ''; root.style.width = s.sl.length * W + 'px'; root.style.height = h + 'px';
  s.sl.forEach((v, i) => { const d = document.createElement('div'); d.className = 'tpl-slide'; d.style.cssText = `left:${i * W}px;width:${W}px;height:${h}px;background:${bgOf(v)}`; root.append(d); });
  s.L.forEach(l => { const e = mk(l); up(e, l); root.append(e); });
  for (let i = 1; i < s.sl.length; i++) { const d = document.createElement('i'); d.className = 'tpl-seam'; d.style.left = i * W + 'px'; root.append(d); }
}

/* ---------- Mount UI into the existing app ---------- */
const I = d => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const shell = document.createElement('div'); shell.id = 'tplShell'; shell.className = 'tpl-shell hidden';
shell.innerHTML = `<header class="tpl-top"><button class="tpl-ic" data-a="back" aria-label="Kembali">${I('<path d="M19 12H5m6-6-6 6 6 6"/>')}</button><span class="tpl-sp"></span>
<button class="tpl-ic" id="tplUndo" data-a="undo" aria-label="Undo">${I('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>')}</button>
<button class="tpl-ic" id="tplRedo" data-a="redo" aria-label="Redo">${I('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>')}</button><span class="tpl-sp"></span>
<button class="tpl-ic" data-a="prev" aria-label="Preview">${I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')}</button>
<button class="tpl-ic" data-a="export" aria-label="Export">${I('<path d="M12 15V4m-4 4 4-4 4 4M5 13v6h14v-6"/>')}</button></header>
<p class="tpl-hint" id="tplHint"></p>
<main class="tpl-stage" id="tplStage"><div class="tpl-pan" id="tplPan"><div class="tpl-world" id="tplWorld"></div></div></main>
<section class="tpl-sheet hidden" id="tplSheet"></section>
<nav class="tpl-bar"><button data-m="color">${I('<path d="M12 3 6.5 10a7 7 0 1 0 11 0z"/>')}Color</button><button data-m="slides">${I('<rect x="7" y="4" width="10" height="16" rx="1.5"/><path d="M3.5 7v10M20.5 7v10"/>')}Slides</button>
<button data-m="layers">${I('<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>')}Layers</button><button data-m="ratio"><i class="tpl-ratio" id="tplRatio">4:5</i>Ratio</button>
<button class="tpl-fab" data-m="add" aria-label="Tambah layer">${I('<path d="M12 5v14M5 12h14"/>')}</button></nav>`;
document.body.append(shell);
const stage = $('#tplStage'), world = $('#tplWorld'), sheetEl = $('#tplSheet');
const fi = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*,.heic,.heif', multiple: true, className: 'visually-hidden-input' }); document.body.append(fi);

window.svnLensTemplates = { renderGallery: gallery };
$('#btnHomeTemplates')?.addEventListener('click', () => window.svnLens.showView('viewTemplates'));

function gallery() {
  const g = $('#tplGrid'); g.innerHTML = '';
  T.forEach(t => {
    const s = fromT(t), b = document.createElement('button'); b.className = 'tpl-card'; if (s.sl.length > 2) b.style.gridColumn = '1/-1';
    b.innerHTML = `<div class="tpl-thumb"><div class="tpl-world"></div></div><strong>${t.n}</strong><span>${s.sl.length} slide · 4:5</span>`; g.append(b);
    const th = $('.tpl-thumb', b), w = $('.tpl-world', b); build(w, s);
    w.style.setProperty('--s', Math.min((th.clientWidth - 24) / (s.sl.length * W), (th.clientHeight - 24) / H(s)));
    b.onclick = () => openT(t);
  });
}
function openT(t) {
  st = fromT(t); sel = null; mode = null; cur = 0; pv = false; hist = []; hi = -1; commit();
  $('#studioShell')?.classList.add('hidden'); shell.classList.remove('hidden', 'pv'); draw(); sheet(); stage.scrollLeft = 0;
}

/* ---------- Editor core ---------- */
function fit() {
  const sw = stage.clientWidth, sh = stage.clientHeight; if (!sw) return;
  S = Math.min(sw * .86 / W, sh * .94 / H()); const pan = $('#tplPan');
  pan.style.width = st.sl.length * W * S + 'px'; pan.style.height = H() * S + 'px';
  stage.style.paddingInline = Math.max(12, (sw - W * S) / 2) + 'px'; world.style.setProperty('--s', S);
}
const el = i => world.querySelector(`.tl[data-id="${i}"]`);
function markSel() {
  $$('.tl', world).forEach(e => {
    const on = e.dataset.id === sel, h = $('.tl-h', e); e.classList.toggle('sel', on);
    if (on && !h) { const d = document.createElement('b'); d.className = 'tl-h'; e.append(d); } if (!on && h) h.remove();
  });
}
function ind() { $('#tplHint').textContent = `Slide ${cur + 1} dari ${st.sl.length}. Ketuk + untuk isi foto, tarik titik kuning untuk ubah ukuran dan putar.`; }
function draw() { build(world, st); fit(); markSel(); ind(); }
function select(i) { if (sel === i) return; sel = i; markSel(); if (i) mode = 'edit'; else if (mode === 'edit') mode = null; sheet(); }
function commit() {
  const j = JSON.stringify(st); if (hist[hi] === j) return;
  hist = hist.slice(Math.max(0, hi - 58), hi + 1); hist.push(j); hi = hist.length - 1; btns();
}
function btns() {
  $('#tplUndo').disabled = hi < 1; $('#tplRedo').disabled = hi >= hist.length - 1; $('#tplRatio').textContent = st.ra;
  $$('.tpl-bar [data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
}
function toast(m) {
  let d = $('.tpl-toast') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'tpl-toast' }));
  d.textContent = m; d.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => d.hidden = true, 2200);
}
const goSlide = i => stage.scrollTo({ left: i * W * S, behavior: 'smooth' });
stage.addEventListener('scroll', () => { const i = Math.max(0, Math.min(st.sl.length - 1, Math.round(stage.scrollLeft / (W * S)))); if (i !== cur) { cur = i; ind(); if (mode === 'color' || mode === 'slides') sheet(); } });
addEventListener('resize', () => { if (!shell.classList.contains('hidden')) fit(); });

/* ---------- Bottom sheet ---------- */
const chip = (a, v, t, on) => `<button class="tpl-chip${on ? ' on' : ''}" data-a="${a}" data-v="${v}">${t}</button>`;
const swb = (a, v, on) => `<button class="tpl-sw${on ? ' on' : ''}" data-a="${a}" data-v="${v}" style="background:${v}" aria-label="${v}"></button>`;
const rg = (k, lab, min, max, val, step = 1) => `<div class="tpl-lab"><span>${lab}</span><b>${Math.round(val * 100) / 100}</b></div><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}">`;
function sheet() {
  btns(); const n = st.sl.length; let h = '';
  if (mode === 'color') {
    const v = st.sl[cur];
    h = `<div class="tpl-lab"><span>${allSl ? 'Semua slide' : 'Slide ' + (cur + 1)} · warna utama</span></div><div class="tpl-row">${SW.map(c => swb('bg', c, v.bg === c)).join('')}<input type="color" data-k="bg" value="${v.bg}"></div>
<div class="tpl-lab"><span>Setengah bawah (dua nada)</span></div><div class="tpl-row">${chip('bg2', '', 'Tidak ada', !v.bg2)}${SW.map(c => swb('bg2', c, v.bg2 === c)).join('')}</div>
<div class="tpl-row">${chip('allsl', '', 'Terapkan ke semua slide', allSl)}</div>`;
  } else if (mode === 'slides') {
    h = `<div class="tpl-row">${st.sl.map((_, i) => chip('go', i, i + 1, i === cur)).join('')}</div><div class="tpl-row">${chip('sladd', '', '+ Tambah slide')}${chip('sldup', '', 'Duplikat')}${chip('sldel', '', 'Hapus slide')}</div>`;
  } else if (mode === 'layers') {
    const nm = { p: 'Foto', s: 'Bentuk' };
    h = st.L.length ? [...st.L].reverse().map(l => `<div class="tpl-ly${l.id === sel ? ' on' : ''}" data-a="pick" data-v="${l.id}"><span>${l.t === 't' ? 'Teks · ' + esc(l.s.split('\n')[0].slice(0, 18)) : nm[l.t]}</span><span><button data-a="up" data-v="${l.id}" aria-label="Ke depan">▲</button><button data-a="dn" data-v="${l.id}" aria-label="Ke belakang">▼</button><button data-a="rm" data-v="${l.id}" aria-label="Hapus">✕</button></span></div>`).join('') : '<p class="tpl-note">Belum ada layer. Tekan + untuk menambah.</p>';
  } else if (mode === 'ratio') {
    h = `<div class="tpl-row">${Object.keys(RA).map(k => chip('ratio', k, k, k === st.ra)).join('')}</div>`;
  } else if (mode === 'add') {
    h = `<div class="tpl-row">${chip('add', 'p', 'Foto')}${chip('add', 't', 'Teks')}${chip('add', 'r', 'Kotak')}${chip('add', 'o', 'Lingkaran')}</div><div class="tpl-row">${chip('fill', '', 'Isi slot kosong dengan foto')}</div>`;
  } else if (mode === 'export') {
    h = `<div class="tpl-row">${chip('x1', '', n > 1 ? 'Per slide (JPG)' : 'Simpan JPG')}${n > 1 ? chip('x2', '', 'Satu gambar panorama') : ''}</div><p class="tpl-note">Slot foto yang masih kosong tidak ikut diekspor.</p>`;
  } else if (mode === 'src') {
    const ps = window.svnLens.photos();
    h = `<div class="tpl-lab"><span>Dari Library</span></div><div class="tpl-row">${ps.map(q => `<button class="tpl-lib" data-a="lib" data-v="${q.id}" aria-label="${esc(q.title || 'Foto')}"><img src="${q.editedThumbUrl || q.thumbUrl}" alt=""></button>`).join('') || '<span class="tpl-note">Library masih kosong.</span>'}</div><div class="tpl-row">${chip('dev', '', 'Dari galeri perangkat')}${chip('shut', '', 'Tutup')}</div>`;
  } else if (mode === 'edit' && sel && lay(sel)) {
    const l = lay(sel), cols = `<div class="tpl-row">${SW.map(c => swb('col', c, l.c === c)).join('')}<input type="color" data-k="c" value="${l.c}"></div>`;
    if (l.t === 't') h = `<textarea class="tpl-in" data-k="s" rows="2">${esc(l.s)}</textarea><div class="tpl-row">${FONTS.map(f => `<button class="tpl-chip${l.f === f ? ' on' : ''}" data-a="font" data-v="${f}" style="font-family:'${f}'">${f}</button>`).join('')}</div>${rg('fs', 'Ukuran', 20, 400, Math.round(l.fs))}${cols}<div class="tpl-row">${chip('tg', 'b', 'Tebal', l.b)}${chip('tg', 'it', 'Miring', l.it)}${chip('tg', 'sh', 'Bayangan', l.sh)}</div>`;
    else {
      h = rg('w', 'Lebar', 60, 3300, Math.round(l.w)) + rg('h', 'Tinggi', 60, 2000, Math.round(l.h));
      if (l.t === 'p') h += `<div class="tpl-row">${chip('replace', '', l.src ? 'Ganti foto' : 'Pilih foto')}</div>${rg('zoom', 'Zoom', 1, 3, l.zoom, .01)}`; else h += cols;
      if (l.k !== 'o') h += rg('rad', 'Sudut', 0, 540, Math.round(l.rad)); h += `<div class="tpl-row">${chip('tg', 'sh', 'Bayangan', l.sh)}</div>`;
    }
    h += rg('op', 'Opasitas', .1, 1, l.op, .01) + `<div class="tpl-row">${chip('dup', '', 'Duplikat')}${chip('up', sel, 'Ke depan')}${chip('dn', sel, 'Ke belakang')}${chip('rm', sel, 'Hapus')}</div>`;
  }
  sheetEl.innerHTML = h; sheetEl.classList.toggle('hidden', !mode);
}
sheetEl.addEventListener('input', e => {
  const k = e.target.dataset.k; if (!k) return;
  if (k === 'bg') return setBg('bg', e.target.value);
  const l = lay(sel); if (!l) return; l[k] = k === 's' || k === 'c' ? e.target.value : +e.target.value; up(el(l.id), l);
  if (e.target.type === 'range') e.target.previousElementSibling.lastChild.textContent = Math.round(e.target.value * 100) / 100;
});
sheetEl.addEventListener('change', e => { if (e.target.dataset.k) commit(); });

/* ---------- Actions ---------- */
function setBg(k, v) {
  (allSl ? st.sl : [st.sl[cur]]).forEach(s => { if (v) s[k] = v; else delete s[k]; });
  $$('.tpl-slide', world).forEach((d, i) => d.style.background = bgOf(st.sl[i]));
}
function add(t) {
  const x = cur * W + W / 2, y = H() / 2, b = { id: id(), x, y, r: 0, op: 1, rad: 0, zoom: 1, k: 'r' };
  const l = t === 'p' ? { ...b, t: 'p', w: W * .5, h: W * .5 } : t === 't' ? { ...b, t: 't', s: 'Teks', fs: W * .1, f: 'Playfair Display', c: '#26211e' } : { ...b, t: 's', w: W * .3, h: W * .3, c: '#26211e', k: t === 'o' ? 'o' : 'r' };
  st.L.push(l); draw(); sel = null; select(l.id); commit();
}
function mv(i, d) { const a = st.L.findIndex(l => l.id === i), b = a + d; if (b < 0 || b >= st.L.length) return; [st.L[a], st.L[b]] = [st.L[b], st.L[a]]; draw(); commit(); sheet(); }
function rm(i) { st.L = st.L.filter(l => l.id !== i); if (sel === i) sel = null; if (mode === 'edit') mode = null; draw(); commit(); sheet(); }
const sIdx = l => Math.floor(l.x / W);
function act(a, v) {
  const n = st.sl.length;
  switch (a) {
    case 'back': if (hist.length > 1 && !confirm('Keluar dari template? Perubahan belum disimpan.')) return; shell.classList.add('hidden'); window.svnLens.showView('viewTemplates'); return;
    case 'undo': case 'redo': { const j = hi + (a === 'undo' ? -1 : 1); if (j < 0 || j >= hist.length) return; hi = j; st = JSON.parse(hist[hi]); sel = null; if (mode === 'edit') mode = null; cur = Math.min(cur, st.sl.length - 1); draw(); sheet(); return; }
    case 'prev': pv = !pv; shell.classList.toggle('pv', pv); if (pv) { mode = null; sel = null; markSel(); sheet(); } fit(); return;
    case 'export': mode = mode === 'export' ? null : 'export'; sel = null; markSel(); break;
    case 'bg': case 'bg2': setBg(a, v); commit(); break;
    case 'allsl': allSl = !allSl; break;
    case 'go': cur = +v; goSlide(cur); ind(); break;
    case 'sladd': if (n >= 10) return toast('Maksimal 10 slide'); st.sl.push({ ...st.sl[n - 1] }); cur = n; draw(); goSlide(cur); commit(); break;
    case 'sldup': { if (n >= 10) return toast('Maksimal 10 slide'); const cp = st.L.filter(l => sIdx(l) === cur).map(l => ({ ...l, id: id(), x: l.x + W })); st.L.forEach(l => { if (sIdx(l) > cur) l.x += W; }); st.L.push(...cp); st.sl.splice(cur + 1, 0, { ...st.sl[cur] }); cur++; draw(); goSlide(cur); commit(); break; }
    case 'sldel': if (n < 2) return toast('Minimal satu slide'); st.L = st.L.filter(l => sIdx(l) !== cur); st.L.forEach(l => { if (sIdx(l) > cur) l.x -= W; }); st.sl.splice(cur, 1); cur = Math.min(cur, n - 2); draw(); commit(); break;
    case 'ratio': { const o = H(); st.ra = v; const f = H() / o; st.L.forEach(l => l.y *= f); draw(); commit(); break; }
    case 'pick': sel = null; select(v); return;
    case 'up': mv(v, 1); return; case 'dn': mv(v, -1); return; case 'rm': rm(v); return;
    case 'dup': { const c = { ...lay(sel), id: id() }; c.x += 40; c.y += 40; st.L.push(c); sel = null; draw(); select(c.id); commit(); return; }
    case 'add': add(v); return;
    case 'fill': pick(null); return; case 'replace': pick(sel); return;
    case 'font': case 'col': case 'tg': { const l = lay(sel); if (a === 'font') l.f = v; else if (a === 'col') l.c = v; else l[v] = !l[v]; up(el(l.id), l); commit(); break; }
    case 'lib': useLib(v); return; case 'dev': devPick(); return; case 'shut': mode = null; break;
    case 'x1': exportAll(false); return; case 'x2': exportAll(true); return;
  }
  sheet();
}
shell.addEventListener('click', e => {
  const b = e.target.closest('[data-a],[data-m]'); if (!b || !shell.contains(b)) return;
  if (b.dataset.m) { const m = b.dataset.m; mode = mode === m ? null : m; if (mode) { sel = null; markSel(); } sheet(); } else act(b.dataset.a, b.dataset.v);
});

/* ---------- Dragging, resizing & rotating layers ---------- */
const snap = (v, t) => { for (const c of t) if (Math.abs(v - c) < 8 / S) return c; return v; };
world.addEventListener('pointerdown', e => {
  if (pv) return; const le = e.target.closest('.tl'); if (!le) { select(null); return; }
  const l = lay(le.dataset.id), hd = !!e.target.closest('.tl-h'); if (sel !== l.id) select(l.id);
  const r = le.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  drag = { l, hd, px: e.clientX, py: e.clientY, x: l.x, y: l.y, cx, cy, d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, a0: Math.atan2(e.clientY - cy, e.clientX - cx), w: l.w, h: l.h, fs: l.fs, r: l.r, moved: false };
  if (hd) e.preventDefault();
});
addEventListener('pointermove', e => {
  if (!drag) return; const d = drag, l = d.l, dx = e.clientX - d.px, dy = e.clientY - d.py;
  if (!d.moved && Math.hypot(dx, dy) < 5) return; d.moved = true;
  if (d.hd) {
    const k = Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.d0;
    if (l.t === 't') l.fs = Math.max(16, d.fs * k); else { l.w = Math.max(40, d.w * k); l.h = Math.max(40, d.h * k); }
    let r = d.r + (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) - d.a0) * 180 / Math.PI; r = ((r + 180) % 360 + 360) % 360 - 180;
    l.r = Math.abs(r % 90) < 4 || Math.abs(r % 90) > 86 ? Math.round(r / 90) * 90 : Math.round(r * 10) / 10;
  } else {
    l.x = snap(d.x + dx / S, st.sl.flatMap((_, i) => [i * W + W / 2, i * W, (i + 1) * W])); l.y = snap(d.y + dy / S, [H() / 2]);
  }
  up(el(l.id), l);
});
addEventListener('pointerup', () => {
  if (!drag) return; const d = drag; drag = null;
  if (d.moved) { commit(); if (mode === 'edit') sheet(); } else if (d.l.t === 'p' && !d.l.src && !d.hd) pick(d.l.id);
});
addEventListener('pointercancel', () => { drag = null; });

/* ---------- Photos ---------- */
function pick(i) { pend = i; sel = null; markSel(); mode = 'src'; sheet(); }
function devPick() { fi.value = ''; fi.click(); }
const KEYS = new WeakMap();
async function libKey(q) {
  const c = q.editedCanvas || q.workingBaseCanvas; if (KEYS.has(c)) return KEYS.get(c);
  const k = await toKey(c); KEYS.set(c, k); return k;
}
async function useLib(pid) {
  const slots = st.L.filter(l => l.t === 'p' && (!l.src || l.id === pend)).sort((a, b) => (b.id === pend) - (a.id === pend));
  if (!slots.length) return toast('Tidak ada slot kosong. Tambah foto lewat tombol +');
  const q = window.svnLens.photos().find(x => x.id === pid); if (!q) return;
  try { slots[0].src = await libKey(q); pend = null; if (!st.L.some(l => l.t === 'p' && !l.src)) mode = null; draw(); commit(); sheet(); }
  catch (e) { toast('Foto gagal dimuat'); }
}
async function load(f) {
  let b = f; if (/hei[cf]/i.test(f.type + f.name) && window.heic2any) { b = await window.heic2any({ blob: f, toType: 'image/jpeg', quality: .92 }); b = Array.isArray(b) ? b[0] : b; }
  return toKey(b);
}
async function toKey(src) {
  const bm = src instanceof Blob ? await createImageBitmap(src) : src, k = Math.min(1, 2400 / Math.max(bm.width, bm.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bm.width * k); cv.height = Math.round(bm.height * k); cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
  const b = await new Promise(r => cv.toBlob(r, 'image/jpeg', .92)), url = URL.createObjectURL(b), img = new Image(); img.src = url; await img.decode();
  const key = 'i' + uid++; IMG[key] = { img, url }; return key;
}
fi.onchange = async () => {
  const fs = [...fi.files]; if (!fs.length) return;
  const slots = st.L.filter(l => l.t === 'p' && (!l.src || l.id === pend)).sort((a, b) => (b.id === pend) - (a.id === pend));
  if (!slots.length) return toast('Tidak ada slot kosong. Tambah foto lewat tombol +');
  toast('Memuat foto…');
  try { for (let i = 0; i < Math.min(fs.length, slots.length); i++) slots[i].src = await load(fs[i]); mode = null; draw(); commit(); sheet(); toast('Foto ditambahkan'); }
  catch (e) { toast('Foto gagal dimuat'); }
};

/* ---------- Export ---------- */
async function paint() {
  const n = st.sl.length, h = H(), c = document.createElement('canvas'); c.width = n * W; c.height = h; const x = c.getContext('2d');
  await Promise.all(FONTS.map(f => document.fonts.load(`40px "${f}"`).catch(() => 0)));
  st.sl.forEach((v, i) => { x.fillStyle = v.bg; x.fillRect(i * W, 0, W, h); if (v.bg2) { x.fillStyle = v.bg2; x.fillRect(i * W, h / 2, W, h / 2); } });
  const shd = (b, o, a) => { x.shadowColor = `rgba(0,0,0,${a})`; x.shadowBlur = b; x.shadowOffsetY = o; };
  for (const l of st.L) {
    x.save(); x.translate(l.x, l.y); x.rotate(l.r * Math.PI / 180); x.globalAlpha = l.op;
    if (l.t === 't') {
      x.font = `${l.it ? 'italic ' : ''}${l.b ? 700 : 400} ${l.fs}px "${l.f}",serif`; x.fillStyle = l.c; x.textAlign = 'center'; x.textBaseline = 'middle'; if (l.sh) shd(24, 4, .35);
      const ls = l.s.split('\n'); ls.forEach((t, i) => x.fillText(t, 0, (i - (ls.length - 1) / 2) * l.fs * 1.15));
    } else {
      x.beginPath(); if (l.k === 'o') x.ellipse(0, 0, l.w / 2, l.h / 2, 0, 0, 7); else x.roundRect(-l.w / 2, -l.h / 2, l.w, l.h, l.rad);
      if (l.t === 's') { if (l.sh) shd(44, 14, .28); x.fillStyle = l.c; x.fill(); }
      else if (IMG[l.src]) { if (l.sh) { shd(44, 14, .28); x.fillStyle = '#000'; x.fill(); x.shadowColor = 'transparent'; } x.clip(); const im = IMG[l.src].img, k = Math.max(l.w / im.width, l.h / im.height) * l.zoom; x.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k); }
    }
    x.restore();
  }
  return c;
}
async function exportAll(pano) {
  toast('Menyiapkan gambar…'); const c = await paint(), n = st.sl.length, h = H(), blob = cv => new Promise(r => cv.toBlob(r, 'image/jpeg', .95)), out = [];
  if (pano || n === 1) out.push(await blob(c)); else for (let i = 0; i < n; i++) { const d = document.createElement('canvas'); d.width = W; d.height = h; d.getContext('2d').drawImage(c, i * W, 0, W, h, 0, 0, W, h); out.push(await blob(d)); }
  const files = out.map((b, i) => new File([b], `svnlens-tpl-${pano ? 'pano' : i + 1}.jpg`, { type: 'image/jpeg' }));
  if (navigator.canShare?.({ files })) { try { await navigator.share({ files }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  files.forEach((f, i) => setTimeout(() => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); }, i * 350)); toast('Gambar diunduh');
}
})();

/* ==========================================
   Geser strip horizontal dengan mouse (drag) & scroll wheel
   ========================================== */
(() => {
  const SEL = '.subcat-bar,.thumb-strip,.tools-icon-strip,.font-cards-strip,.text-pills-row,.tool-context-extras,.color-palette-strip';
  let el = null, sx = 0, sl = 0, moved = false;
  document.addEventListener('pointerdown', e => {
    moved = false; if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const t = e.target.closest(SEL); if (!t || t.scrollWidth <= t.clientWidth) return;
    el = t; sx = e.clientX; sl = t.scrollLeft;
  });
  addEventListener('pointermove', e => {
    if (!el) return; const dx = e.clientX - sx; if (!moved && Math.abs(dx) < 5) return;
    moved = true; el.scrollLeft = sl - dx;
  });
  addEventListener('pointerup', () => { el = null; });
  document.addEventListener('click', e => { if (moved && e.target.closest(SEL)) { e.stopPropagation(); e.preventDefault(); } moved = false; }, true);
  document.addEventListener('wheel', e => {
    const t = e.target.closest(SEL); if (!t || t.scrollWidth <= t.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    t.scrollLeft += e.deltaY; e.preventDefault();
  }, { passive: false });
})();
