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
    { id: 'inter', name: 'INTER CLEAN', sample: 'Aa', family: "'Inter', sans-serif" }
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

window.FILM_PRESETS = FILM_PRESETS;
window.ANALOG_EFFECTS = ANALOG_EFFECTS;
window.EDITORIAL_FONTS = EDITORIAL_FONTS;
window.createDefaultSampleLUTs = createDefaultSampleLUTs;
window.parseCubeLUT = parseCubeLUT;
window.applyCubeLUTToImageData = applyCubeLUTToImageData;
