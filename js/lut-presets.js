/**
 * svn.lens Studio — Film Presets, 3D LUT Engine (.cube), Light Leaks, Film Burns & Editorial Fonts
 */

const FILM_PRESETS = [
    // NEGATIVE FILM STOCKS (Matches Screenshot 7: ORIGINAL, P160, P400, P400+1, P800...)
    {
        id: 'original',
        code: 'ORIGINAL',
        name: 'Original',
        category: 'negative',
        subLabel: 'NO PRESET',
        params: {}
    },
    {
        id: 'p160',
        code: 'P160',
        name: 'Portra 160 Natural',
        category: 'negative',
        subLabel: 'NEGATIVE FILM',
        params: {
            brightness: 4,
            contrast: 6,
            saturation: -6,
            warmth: 10,
            fade: 8,
            shadowsTint: [22, 18, 20],
            highlightsTint: [255, 246, 232],
            splitStrength: 0.18
        }
    },
    {
        id: 'p400',
        code: 'P400',
        name: 'Portra 400 Warm',
        category: 'negative',
        subLabel: 'NEGATIVE FILM',
        params: {
            brightness: 6,
            contrast: 12,
            saturation: 10,
            warmth: 20,
            tint: 5,
            fade: 10,
            shadowsTint: [28, 18, 24],
            highlightsTint: [255, 240, 212],
            splitStrength: 0.25
        }
    },
    {
        id: 'p400_plus1',
        code: 'P400+1',
        name: 'Portra 400 (+1 Stop)',
        category: 'negative',
        subLabel: 'OVEREXPOSED FILM',
        params: {
            brightness: 16,
            exposure: 12,
            contrast: -4,
            saturation: 6,
            warmth: 24,
            fade: 18,
            shadowsTint: [38, 30, 32],
            highlightsTint: [255, 248, 225],
            splitStrength: 0.28
        }
    },
    {
        id: 'p800',
        code: 'P800',
        name: 'Portra 800 Vibrant',
        category: 'negative',
        subLabel: 'NEGATIVE FILM',
        params: {
            brightness: 5,
            contrast: 18,
            saturation: 18,
            warmth: 26,
            tint: 8,
            fade: 8,
            shadowsTint: [32, 16, 28],
            highlightsTint: [255, 232, 194],
            splitStrength: 0.28
        }
    },
    {
        id: 'gold200',
        code: 'GOLD 200',
        name: 'Kodak Gold 200',
        category: 'negative',
        subLabel: 'NEGATIVE FILM',
        params: {
            brightness: 8,
            contrast: 15,
            saturation: 16,
            warmth: 32,
            fade: 12,
            shadowsTint: [35, 22, 14],
            highlightsTint: [255, 236, 182],
            splitStrength: 0.3
        }
    },
    {
        id: 'superia400',
        code: 'SUPERIA',
        name: 'Fuji Superia 400',
        category: 'negative',
        subLabel: 'NEGATIVE FILM',
        params: {
            brightness: 4,
            contrast: 14,
            saturation: 8,
            warmth: -6,
            tint: -14,
            fade: 12,
            shadowsTint: [10, 34, 24],
            highlightsTint: [245, 252, 238],
            splitStrength: 0.25
        }
    },

    // SLIDE FILM
    {
        id: 'velvia50',
        code: 'VELVIA 50',
        name: 'Fuji Velvia 50',
        category: 'slide',
        subLabel: 'SLIDE FILM',
        params: {
            contrast: 26,
            saturation: 36,
            warmth: 8,
            tint: 6,
            shadowsTint: [12, 8, 22],
            highlightsTint: [255, 242, 225],
            splitStrength: 0.2
        }
    },
    {
        id: 'provia100',
        code: 'PROVIA',
        name: 'Fuji Provia 100F',
        category: 'slide',
        subLabel: 'SLIDE FILM',
        params: {
            contrast: 16,
            saturation: 14,
            warmth: -6,
            shadowsTint: [14, 22, 34],
            highlightsTint: [248, 250, 255],
            splitStrength: 0.22
        }
    },
    {
        id: 'ektachrome',
        code: 'E100',
        name: 'Kodak Ektachrome E100',
        category: 'slide',
        subLabel: 'SLIDE FILM',
        params: {
            contrast: 20,
            saturation: 12,
            warmth: -14,
            tint: 4,
            shadowsTint: [10, 28, 46],
            highlightsTint: [240, 250, 255],
            splitStrength: 0.26
        }
    },

    // CINEMA STOCKS
    {
        id: 'cinestill800t',
        code: '800T',
        name: 'CineStill 800T Tungsten',
        category: 'cinema',
        subLabel: 'CINEMA FILM',
        params: {
            brightness: -3,
            contrast: 22,
            saturation: 10,
            warmth: -26,
            tint: -6,
            fade: 8,
            shadowsTint: [6, 34, 52],
            highlightsTint: [215, 248, 255],
            splitStrength: 0.34
        }
    },
    {
        id: 'teal_orange',
        code: 'TEAL/ORG',
        name: 'Teal & Orange Cinema',
        category: 'cinema',
        subLabel: 'CINEMA LUT',
        params: {
            contrast: 22,
            saturation: 14,
            warmth: 10,
            shadowsTint: [0, 50, 66],
            highlightsTint: [255, 196, 138],
            splitStrength: 0.38
        }
    },
    {
        id: 'kodak2383',
        code: '2383 PRINT',
        name: 'Kodak 2383 Print LUT',
        category: 'cinema',
        subLabel: 'CINEMA PRINT',
        params: {
            contrast: 28,
            saturation: 8,
            warmth: 12,
            fade: 6,
            shadowsTint: [8, 28, 36],
            highlightsTint: [255, 236, 198],
            splitStrength: 0.3
        }
    },
    {
        id: 'cyber_neon',
        code: 'CYBER',
        name: 'Cyberpunk Neon Night',
        category: 'cinema',
        subLabel: 'CINEMA LUT',
        params: {
            contrast: 26,
            saturation: 32,
            warmth: -18,
            tint: 30,
            shadowsTint: [28, 10, 62],
            highlightsTint: [255, 185, 245],
            splitStrength: 0.35
        }
    },

    // INSTANT FILM
    {
        id: 'polaroid600',
        code: 'POLA 600',
        name: 'Polaroid 600 Classic',
        category: 'instant',
        subLabel: 'INSTANT FILM',
        params: {
            brightness: 8,
            contrast: 10,
            saturation: -12,
            warmth: 18,
            tint: -8,
            fade: 24,
            shadowsTint: [22, 36, 38],
            highlightsTint: [255, 242, 210],
            splitStrength: 0.3
        }
    },
    {
        id: 'disposable90s',
        code: 'DISP 90S',
        name: 'Disposable Camera 90s',
        category: 'instant',
        subLabel: 'INSTANT FILM',
        params: {
            brightness: 4,
            contrast: 16,
            saturation: -6,
            warmth: 16,
            tint: -16,
            fade: 22,
            shadowsTint: [16, 44, 30],
            highlightsTint: [255, 240, 196],
            splitStrength: 0.3
        }
    },
    {
        id: 'instax_soft',
        code: 'INSTAX',
        name: 'Instax Mini Airy',
        category: 'instant',
        subLabel: 'INSTANT FILM',
        params: {
            brightness: 14,
            contrast: -6,
            saturation: -8,
            warmth: 6,
            fade: 20,
            shadowsTint: [30, 34, 44],
            highlightsTint: [255, 246, 242],
            splitStrength: 0.24
        }
    },

    // MODERN AESTHETIC & B&W
    {
        id: 'fuji_chrome',
        code: 'CHROME',
        name: 'Fuji Classic Chrome',
        category: 'aesthetic',
        subLabel: 'MODERN AESTHETIC',
        params: {
            contrast: 18,
            saturation: -16,
            warmth: 8,
            fade: 12,
            shadowsTint: [10, 18, 16],
            highlightsTint: [255, 244, 228],
            splitStrength: 0.22
        }
    },
    {
        id: 'korean_peach',
        code: 'KR PEACH',
        name: 'Korean Soft Peach',
        category: 'aesthetic',
        subLabel: 'MODERN AESTHETIC',
        params: {
            brightness: 14,
            contrast: -8,
            saturation: 8,
            warmth: 14,
            tint: 16,
            fade: 16,
            shadowsTint: [45, 32, 38],
            highlightsTint: [255, 236, 238],
            splitStrength: 0.28
        }
    },
    {
        id: 'matcha_indie',
        code: 'MATCHA',
        name: 'Matcha Cafe Aesthetic',
        category: 'aesthetic',
        subLabel: 'MODERN AESTHETIC',
        params: {
            brightness: 6,
            contrast: -4,
            saturation: -14,
            warmth: 14,
            tint: -18,
            fade: 18,
            shadowsTint: [22, 38, 24],
            highlightsTint: [248, 250, 225],
            splitStrength: 0.26
        }
    },
    {
        id: 'golden_hour',
        code: 'GOLDEN',
        name: 'Golden Hour Glow',
        category: 'aesthetic',
        subLabel: 'MODERN AESTHETIC',
        params: {
            brightness: 6,
            contrast: 12,
            saturation: 22,
            warmth: 36,
            tint: 10,
            shadowsTint: [40, 16, 30],
            highlightsTint: [255, 222, 162],
            splitStrength: 0.3
        }
    },
    {
        id: 'y2k_digicam',
        code: 'Y2K CAM',
        name: 'Y2K Cyber Digicam',
        category: 'aesthetic',
        subLabel: 'MODERN AESTHETIC',
        params: {
            brightness: 10,
            contrast: 24,
            saturation: 26,
            warmth: -14,
            tint: 12,
            shadowsTint: [10, 26, 46],
            highlightsTint: [232, 255, 255],
            splitStrength: 0.25
        }
    },
    {
        id: 'ilford_hp5',
        code: 'HP5 B&W',
        name: 'Ilford HP5 Plus 400',
        category: 'aesthetic',
        subLabel: 'MONOCHROME FILM',
        params: {
            brightness: 4,
            contrast: 22,
            saturation: -100,
            fade: 14
        }
    },
    {
        id: 'leica_noir',
        code: 'NOIR B&W',
        name: 'Leica Mono Noir',
        category: 'aesthetic',
        subLabel: 'MONOCHROME FILM',
        params: {
            brightness: 2,
            contrast: 38,
            saturation: -100,
            fade: 4
        }
    },

    // ==========================================
    // VSCO SOFT (VSCO-style, Clean Girl, Latte, Dreamy)
    // Mendukung params tambahan: highlights, shadows, vibrance, grain & curve (tone curve per channel)
    // ==========================================
    {
        id: 'gz_a6', code: 'A6', name: 'A6 Analog Soft', category: 'genz', subLabel: 'VSCO PRESET',
        params: {
            brightness: 6, contrast: -6, saturation: -14, warmth: 12, highlights: -10, shadows: 10, grain: 10,
            shadowsTint: [40, 34, 30], highlightsTint: [255, 238, 214], splitStrength: 0.14,
            curve: { rgb: [[0, 26], [70, 78], [190, 196], [255, 242]] }
        }
    },
    {
        id: 'gz_c1', code: 'C1', name: 'C1 Chromatic Pop', category: 'genz', subLabel: 'VSCO PRESET',
        params: {
            brightness: 8, contrast: 14, vibrance: 34, saturation: 6, warmth: -4, highlights: -8,
            curve: { rgb: [[0, 6], [64, 56], [192, 206], [255, 255]], b: [[0, 18], [255, 245]] }
        }
    },
    {
        id: 'gz_hb2', code: 'HB2', name: 'HB2 Cool Matte', category: 'genz', subLabel: 'VSCO PRESET',
        params: {
            brightness: 4, contrast: -4, saturation: -18, warmth: -14, tint: -4, grain: 8,
            curve: { rgb: [[0, 34], [128, 128], [255, 236]], b: [[0, 30], [255, 250]] }
        }
    },
    {
        id: 'gz_m5', code: 'M5', name: 'M5 Faded Moody', category: 'genz', subLabel: 'VSCO PRESET',
        params: {
            brightness: -4, contrast: 6, saturation: -24, warmth: 8, highlights: -16, grain: 12,
            shadowsTint: [30, 32, 36], highlightsTint: [240, 226, 206], splitStrength: 0.18,
            curve: { rgb: [[0, 30], [80, 74], [200, 194], [255, 228]] }
        }
    },
    {
        id: 'gz_f2', code: 'F2', name: 'F2 Clean Film', category: 'genz', subLabel: 'VSCO PRESET',
        params: {
            brightness: 6, contrast: 4, saturation: -8, warmth: -6, vibrance: 10,
            curve: { rgb: [[0, 14], [64, 66], [192, 198], [255, 250]], g: [[0, 6], [255, 252]] }
        }
    },
    {
        id: 'gz_clean_girl', code: 'CLEAN', name: 'Clean Girl Glow', category: 'genz', subLabel: 'SOFT GLOW',
        params: {
            exposure: 8, brightness: 10, contrast: -8, warmth: 10, tint: 4, saturation: -6, highlights: -18, shadows: 14,
            shadowsTint: [60, 44, 40], highlightsTint: [255, 236, 226], splitStrength: 0.12,
            curve: { rgb: [[0, 18], [128, 140], [255, 250]] }
        }
    },
    {
        id: 'gz_latte', code: 'LATTE', name: 'Latte Brown', category: 'genz', subLabel: 'CAFE AESTHETIC',
        params: {
            brightness: 2, contrast: 8, saturation: -30, warmth: 26, highlights: -12, grain: 8,
            shadowsTint: [54, 36, 24], highlightsTint: [246, 224, 196], splitStrength: 0.26,
            curve: { rgb: [[0, 22], [96, 90], [255, 238]], b: [[0, 10], [255, 226]] }
        }
    },
    {
        id: 'gz_peach', code: 'PEACH', name: 'Peachy Keen', category: 'genz', subLabel: 'SOFT GLOW',
        params: {
            brightness: 8, contrast: -2, warmth: 16, tint: 10, vibrance: 12, highlights: -8,
            shadowsTint: [70, 40, 44], highlightsTint: [255, 222, 204], splitStrength: 0.16,
            curve: { r: [[0, 12], [128, 140], [255, 255]], rgb: [[0, 14], [255, 248]] }
        }
    },
    {
        id: 'gz_dreamy', code: 'DREAMY', name: 'Dreamy Sky Pastel', category: 'genz', subLabel: 'PASTEL',
        params: {
            exposure: 6, brightness: 8, contrast: -14, saturation: -10, warmth: -8, tint: 6, highlights: -20, shadows: 16,
            shadowsTint: [74, 70, 104], highlightsTint: [255, 240, 246], splitStrength: 0.18,
            curve: { rgb: [[0, 40], [128, 138], [255, 244]] }
        }
    },

    // ==========================================
    // Y2K DIGICAM (CCD, Flash, Disposable)
    // ==========================================
    {
        id: 'y2k_ccd', code: 'CCD', name: 'CCD Digicam 2003', category: 'digicam', subLabel: 'Y2K DIGICAM',
        params: {
            brightness: 6, contrast: 18, saturation: 10, warmth: -14, tint: -6, highlights: 12, grain: 14,
            curve: { rgb: [[0, 8], [64, 52], [192, 214], [255, 255]], b: [[0, 20], [255, 255]] }
        }
    },
    {
        id: 'y2k_flash', code: 'FLASH', name: 'Party Flash', category: 'digicam', subLabel: 'Y2K DIGICAM',
        params: {
            exposure: 10, brightness: 6, contrast: 26, saturation: 4, warmth: -6, highlights: 16, shadows: -18, grain: 10,
            curve: { rgb: [[0, 0], [60, 36], [180, 210], [255, 255]] }
        }
    },
    {
        id: 'y2k_cyber', code: 'CYBER', name: 'Cybershot Blue', category: 'digicam', subLabel: 'Y2K DIGICAM',
        params: {
            brightness: 4, contrast: 14, saturation: -4, warmth: -24, tint: -8, grain: 12,
            curve: { b: [[0, 30], [128, 146], [255, 255]], r: [[0, 0], [255, 236]] }
        }
    },
    {
        id: 'y2k_ixus', code: 'IXUS', name: 'Pocket Cam Warm', category: 'digicam', subLabel: 'Y2K DIGICAM',
        params: {
            brightness: 8, contrast: 16, vibrance: 18, warmth: 18, tint: 6, highlights: 10, grain: 10,
            curve: { rgb: [[0, 6], [70, 60], [190, 208], [255, 255]], g: [[0, 8], [255, 248]] }
        }
    },
    {
        id: 'y2k_vga', code: 'VGA CAM', name: 'VGA Phone Cam 2007', category: 'digicam', subLabel: 'Y2K LO-FI',
        params: {
            brightness: 4, contrast: 22, saturation: -20, warmth: 6, tint: -10, fade: 10, grain: 26,
            curve: { rgb: [[0, 20], [64, 50], [192, 216], [255, 246]], g: [[0, 14], [255, 255]] }
        }
    },
    {
        id: 'y2k_dispo', code: 'DISPO', name: 'Disposable Cam', category: 'digicam', subLabel: 'Y2K FILM',
        params: {
            brightness: 6, contrast: 12, saturation: 8, warmth: 20, tint: -6, fade: 8, grain: 20,
            shadowsTint: [20, 34, 30], highlightsTint: [255, 236, 200], splitStrength: 0.2,
            curve: { rgb: [[0, 16], [64, 58], [192, 206], [255, 248]] }
        }
    },

    // ==========================================
    // K-SOFT (Korean / Japanese Airy Aesthetic)
    // ==========================================
    {
        id: 'k_seoul', code: 'SEOUL', name: 'Seoul Café', category: 'korean', subLabel: 'K-AESTHETIC',
        params: {
            exposure: 8, brightness: 10, contrast: -10, saturation: -16, warmth: 6, highlights: -14, shadows: 18,
            curve: { rgb: [[0, 24], [128, 142], [255, 252]] }
        }
    },
    {
        id: 'k_milk', code: 'MILK', name: 'Milky Skin', category: 'korean', subLabel: 'K-AESTHETIC',
        params: {
            exposure: 12, brightness: 12, contrast: -16, saturation: -22, warmth: 4, tint: 6, highlights: -20, shadows: 20,
            curve: { rgb: [[0, 36], [128, 150], [255, 250]] }
        }
    },
    {
        id: 'k_blossom', code: 'BLOSSOM', name: 'Cherry Blossom', category: 'korean', subLabel: 'K-AESTHETIC',
        params: {
            brightness: 10, contrast: -8, warmth: 2, tint: 16, vibrance: 8, highlights: -12, shadows: 12,
            shadowsTint: [84, 56, 72], highlightsTint: [255, 232, 240], splitStrength: 0.16,
            curve: { r: [[0, 16], [255, 255]], rgb: [[0, 20], [255, 250]] }
        }
    },
    {
        id: 'k_jeju', code: 'JEJU', name: 'Jeju Breeze', category: 'korean', subLabel: 'K-AESTHETIC',
        params: {
            brightness: 8, contrast: -6, saturation: -6, warmth: -12, tint: -6, vibrance: 14, highlights: -10, shadows: 14,
            curve: { rgb: [[0, 22], [255, 250]], g: [[0, 10], [128, 136], [255, 255]], b: [[0, 18], [255, 255]] }
        }
    },
    {
        id: 'k_tokyo', code: 'TOKYO', name: 'Tokyo Airy', category: 'korean', subLabel: 'J-AESTHETIC',
        params: {
            exposure: 14, brightness: 10, contrast: -14, saturation: -18, warmth: -6, tint: -10, highlights: -16, shadows: 22, grain: 6,
            curve: { rgb: [[0, 30], [128, 150], [255, 252]], g: [[0, 8], [255, 255]] }
        }
    },
    {
        id: 'k_vanilla', code: 'VANILLA', name: 'Vanilla Cream', category: 'korean', subLabel: 'K-AESTHETIC',
        params: {
            exposure: 6, brightness: 8, contrast: -10, saturation: -20, warmth: 14, highlights: -14, shadows: 14,
            shadowsTint: [70, 58, 44], highlightsTint: [255, 244, 222], splitStrength: 0.18,
            curve: { rgb: [[0, 28], [128, 140], [255, 246]] }
        }
    },

    // ==========================================
    // MOODY (Dark Academia, Grunge, Night Drive)
    // ==========================================
    {
        id: 'm_academia', code: 'ACADEMIA', name: 'Dark Academia', category: 'moody', subLabel: 'MOODY',
        params: {
            exposure: -8, contrast: 14, saturation: -28, warmth: 22, highlights: -18, shadows: -6, grain: 14,
            shadowsTint: [36, 26, 18], highlightsTint: [232, 210, 170], splitStrength: 0.24,
            curve: { rgb: [[0, 14], [96, 80], [200, 200], [255, 232]] }
        }
    },
    {
        id: 'm_grunge', code: 'GRUNGE', name: 'Indie Grunge', category: 'moody', subLabel: 'MOODY',
        params: {
            exposure: -6, contrast: 18, saturation: -34, warmth: 6, tint: -10, fade: 10, grain: 22,
            curve: { rgb: [[0, 20], [70, 56], [200, 210], [255, 238]], g: [[0, 10], [255, 248]] }
        }
    },
    {
        id: 'm_night', code: 'NIGHT', name: 'Night Drive', category: 'moody', subLabel: 'CINEMATIC MOODY',
        params: {
            exposure: -6, contrast: 20, vibrance: 16, warmth: -10, tint: 10, highlights: -10, grain: 12,
            shadowsTint: [10, 36, 52], highlightsTint: [255, 196, 214], splitStrength: 0.26,
            curve: { rgb: [[0, 10], [64, 48], [192, 204], [255, 250]], b: [[0, 34], [255, 236]] }
        }
    },
    {
        id: 'm_forest', code: 'FOREST', name: 'Forest Moody', category: 'moody', subLabel: 'MOODY',
        params: {
            exposure: -8, contrast: 12, saturation: -20, warmth: -4, tint: -12, highlights: -16, grain: 10,
            shadowsTint: [18, 34, 28], highlightsTint: [232, 226, 200], splitStrength: 0.22,
            curve: { rgb: [[0, 18], [90, 78], [255, 236]] }
        }
    },
    {
        id: 'm_crushed', code: 'CRUSHED', name: 'Crushed Noir', category: 'moody', subLabel: 'MONOCHROME',
        params: {
            contrast: 28, saturation: -100, highlights: -8, grain: 24,
            curve: { rgb: [[0, 12], [64, 34], [192, 214], [255, 244]] }
        }
    },
    {
        id: 'm_golden', code: 'GOLDEN', name: 'Golden Hour Fade', category: 'moody', subLabel: 'MOODY',
        params: {
            brightness: 4, contrast: 8, vibrance: 12, warmth: 34, tint: 8, highlights: -14,
            shadowsTint: [56, 30, 30], highlightsTint: [255, 214, 160], splitStrength: 0.24,
            curve: { rgb: [[0, 24], [128, 132], [255, 240]], b: [[0, 4], [255, 220]] }
        }
    }
];

/**
 * Koleksi Efek Analog (03 EFFECTS: Light Leaks, Film Burns, Vintage Dust)
 * Sesuai dengan Screenshot 5 (Light Leak 01..05 & Film Burns)
 */
const ANALOG_EFFECTS = [
    // LIGHT LEAKS
    { id: 'none_leak', code: 'NONE', name: 'No Light Leak', category: 'leaks', stops: [] },
    {
        id: 'leak_01',
        code: 'LEAK 01',
        name: 'Light Leak 01',
        category: 'leaks',
        angle: 'top-left',
        stops: [
            { pos: 0.0, color: 'rgba(255, 165, 85, 0.92)' },
            { pos: 0.28, color: 'rgba(255, 90, 120, 0.55)' },
            { pos: 0.58, color: 'rgba(255, 90, 120, 0)' }
        ]
    },
    {
        id: 'leak_02',
        code: 'LEAK 02',
        name: 'Light Leak 02',
        category: 'leaks',
        angle: 'right-edge',
        stops: [
            { pos: 0.0, color: 'rgba(255, 130, 150, 0.9)' },
            { pos: 0.32, color: 'rgba(255, 195, 110, 0.5)' },
            { pos: 0.65, color: 'rgba(255, 195, 110, 0)' }
        ]
    },
    {
        id: 'leak_03',
        code: 'LEAK 03',
        name: 'Light Leak 03',
        category: 'leaks',
        angle: 'bottom-edge',
        stops: [
            { pos: 0.0, color: 'rgba(255, 145, 90, 0.88)' },
            { pos: 0.26, color: 'rgba(255, 110, 145, 0.45)' },
            { pos: 0.55, color: 'rgba(255, 110, 145, 0)' }
        ]
    },
    {
        id: 'leak_04',
        code: 'LEAK 04',
        name: 'Light Leak 04',
        category: 'leaks',
        angle: 'top-edge',
        stops: [
            { pos: 0.0, color: 'rgba(255, 195, 125, 0.88)' },
            { pos: 0.25, color: 'rgba(244, 114, 182, 0.48)' },
            { pos: 0.52, color: 'rgba(244, 114, 182, 0)' }
        ]
    },
    {
        id: 'leak_05',
        code: 'LEAK 05',
        name: 'Light Leak 05',
        category: 'leaks',
        angle: 'left-violet',
        stops: [
            { pos: 0.0, color: 'rgba(232, 121, 249, 0.85)' },
            { pos: 0.3, color: 'rgba(251, 113, 133, 0.48)' },
            { pos: 0.6, color: 'rgba(251, 113, 133, 0)' }
        ]
    },

    // FILM BURNS
    { id: 'none_burn', code: 'NONE', name: 'No Film Burn', category: 'burns', stops: [] },
    {
        id: 'burn_01',
        code: 'BURN 01',
        name: 'Film Burn Amber',
        category: 'burns',
        angle: 'corner-glow',
        stops: [
            { pos: 0.0, color: 'rgba(255, 220, 130, 0.95)' },
            { pos: 0.35, color: 'rgba(234, 88, 12, 0.65)' },
            { pos: 0.7, color: 'rgba(234, 88, 12, 0)' }
        ]
    },
    {
        id: 'burn_02',
        code: 'BURN 02',
        name: 'Sprocket Red Burn',
        category: 'burns',
        angle: 'double-side',
        stops: [
            { pos: 0.0, color: 'rgba(239, 68, 68, 0.9)' },
            { pos: 0.25, color: 'rgba(249, 115, 22, 0.5)' },
            { pos: 0.55, color: 'rgba(249, 115, 22, 0)' }
        ]
    },
    {
        id: 'burn_03',
        code: 'BURN 03',
        name: 'Golden Roll End',
        category: 'burns',
        angle: 'diagonal',
        stops: [
            { pos: 0.0, color: 'rgba(253, 224, 71, 0.9)' },
            { pos: 0.35, color: 'rgba(244, 63, 94, 0.55)' },
            { pos: 0.72, color: 'rgba(244, 63, 94, 0)' }
        ]
    },
    {
        id: 'burn_04',
        code: 'BURN 04',
        name: 'CineStill Halation Leak',
        category: 'burns',
        angle: 'bottom-right',
        stops: [
            { pos: 0.0, color: 'rgba(255, 80, 60, 0.92)' },
            { pos: 0.38, color: 'rgba(255, 160, 60, 0.45)' },
            { pos: 0.75, color: 'rgba(255, 160, 60, 0)' }
        ]
    },

    // VINTAGE DUST & SCRATCHES
    { id: 'none_dust', code: 'NONE', name: 'No Dust', category: 'dust', dustType: 'none' },
    { id: 'dust_01', code: 'DUST 01', name: 'Subtle 35mm Dust', category: 'dust', dustType: 'subtle' },
    { id: 'dust_02', code: 'DUST 02', name: 'Heavy Darkroom Specs', category: 'dust', dustType: 'heavy' },
    { id: 'dust_03', code: 'SCRATCH', name: 'Vintage Film Scratches', category: 'dust', dustType: 'scratches' }
];

/**
 * Daftar Font Editorial & Script (Sesuai Screenshot 2 & 4)
 */
const EDITORIAL_FONTS = [
    { id: 'dm_serif', name: 'DM SERIF DISPLAY', sample: 'Aa', family: "'DM Serif Display', serif" },
    { id: 'playfair', name: 'PLAYFAIR DISPLAY', sample: 'Aa', family: "'Playfair Display', serif" },
    { id: 'cormorant', name: 'CORMORANT', sample: 'Aa', family: "'Cormorant Garamond', serif" },
    { id: 'dancing', name: 'DANCING SCRIPT', sample: 'Aa', family: "'Dancing Script', cursive" },
    { id: 'caveat', name: 'CAVEAT', sample: 'Aa', family: "'Caveat', cursive" },
    { id: 'great_vibes', name: 'GREAT VIBES', sample: 'Aa', family: "'Great Vibes', cursive" },
    { id: 'bebas', name: 'BEBAS NEUE', sample: 'AA', family: "'Bebas Neue', sans-serif" },
    { id: 'oswald', name: 'OSWALD', sample: 'Aa', family: "'Oswald', sans-serif" },
    { id: 'space_mono', name: 'SPACE MONO', sample: '01', family: "'Space Mono', monospace" },
    { id: 'inter', name: 'INTER CLEAN', sample: 'Aa', family: "'Inter', sans-serif" },
    { id: 'f_abril_fatface', name: 'ABRIL FATFACE', sample: 'Aa', family: "'Abril Fatface', serif", cat: 'serif' },
    { id: 'f_bodoni_moda', name: 'BODONI MODA', sample: 'Aa', family: "'Bodoni Moda', serif", cat: 'serif' },
    { id: 'f_lora', name: 'LORA', sample: 'Aa', family: "'Lora', serif", cat: 'serif' },
    { id: 'f_libre_baskerville', name: 'LIBRE BASKERVILLE', sample: 'Aa', family: "'Libre Baskerville', serif", cat: 'serif' },
    { id: 'f_fraunces', name: 'FRAUNCES', sample: 'Aa', family: "'Fraunces', serif", cat: 'serif' },
    { id: 'f_yeseva_one', name: 'YESEVA ONE', sample: 'Aa', family: "'Yeseva One', serif", cat: 'serif' },
    { id: 'f_cinzel', name: 'CINZEL', sample: 'Aa', family: "'Cinzel', serif", cat: 'serif' },
    { id: 'f_italiana', name: 'ITALIANA', sample: 'Aa', family: "'Italiana', serif", cat: 'serif' },
    { id: 'f_marcellus', name: 'MARCELLUS', sample: 'Aa', family: "'Marcellus', serif", cat: 'serif' },
    { id: 'f_prata', name: 'PRATA', sample: 'Aa', family: "'Prata', serif", cat: 'serif' },
    { id: 'f_gloock', name: 'GLOOCK', sample: 'Aa', family: "'Gloock', serif", cat: 'serif' },
    { id: 'f_rozha_one', name: 'ROZHA ONE', sample: 'Aa', family: "'Rozha One', serif", cat: 'serif' },
    { id: 'f_young_serif', name: 'YOUNG SERIF', sample: 'Aa', family: "'Young Serif', serif", cat: 'serif' },
    { id: 'f_montserrat', name: 'MONTSERRAT', sample: 'Aa', family: "'Montserrat', sans-serif", cat: 'sans' },
    { id: 'f_poppins', name: 'POPPINS', sample: 'Aa', family: "'Poppins', sans-serif", cat: 'sans' },
    { id: 'f_raleway', name: 'RALEWAY', sample: 'Aa', family: "'Raleway', sans-serif", cat: 'sans' },
    { id: 'f_josefin_sans', name: 'JOSEFIN SANS', sample: 'Aa', family: "'Josefin Sans', sans-serif", cat: 'sans' },
    { id: 'f_dm_sans', name: 'DM SANS', sample: 'Aa', family: "'DM Sans', sans-serif", cat: 'sans' },
    { id: 'f_space_grotesk', name: 'SPACE GROTESK', sample: 'Aa', family: "'Space Grotesk', sans-serif", cat: 'sans' },
    { id: 'f_syne', name: 'SYNE', sample: 'Aa', family: "'Syne', sans-serif", cat: 'sans' },
    { id: 'f_league_spartan', name: 'LEAGUE SPARTAN', sample: 'Aa', family: "'League Spartan', sans-serif", cat: 'sans' },
    { id: 'f_archivo_black', name: 'ARCHIVO BLACK', sample: 'Aa', family: "'Archivo Black', sans-serif", cat: 'sans' },
    { id: 'f_anton', name: 'ANTON', sample: 'Aa', family: "'Anton', sans-serif", cat: 'sans' },
    { id: 'f_unbounded', name: 'UNBOUNDED', sample: 'Aa', family: "'Unbounded', sans-serif", cat: 'sans' },
    { id: 'f_lexend', name: 'LEXEND', sample: 'Aa', family: "'Lexend', sans-serif", cat: 'sans' },
    { id: 'f_outfit', name: 'OUTFIT', sample: 'Aa', family: "'Outfit', sans-serif", cat: 'sans' },
    { id: 'f_monoton', name: 'MONOTON', sample: 'Aa', family: "'Monoton', sans-serif", cat: 'display' },
    { id: 'f_bungee', name: 'BUNGEE', sample: 'Aa', family: "'Bungee', sans-serif", cat: 'display' },
    { id: 'f_righteous', name: 'RIGHTEOUS', sample: 'Aa', family: "'Righteous', sans-serif", cat: 'display' },
    { id: 'f_rubik_mono_one', name: 'RUBIK MONO ONE', sample: 'Aa', family: "'Rubik Mono One', sans-serif", cat: 'display' },
    { id: 'f_shrikhand', name: 'SHRIKHAND', sample: 'Aa', family: "'Shrikhand', sans-serif", cat: 'display' },
    { id: 'f_lobster', name: 'LOBSTER', sample: 'Aa', family: "'Lobster', sans-serif", cat: 'display' },
    { id: 'f_bowlby_one', name: 'BOWLBY ONE', sample: 'Aa', family: "'Bowlby One', sans-serif", cat: 'display' },
    { id: 'f_alfa_slab_one', name: 'ALFA SLAB ONE', sample: 'Aa', family: "'Alfa Slab One', sans-serif", cat: 'display' },
    { id: 'f_fredoka', name: 'FREDOKA', sample: 'Aa', family: "'Fredoka', sans-serif", cat: 'display' },
    { id: 'f_pacifico', name: 'PACIFICO', sample: 'Aa', family: "'Pacifico', cursive", cat: 'script' },
    { id: 'f_satisfy', name: 'SATISFY', sample: 'Aa', family: "'Satisfy', cursive", cat: 'script' },
    { id: 'f_sacramento', name: 'SACRAMENTO', sample: 'Aa', family: "'Sacramento', cursive", cat: 'script' },
    { id: 'f_allura', name: 'ALLURA', sample: 'Aa', family: "'Allura', cursive", cat: 'script' },
    { id: 'f_parisienne', name: 'PARISIENNE', sample: 'Aa', family: "'Parisienne', cursive", cat: 'script' },
    { id: 'f_yellowtail', name: 'YELLOWTAIL', sample: 'Aa', family: "'Yellowtail', cursive", cat: 'script' },
    { id: 'f_kaushan_script', name: 'KAUSHAN SCRIPT', sample: 'Aa', family: "'Kaushan Script', cursive", cat: 'script' },
    { id: 'f_mrs_saint_delafield', name: 'MRS SAINT DELAFIELD', sample: 'Aa', family: "'Mrs Saint Delafield', cursive", cat: 'script' },
    { id: 'f_alex_brush', name: 'ALEX BRUSH', sample: 'Aa', family: "'Alex Brush', cursive", cat: 'script' },
    { id: 'f_tangerine', name: 'TANGERINE', sample: 'Aa', family: "'Tangerine', cursive", cat: 'script' },
    { id: 'f_shadows_into_light', name: 'SHADOWS INTO LIGHT', sample: 'Aa', family: "'Shadows Into Light', cursive", cat: 'hand' },
    { id: 'f_permanent_marker', name: 'PERMANENT MARKER', sample: 'Aa', family: "'Permanent Marker', cursive", cat: 'hand' },
    { id: 'f_rock_salt', name: 'ROCK SALT', sample: 'Aa', family: "'Rock Salt', cursive", cat: 'hand' },
    { id: 'f_reenie_beanie', name: 'REENIE BEANIE', sample: 'Aa', family: "'Reenie Beanie', cursive", cat: 'hand' },
    { id: 'f_gloria_hallelujah', name: 'GLORIA HALLELUJAH', sample: 'Aa', family: "'Gloria Hallelujah', cursive", cat: 'hand' },
    { id: 'f_indie_flower', name: 'INDIE FLOWER', sample: 'Aa', family: "'Indie Flower', cursive", cat: 'hand' },
    { id: 'f_amatic_sc', name: 'AMATIC SC', sample: 'Aa', family: "'Amatic SC', cursive", cat: 'hand' },
    { id: 'f_nanum_pen_script', name: 'NANUM PEN SCRIPT', sample: 'Aa', family: "'Nanum Pen Script', cursive", cat: 'hand' },
    { id: 'f_covered_by_your_grace', name: 'COVERED BY YOUR GRACE', sample: 'Aa', family: "'Covered By Your Grace', cursive", cat: 'hand' },
    { id: 'f_homemade_apple', name: 'HOMEMADE APPLE', sample: 'Aa', family: "'Homemade Apple', cursive", cat: 'hand' },
    { id: 'f_vt323', name: 'VT323', sample: 'Aa', family: "'VT323', monospace", cat: 'mono' },
    { id: 'f_press_start_2p', name: 'PRESS START 2P', sample: 'Aa', family: "'Press Start 2P', monospace", cat: 'mono' },
    { id: 'f_special_elite', name: 'SPECIAL ELITE', sample: 'Aa', family: "'Special Elite', monospace", cat: 'mono' },
    { id: 'f_courier_prime', name: 'COURIER PRIME', sample: 'Aa', family: "'Courier Prime', monospace", cat: 'mono' },
    { id: 'f_ibm_plex_mono', name: 'IBM PLEX MONO', sample: 'Aa', family: "'IBM Plex Mono', monospace", cat: 'mono' },
    { id: 'f_major_mono_display', name: 'MAJOR MONO DISPLAY', sample: 'Aa', family: "'Major Mono Display', monospace", cat: 'mono' },
    { id: 'f_orbitron', name: 'ORBITRON', sample: 'Aa', family: "'Orbitron', monospace", cat: 'mono' },
    { id: 'f_audiowide', name: 'AUDIOWIDE', sample: 'Aa', family: "'Audiowide', monospace", cat: 'mono' },
    { id: 'f_silkscreen', name: 'SILKSCREEN', sample: 'Aa', family: "'Silkscreen', monospace", cat: 'mono' },
    { id: 'f_dotgothic16', name: 'DOTGOTHIC16', sample: 'Aa', family: "'DotGothic16', monospace", cat: 'mono' }
];

/**
 * Membuat Sample 3D LUT (17-Point 3D LUT) di memori agar langsung muncul di halaman My LUTs
 * persis seperti Screenshot 1 ("Sample — Teal & Orange, 17-POINT · 3D")
 */
function createDefaultSampleLUTs() {
    const size = 17;
    const data1 = new Float32Array(size * size * size * 3);
    let ptr = 0;
    for (let b = 0; b < size; b++) {
        for (let g = 0; g < size; g++) {
            for (let r = 0; r < size; r++) {
                const rf = r / (size - 1);
                const gf = g / (size - 1);
                const bf = b / (size - 1);
                const lum = 0.299 * rf + 0.587 * gf + 0.114 * bf;

                // Teal shadows, warm orange highlights
                const ro = Math.min(1, Math.max(0, rf * 1.05 + lum * 0.09 - (1 - lum) * 0.07));
                const go = Math.min(1, Math.max(0, gf * 1.01 + (1 - lum) * 0.03));
                const bo = Math.min(1, Math.max(0, bf * 0.92 + (1 - lum) * 0.11 - lum * 0.09));
                data1[ptr++] = ro;
                data1[ptr++] = go;
                data1[ptr++] = bo;
            }
        }
    }

    return [
        {
            id: 'lut_sample_teal_orange',
            title: 'Sample — Teal & Orange',
            size: 17,
            pointsLabel: '17-POINT · 3D',
            swatch: 'linear-gradient(135deg, #2b3940 0%, #7d8578 55%, #d6caba 100%)',
            data: data1
        }
    ];
}

/**
 * Parser untuk file .CUBE 3D LUT standar Adobe / DaVinci Resolve (hingga 65 points)
 */
function parseCubeLUT(cubeText, fallbackName = 'Custom LUT') {
    const lines = cubeText.split(/\r?\n/);
    let size = 0;
    let title = fallbackName.replace(/\.cube$/i, '');
    const table = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        if (line.startsWith('TITLE')) {
            const match = line.match(/TITLE\s+"?([^"]+)"?/i);
            if (match && match[1].trim()) title = match[1].trim();
            continue;
        }
        if (line.startsWith('LUT_3D_SIZE')) {
            const parts = line.split(/\s+/);
            size = parseInt(parts[1], 10);
            continue;
        }
        if (
            line.startsWith('DOMAIN_MIN') ||
            line.startsWith('DOMAIN_MAX') ||
            line.startsWith('LUT_1D_SIZE')
        ) {
            continue;
        }

        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
            const r = parseFloat(parts[0]);
            const g = parseFloat(parts[1]);
            const b = parseFloat(parts[2]);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                table.push(r, g, b);
            }
        }
    }

    if (size <= 0 || table.length < size * size * size * 3) {
        throw new Error('Format file .CUBE tidak valid atau 1D LUT (hanya 3D LUT hingga 65-point yang didukung).');
    }

    return {
        id: 'lut_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title,
        size,
        pointsLabel: `${size}-POINT · 3D`,
        swatch: 'linear-gradient(135deg, #332924 0%, #9b7a5e 55%, #ece2d0 100%)',
        data: new Float32Array(table)
    };
}

/**
 * Menerapkan 3D LUT (.cube) menggunakan Trilinear Interpolation ke ImageData
 */
function applyCubeLUTToImageData(imgData, cubeLut, intensity = 1.0) {
    if (!cubeLut || intensity <= 0) return;

    const data = imgData.data;
    const size = cubeLut.size;
    const maxIdx = size - 1;
    const lut = cubeLut.data;
    const sizeSq = size * size;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const rOrig = data[i] / 255;
        const gOrig = data[i + 1] / 255;
        const bOrig = data[i + 2] / 255;

        const rCoord = Math.min(maxIdx, Math.max(0, rOrig * maxIdx));
        const gCoord = Math.min(maxIdx, Math.max(0, gOrig * maxIdx));
        const bCoord = Math.min(maxIdx, Math.max(0, bOrig * maxIdx));

        const r0 = Math.floor(rCoord);
        const g0 = Math.floor(gCoord);
        const b0 = Math.floor(bCoord);

        const r1 = Math.min(maxIdx, r0 + 1);
        const g1 = Math.min(maxIdx, g0 + 1);
        const b1 = Math.min(maxIdx, b0 + 1);

        const fr = rCoord - r0;
        const fg = gCoord - g0;
        const fb = bCoord - b0;

        const idx000 = (b0 * sizeSq + g0 * size + r0) * 3;
        const idx100 = (b0 * sizeSq + g0 * size + r1) * 3;
        const idx010 = (b0 * sizeSq + g1 * size + r0) * 3;
        const idx110 = (b0 * sizeSq + g1 * size + r1) * 3;
        const idx001 = (b1 * sizeSq + g0 * size + r0) * 3;
        const idx101 = (b1 * sizeSq + g0 * size + r1) * 3;
        const idx011 = (b1 * sizeSq + g1 * size + r0) * 3;
        const idx111 = (b1 * sizeSq + g1 * size + r1) * 3;

        for (let c = 0; c < 3; c++) {
            const c00 = lut[idx000 + c] * (1 - fr) + lut[idx100 + c] * fr;
            const c01 = lut[idx001 + c] * (1 - fr) + lut[idx101 + c] * fr;
            const c10 = lut[idx010 + c] * (1 - fr) + lut[idx110 + c] * fr;
            const c11 = lut[idx011 + c] * (1 - fr) + lut[idx111 + c] * fr;

            const c0 = c00 * (1 - fg) + c10 * fg;
            const c1 = c01 * (1 - fg) + c11 * fg;

            const finalVal = (c0 * (1 - fb) + c1 * fb) * 255;
            const origVal = data[i + c];
            data[i + c] = Math.min(255, Math.max(0, origVal + (finalVal - origVal) * intensity));
        }
    }
}


// ==========================================
// KOLEKSI TAMBAHAN — B&W, Vintage, Tropical, Food, Night + varian kategori lain
// [id, code, nama, kategori, subLabel, params]
// ==========================================
[
    ['x_bw1', 'MONO', 'Classic Mono', 'bw', 'BLACK & WHITE', { saturation: -100, contrast: 14, brightness: 2, grain: 10 }],
    ['x_bw2', 'HI-CON', 'High Contrast B&W', 'bw', 'BLACK & WHITE', { saturation: -100, contrast: 38, highlights: 10, shadows: -14, grain: 16 }],
    ['x_bw3', 'SOFT', 'Soft Mono', 'bw', 'BLACK & WHITE', { saturation: -100, contrast: -8, fade: 14, brightness: 4, grain: 8 }],
    ['x_bw4', 'NOIR', 'Film Noir', 'bw', 'BLACK & WHITE', { saturation: -100, contrast: 30, exposure: -10, shadows: -22, curve: { rgb: [[0, 0], [64, 40], [192, 205], [255, 255]] } }],
    ['x_bw5', 'TRI-X', 'Tri-X Grain', 'bw', 'BLACK & WHITE', { saturation: -100, contrast: 24, grain: 30, curve: { rgb: [[0, 6], [255, 250]] } }],
    ['x_bw6', 'SEPIA', 'Sepia Tone', 'bw', 'TONED MONO', { saturation: -75, warmth: 22, tint: 6, contrast: 8, fade: 10, grain: 8 }],
    ['x_bw7', 'CYANO', 'Cyanotype', 'bw', 'TONED MONO', { saturation: -70, warmth: -24, tint: -4, contrast: 10 }],
    ['x_bw8', 'SILVER', 'Silver Print', 'bw', 'BLACK & WHITE', { saturation: -100, brightness: 6, contrast: 12, highlights: 14, fade: 6 }],

    ['x_v1', '70s', 'Seventies', 'vintage', 'VINTAGE', { warmth: 22, saturation: 8, fade: 16, contrast: 6, grain: 20, shadowsTint: [60, 30, 10], highlightsTint: [255, 225, 170], splitStrength: 0.2 }],
    ['x_v2', 'KCHROME', 'Kodachrome 80s', 'vintage', 'VINTAGE', { contrast: 22, saturation: 22, warmth: 12, highlights: 8, grain: 14, curve: { rgb: [[0, 8], [255, 250]] } }],
    ['x_v3', 'POSTCARD', 'Faded Postcard', 'vintage', 'VINTAGE', { fade: 26, saturation: -10, warmth: 10, tint: -4, contrast: -6, brightness: 6 }],
    ['x_v4', 'OLD', 'Old Photo', 'vintage', 'VINTAGE', { saturation: -35, warmth: 24, fade: 22, contrast: 4, grain: 26 }],
    ['x_v5', 'BLEACH', 'Sun Bleached', 'vintage', 'VINTAGE', { exposure: 14, fade: 20, saturation: -14, warmth: 8, contrast: -8 }],
    ['x_v6', 'LOMO', 'Lomo', 'vintage', 'VINTAGE', { contrast: 30, saturation: 30, warmth: -4, tint: 6, shadows: -16, grain: 14, curve: { rgb: [[0, 0], [64, 44], [192, 216], [255, 255]] } }],
    ['x_v7', 'XPRO', 'Cross Process', 'vintage', 'VINTAGE', { contrast: 24, saturation: 16, curve: { r: [[0, 0], [128, 150], [255, 255]], g: [[0, 0], [128, 134], [255, 255]], b: [[0, 30], [128, 110], [255, 225]] } }],
    ['x_v8', 'RETRO G', 'Retro Green', 'vintage', 'VINTAGE', { tint: -14, warmth: 6, fade: 14, saturation: -6 }],

    ['x_t1', 'TROPIC', 'Tropical Bright', 'travel', 'TROPICAL', { saturation: 22, vibrance: 18, warmth: 6, contrast: 10, brightness: 4, highlights: 6 }],
    ['x_t2', 'BALI', 'Bali Sunset', 'travel', 'TROPICAL', { warmth: 24, saturation: 14, contrast: 12, tint: 4, shadows: -8 }],
    ['x_t3', 'ISLAND', 'Island Blue', 'travel', 'TROPICAL', { warmth: -10, saturation: 20, vibrance: 14, contrast: 8, brightness: 3 }],
    ['x_t4', 'JUNGLE', 'Jungle Green', 'travel', 'TROPICAL', { tint: -10, saturation: 14, contrast: 14, shadows: -10, warmth: 2 }],
    ['x_t5', 'CITY', 'City Travel', 'travel', 'TROPICAL', { contrast: 16, saturation: -4, warmth: -4, highlights: -8, grain: 6 }],
    ['x_t6', 'DESERT', 'Desert Sand', 'travel', 'TROPICAL', { warmth: 20, saturation: -4, fade: 10, contrast: 10, brightness: 4 }],

    ['x_f1', 'FRESH', 'Fresh Cafe', 'food', 'FOOD', { brightness: 8, warmth: 8, saturation: 16, contrast: 8, vibrance: 10 }],
    ['x_f2', 'KITCHEN', 'Warm Kitchen', 'food', 'FOOD', { warmth: 18, saturation: 10, contrast: 10, shadows: 6 }],
    ['x_f3', 'BAKERY', 'Bakery', 'food', 'FOOD', { warmth: 14, saturation: 6, fade: 8, brightness: 6, contrast: 6 }],
    ['x_f4', 'SWEET', 'Sweet Pop', 'food', 'FOOD', { saturation: 28, vibrance: 16, brightness: 6, contrast: 12, tint: 4 }],
    ['x_f5', 'DARK', 'Dark Table', 'food', 'FOOD', { contrast: 22, shadows: -14, saturation: 10, warmth: 10, exposure: -6 }],

    ['x_n1', 'NEON', 'Neon City', 'night', 'NIGHT', { contrast: 24, saturation: 28, warmth: -12, tint: 10, shadows: 8, highlights: 10, curve: { b: [[0, 16], [255, 255]] } }],
    ['x_n2', 'MIDNIGHT', 'Midnight Blue', 'night', 'NIGHT', { warmth: -24, contrast: 18, exposure: -6, saturation: 8, shadows: 10 }],
    ['x_n3', 'LAMP', 'Street Lamp', 'night', 'NIGHT', { warmth: 22, contrast: 20, shadows: -8, saturation: 12, highlights: 10 }],
    ['x_n4', 'NFLASH', 'Night Flash', 'night', 'NIGHT', { exposure: 10, contrast: 28, saturation: 4, grain: 18, shadows: -20 }],
    ['x_n5', 'RAIN', 'Rain Night', 'night', 'NIGHT', { warmth: -14, saturation: -8, contrast: 16, fade: 8, tint: -4 }],
    ['x_n6', 'HAZE', 'Purple Haze', 'night', 'NIGHT', { tint: 14, warmth: -10, saturation: 12, contrast: 14, fade: 10 }],

    ['x_d1', 'COMPACT', 'Compact Cam 2005', 'digicam', 'Y2K DIGICAM', { contrast: 20, saturation: 18, brightness: 6, warmth: -4, grain: 8 }],
    ['x_d2', 'SUNNY', 'Sunny CCD', 'digicam', 'Y2K DIGICAM', { exposure: 8, warmth: 12, saturation: 14, contrast: 16, highlights: 14 }],
    ['x_d3', 'WEBCAM', 'Old Webcam', 'digicam', 'Y2K LO-FI', { saturation: -12, contrast: -6, warmth: -8, fade: 12, grain: 24, brightness: 6 }],
    ['x_d4', 'DATEFLASH', 'Date Flash', 'digicam', 'Y2K DIGICAM', { exposure: 8, brightness: 6, contrast: 24, warmth: 6, highlights: 14, shadows: -16, grain: 10 }],

    ['x_g1', 'MILK', 'Soft Milk', 'genz', 'VSCO PRESET', { brightness: 10, fade: 16, saturation: -8, warmth: 4, contrast: -6 }],
    ['x_g2', 'BUBBLE', 'Bubblegum', 'genz', 'SOFT GLOW', { tint: 10, saturation: 16, brightness: 6, warmth: -2, fade: 10 }],
    ['x_g3', 'SAGE', 'Sage Matte', 'genz', 'PASTEL', { tint: -8, saturation: -14, fade: 18, warmth: 4 }],
    ['x_g4', 'CLOUD9', 'Cloud 9', 'genz', 'PASTEL', { exposure: 12, fade: 14, warmth: -6, saturation: -4, highlights: 10 }],

    ['x_k1', 'SEOUL', 'Seoul Morning', 'korean', 'K-SOFT', { brightness: 8, warmth: 4, saturation: -6, fade: 12, contrast: -2, highlights: 10 }],
    ['x_k2', 'CREAM', 'Cream Cheese', 'korean', 'K-SOFT', { warmth: 12, brightness: 8, fade: 14, saturation: -4 }],
    ['x_k3', 'GLASS', 'Glass Skin', 'korean', 'K-SOFT', { exposure: 10, contrast: -8, saturation: -10, tint: 4, highlights: 12 }],

    ['x_m1', 'ACADEMIA', 'Dark Academia', 'moody', 'MOODY', { warmth: 12, saturation: -18, contrast: 20, shadows: -14, fade: 12, tint: -4 }],
    ['x_m2', 'FOREST', 'Forest Moody', 'moody', 'MOODY', { tint: -12, saturation: -10, contrast: 18, shadows: -12, warmth: -2 }],
    ['x_m3', 'RAINY', 'Rainy Mood', 'moody', 'MOODY', { warmth: -12, saturation: -14, contrast: 14, fade: 14 }],

    ['x_c1', 'BLOCK', 'Blockbuster', 'cinema', 'CINEMA', { contrast: 26, saturation: 12, warmth: -8, shadowsTint: [14, 40, 52], highlightsTint: [255, 205, 150], splitStrength: 0.24 }],
    ['x_c2', 'WES', 'Pastel Symmetry', 'cinema', 'CINEMA', { saturation: 6, fade: 18, warmth: 12, tint: 6, brightness: 8, contrast: -4 }],
    ['x_c3', 'SCI-FI', 'Sci-Fi Cyan', 'cinema', 'CINEMA', { warmth: -22, saturation: 4, contrast: 22, shadows: -10, tint: -4 }],

    ['x_a1', 'DREAM', 'Dreamcore', 'aesthetic', 'AESTHETIC', { exposure: 12, fade: 20, saturation: 8, tint: 8, warmth: -4, contrast: -10 }],
    ['x_a2', 'CHROME', 'Y2K Chrome', 'aesthetic', 'AESTHETIC', { saturation: -16, contrast: 24, warmth: -14, highlights: 14 }],

    ['x_s1', 'PRECISA', 'Agfa Precisa', 'slide', 'SLIDE FILM', { saturation: 20, contrast: 20, warmth: -6, tint: 4 }],
    ['x_i1', 'SX70', 'Polaroid SX-70', 'instant', 'INSTANT FILM', { warmth: 14, fade: 18, saturation: -8, contrast: 8, brightness: 4, curve: { rgb: [[0, 14], [255, 244]] } }],
    ['x_i2', 'INSTAXW', 'Instax Wide', 'instant', 'INSTANT FILM', { brightness: 8, saturation: 10, warmth: -2, fade: 10, contrast: 8 }],

    ['x_n7', 'ULTRAMAX', 'Kodak Ultramax 400', 'negative', 'NEGATIVE FILM', { saturation: 16, warmth: 10, contrast: 14, grain: 14 }],
    ['x_n8', 'C200', 'Fuji C200', 'negative', 'NEGATIVE FILM', { tint: -4, saturation: 8, warmth: -4, contrast: 10, grain: 10, fade: 6 }],
    ['x_n9', 'VISTA', 'Agfa Vista 200', 'negative', 'NEGATIVE FILM', { saturation: 14, warmth: 8, tint: 4, contrast: 12, grain: 12 }]
].forEach(([id, code, name, category, subLabel, params]) => FILM_PRESETS.push({ id, code, name, category, subLabel, params }));

[
    ['leak_06', 'LEAK 06', 'Light Leak Sunset', 'leaks', 'bottom-left', [[0, 'rgba(255,140,70,0.9)'], [0.3, 'rgba(255,80,130,0.5)'], [0.62, 'rgba(255,80,130,0)']]],
    ['leak_07', 'LEAK 07', 'Light Leak Violet Teal', 'leaks', 'left-edge', [[0, 'rgba(167,139,250,0.85)'], [0.35, 'rgba(45,212,191,0.45)'], [0.7, 'rgba(45,212,191,0)']]],
    ['leak_08', 'LEAK 08', 'Light Leak Golden Bloom', 'leaks', 'center-glow', [[0, 'rgba(255,214,120,0.8)'], [0.4, 'rgba(255,150,80,0.35)'], [0.8, 'rgba(255,150,80,0)']]],
    ['leak_09', 'LEAK 09', 'Light Leak Streak', 'leaks', 'stripe-diag', [[0, 'rgba(255,180,90,0)'], [0.45, 'rgba(255,170,80,0.75)'], [0.6, 'rgba(255,110,140,0.5)'], [1, 'rgba(255,110,140,0)']]],
    ['leak_10', 'LEAK 10', 'Light Leak Rose Orb', 'leaks', 'bottom-center', [[0, 'rgba(255,120,160,0.9)'], [0.3, 'rgba(255,170,110,0.45)'], [0.62, 'rgba(255,170,110,0)']]],
    ['leak_11', 'LEAK 11', 'Light Leak Blue Hour', 'leaks', 'corner-glow', [[0, 'rgba(120,190,255,0.85)'], [0.35, 'rgba(140,120,255,0.45)'], [0.7, 'rgba(140,120,255,0)']]],
    ['leak_12', 'LEAK 12', 'Light Leak Warm Edges', 'leaks', 'double-side', [[0, 'rgba(255,150,80,0.85)'], [0.22, 'rgba(255,150,80,0)'], [0.78, 'rgba(255,110,150,0)'], [1, 'rgba(255,110,150,0.8)']]],
    ['burn_05', 'BURN 05', 'Film Burn Red Hot', 'burns', 'top-edge', [[0, 'rgba(255,60,40,0.9)'], [0.3, 'rgba(200,30,20,0.55)'], [0.6, 'rgba(200,30,20,0)']]],
    ['burn_06', 'BURN 06', 'Film Burn Gold Rush', 'burns', 'bottom-left', [[0, 'rgba(255,225,140,0.95)'], [0.3, 'rgba(255,160,50,0.6)'], [0.65, 'rgba(255,160,50,0)']]],
    ['burn_07', 'BURN 07', 'Film Burn Magenta', 'burns', 'right-edge', [[0, 'rgba(255,70,190,0.9)'], [0.35, 'rgba(255,120,80,0.5)'], [0.7, 'rgba(255,120,80,0)']]],
    ['burn_08', 'BURN 08', 'Film Burn White Hot', 'burns', 'center-glow', [[0, 'rgba(255,255,235,0.9)'], [0.25, 'rgba(255,200,120,0.55)'], [0.6, 'rgba(255,120,40,0)']]],
    ['burn_09', 'BURN 09', 'Film Burn Twin', 'burns', 'double-side', [[0, 'rgba(255,170,40,0.9)'], [0.25, 'rgba(230,80,20,0.4)'], [0.5, 'rgba(230,80,20,0)'], [0.75, 'rgba(230,80,20,0)'], [1, 'rgba(255,200,60,0.85)']]]
].forEach(([id, code, name, category, angle, stops]) => ANALOG_EFFECTS.push({ id, code, name, category, angle, stops: stops.map(([pos, color]) => ({ pos, color })) }));

[
    ['dust_04', 'DUST 04', 'Heavy Dust'],
    ['dust_05', 'FIBER', 'Fibers & Hair'],
    ['dust_06', 'BOKEH', 'Dust Bokeh'],
    ['dust_07', 'SPECKLE', 'Dark Speckle'],
    ['dust_08', 'HAIR', 'Long Hair'],
    ['dust_09', 'SCRATCH+', 'Heavy Scratches'],
    ['dust_10', 'BLOTCH', 'Stains & Blotches'],
    ['dust_11', 'WATER', 'Water Spots'],
    ['dust_12', 'SMUDGE', 'Lens Smudge'],
    ['dust_13', 'GLITTER', 'Glitter Sparkle'],
    ['dust_14', 'CRACKLE', 'Cracked Emulsion'],
    ['dust_15', 'FOLD', 'Paper Folds'],
    ['dust_16', 'VHS', 'VHS Scanlines']
].forEach(([id, code, name]) => ANALOG_EFFECTS.push({ id, code, name, category: 'dust', stops: [] }));


// ANALOG CAM — karakter kamera film klasik & disposable
[
    ['x_ac1', 'FUNSAVER', 'Disposable Funsaver', 'analogcam', 'ANALOG CAM', { exposure: 6, contrast: 24, saturation: 20, warmth: 12, highlights: 14, shadows: -10, grain: 22, fade: 4 }],
    ['x_ac2', 'QUICKSNAP', 'Disposable Quicksnap', 'analogcam', 'ANALOG CAM', { contrast: 20, saturation: 16, warmth: -6, tint: -6, grain: 20, brightness: 4 }],
    ['x_ac3', 'AE-1', 'SLR AE-1', 'analogcam', 'ANALOG CAM', { contrast: 14, saturation: 12, warmth: 8, fade: 8, grain: 14, shadowsTint: [30, 20, 14], highlightsTint: [255, 240, 220], splitStrength: 0.14 }],
    ['x_ac4', 'TRIP 35', 'Trip 35', 'analogcam', 'ANALOG CAM', { contrast: 16, saturation: 10, warmth: 6, tint: -2, grain: 12, highlights: -6 }],
    ['x_ac5', 'T4', 'Point & Shoot T4', 'analogcam', 'ANALOG CAM', { exposure: 4, contrast: 22, saturation: 18, warmth: 4, highlights: 10, shadows: -12, grain: 10 }],
    ['x_ac6', 'T2', 'Compact T2', 'analogcam', 'ANALOG CAM', { contrast: 24, saturation: 14, warmth: 2, shadows: -16, highlights: 8, grain: 8, curve: { rgb: [[0, 0], [64, 48], [192, 210], [255, 255]] } }],
    ['x_ac7', 'M6', 'Rangefinder M6', 'analogcam', 'ANALOG CAM', { contrast: 18, saturation: -6, warmth: 4, fade: 6, grain: 16, shadows: -8 }],
    ['x_ac8', 'K1000', 'Student SLR K1000', 'analogcam', 'ANALOG CAM', { contrast: 12, saturation: 6, warmth: 10, fade: 12, grain: 18 }],
    ['x_ac9', 'FM2', 'Manual SLR FM2', 'analogcam', 'ANALOG CAM', { contrast: 20, saturation: 8, warmth: -2, grain: 14, highlights: -4, shadows: -6 }],
    ['x_ac10', 'X-700', 'SLR X-700', 'analogcam', 'ANALOG CAM', { saturation: 14, warmth: 8, tint: 4, contrast: 12, fade: 10, grain: 14 }],
    ['x_ac11', 'HOLGA', 'Plastic Holga 120', 'analogcam', 'ANALOG CAM', { contrast: 28, saturation: 16, warmth: 6, shadows: -16, grain: 20, fade: 8 }],
    ['x_ac12', 'DIANA', 'Diana Toy Cam', 'analogcam', 'ANALOG CAM', { saturation: 24, contrast: 26, tint: 8, warmth: -4, fade: 10, grain: 16, curve: { r: [[0, 0], [128, 140], [255, 255]], b: [[0, 20], [128, 118], [255, 235]] } }],
    ['x_ac13', 'HASSEL', 'Medium Format 500C', 'analogcam', 'ANALOG CAM', { contrast: 14, saturation: 8, fade: 4, grain: 6, highlights: 6 }],
    ['x_ac14', 'MAMIYA', 'Medium Format 7', 'analogcam', 'ANALOG CAM', { contrast: 10, saturation: 6, warmth: 4, grain: 8, fade: 6 }],
    ['x_ac15', 'BIG MINI', 'Compact Big Mini', 'analogcam', 'ANALOG CAM', { exposure: 6, contrast: 22, saturation: 12, warmth: 8, highlights: 12, grain: 10 }],
    ['x_ac16', 'GR1', 'Street Compact GR1', 'analogcam', 'ANALOG CAM', { contrast: 24, saturation: -8, warmth: -2, grain: 14, shadows: -14 }],
    ['x_ac17', 'ROLLEI', 'Pocket Rollei 35', 'analogcam', 'ANALOG CAM', { contrast: 18, saturation: 4, warmth: 2, fade: 6, grain: 12 }]
].forEach(([id, code, name, category, subLabel, params]) => FILM_PRESETS.push({ id, code, name, category, subLabel, params }));

// STROBE / FLASH
[
    ['x_st1', 'FLASHBURST', 'Hard Flash', 'strobe', 'STROBE FLASH', { exposure: 12, contrast: 34, saturation: 6, highlights: 20, shadows: -28, grain: 12 }],
    ['x_st2', 'CLUB', 'Club Strobe', 'strobe', 'STROBE FLASH', { contrast: 28, saturation: 26, tint: 14, warmth: -14, shadows: -14, highlights: 14, curve: { b: [[0, 18], [255, 255]] } }],
    ['x_st3', 'DISCO', 'Disco Lights', 'strobe', 'STROBE FLASH', { saturation: 40, contrast: 24, tint: 18, warmth: 10, highlights: 12, shadows: -10 }],
    ['x_st4', 'RAVE UV', 'Rave UV', 'strobe', 'STROBE FLASH', { warmth: -24, tint: 18, saturation: 34, contrast: 30, shadows: -20, curve: { r: [[0, 10], [255, 255]] } }],
    ['x_st5', 'PAPARAZZI', 'Paparazzi Flash', 'strobe', 'STROBE FLASH', { exposure: 16, contrast: 30, saturation: -6, highlights: 24, shadows: -30, grain: 8 }],
    ['x_st6', 'LIGHTBURST', 'Night Burst', 'strobe', 'STROBE FLASH', { exposure: 8, contrast: 22, warmth: 8, tint: 6, saturation: 22, highlights: 16, shadows: -22 }]
].forEach(([id, code, name, category, subLabel, params]) => FILM_PRESETS.push({ id, code, name, category, subLabel, params }));

// EDITORIAL SUN — hangat, kontras kuat, hitam terangkat tipis (potret golden hour)
[
    ['x_ed1', 'SUNLIT', 'Sunlit Editorial', 'editorial', 'EDITORIAL SUN', { warmth: 15, contrast: 24, saturation: 10, vibrance: 8, highlights: -10, shadows: -4, fade: 5, shadowsTint: [44, 30, 20], highlightsTint: [255, 214, 168], splitStrength: 0.16, curve: { rgb: [[0, 12], [64, 52], [192, 206], [255, 250]] } }],
    ['x_ed2', 'GOLDTEAL', 'Golden Teal', 'editorial', 'EDITORIAL SUN', { warmth: 12, contrast: 22, saturation: 8, fade: 5, shadowsTint: [20, 52, 56], highlightsTint: [255, 208, 150], splitStrength: 0.22 }],
    ['x_ed3', 'HERITAGE', 'Heritage Warm', 'editorial', 'EDITORIAL SUN', { warmth: 18, contrast: 26, saturation: 14, vibrance: 10, shadows: -8, highlights: -6, fade: 4, grain: 6 }],
    ['x_ed4', 'BRICKSUN', 'Brick & Sun', 'editorial', 'EDITORIAL SUN', { warmth: 14, contrast: 30, saturation: 12, shadows: -14, highlights: -12, tint: 3, fade: 3, curve: { rgb: [[0, 8], [64, 46], [192, 210], [255, 252]] } }],
    ['x_ed5', 'MATTEGOLD', 'Matte Gold', 'editorial', 'EDITORIAL SUN', { warmth: 16, contrast: 14, saturation: 4, fade: 12, highlights: -8, shadowsTint: [50, 36, 24], highlightsTint: [255, 222, 170], splitStrength: 0.14 }],
    ['x_ed6', 'ZFCHROME', 'Zf Chrome', 'editorial', 'EDITORIAL SUN', { warmth: 10, contrast: 28, saturation: -4, vibrance: 12, highlights: -14, shadows: -6, fade: 4 }],
    ['x_ed7', 'WISUDA', 'Graduation Gold', 'editorial', 'EDITORIAL SUN', { warmth: 17, contrast: 22, saturation: 12, vibrance: 14, brightness: 2, highlights: -10, fade: 6, shadowsTint: [40, 28, 18], highlightsTint: [255, 218, 170], splitStrength: 0.12 }],
    ['x_ed8', 'LOWKEY', 'Low-Key Warm', 'editorial', 'EDITORIAL SUN', { exposure: -6, warmth: 14, contrast: 30, saturation: 12, shadows: -16, highlights: -6, fade: 3 }],
    ['x_ed9', 'HIGHSUN', 'High Sun Pop', 'editorial', 'EDITORIAL SUN', { exposure: 4, warmth: 12, contrast: 20, saturation: 16, vibrance: 10, highlights: -14, fade: 4 }],
    ['x_ed10', 'SOFTSUN', 'Soft Sunlit', 'editorial', 'EDITORIAL SUN', { warmth: 12, contrast: 14, saturation: 6, fade: 8, brightness: 4, highlights: -8 }],
    ['x_ed11', 'EDTEAL', 'Editorial Teal Shadow', 'editorial', 'EDITORIAL SUN', { warmth: 10, contrast: 26, saturation: 10, shadowsTint: [14, 44, 52], highlightsTint: [255, 204, 150], splitStrength: 0.26 }]
].forEach(([id, code, name, category, subLabel, params]) => FILM_PRESETS.push({ id, code, name, category, subLabel, params }));

window.FILM_PRESETS = FILM_PRESETS;
window.ANALOG_EFFECTS = ANALOG_EFFECTS;
window.EDITORIAL_FONTS = EDITORIAL_FONTS;
window.createDefaultSampleLUTs = createDefaultSampleLUTs;
window.parseCubeLUT = parseCubeLUT;
window.applyCubeLUTToImageData = applyCubeLUTToImageData;
