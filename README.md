# svn.lens — *Craft the light.*

Aplikasi edit foto berbasis web modern dengan estetika editorial & *darkroom* analog, dukungan penuh **3D LUT (`.cube`)**, **Preset Film Analog & Gen-Z Aesthetic**, **Light Leaks & Film Burns**, **Tipografi Editorial & Custom Font**, serta **Smart Background Removal**.

Dibangun menggunakan **HTML5, CSS3, dan Vanilla JavaScript (Canvas 2D Pixel Pipeline)** murni sehingga sangat ringan, cepat, dan berjalan langsung di browser tanpa memerlukan *backend* atau instalasi *framework*.

---

## ✨ Fitur Utama

### 1. Studio Editorial (`01 HOME` · `02 LIBRARY` · `03 LUTS`)
- **Your Library:** Manajemen galeri foto lokal di perangkat Anda dengan filter **`ALL`** dan **`EDITED`**, serta pilihan tata letak grid (**3 Kolom, 1 Kolom, 2 Kolom**).
- **My LUTs (`.cube` Importer):** Import file **3D LUT (`.cube`)** hingga 65-point dari Adobe Lightroom, Photoshop, atau DaVinci Resolve. Dilengkapi *Trilinear Interpolation* untuk akurasi *color grading* tingkat sinema.

### 2. Darkroom Editor (`01 PRESETS` · `02 TOOLS` · `03 EFFECTS` · `04 TEXT`)
- **`01 PRESETS` (Koleksi Film & Filter Hits Masa Kini):**
  - **Negative Film:** *Portra 160*, *Portra 400*, *Portra 400 (+1 Stop)*, *Portra 800*, *Kodak Gold 200*, *Fuji Superia 400*.
  - **Slide Film:** *Fuji Velvia 50*, *Fuji Provia 100F*, *Kodak Ektachrome E100*.
  - **Cinema LUT:** *CineStill 800T Tungsten*, *Teal & Orange Cinema*, *Kodak 2383 Print*, *Cyberpunk Neon Night*.
  - **Instant Film:** *Polaroid 600*, *Disposable Camera 90s*, *Instax Mini Airy*.
  - **Modern Aesthetic & B&W:** *Fuji Classic Chrome*, *Korean Soft Peach*, *Matcha Cafe Aesthetic*, *Golden Hour Glow*, *Y2K Cyber Digicam*, *Ilford HP5 Plus*, *Leica Mono Noir*.
  - **Fitur Favorit (`★ MY PRESETS`):** Simpan preset favorit Anda dan atur kekuatan filter (`0–100`).
- **`02 TOOLS` (Penyesuaian Warna, Geometris, & AI):**
  - **Light & Color:** *Exposure*, *Contrast*, *Highlights*, *Shadows*, *Curves*, *Brightness*, *Matte Fade*, *Warmth/Temperature*, *Tint*, *Saturation*, *Vibrance*, *Hue Shift*, *Sepia*.
  - **Detail & Optics:** *Sharpness*, *Film Grain*, *Soft Blur*, *Vignette*, *Film Red Halation*, *Portrait Bokeh Blur*, *RGB Chromatic Glitch*.
  - **Geo & Crop:** *Interactive Crop* (`FREE`, `1:1`, `4:5`, `9:16`, `16:9`), *Rotate -90°/+90°*, *Straighten*, *Flip Horizontal/Vertical*.
  - **AI & Brush:** *AI Auto Enhance*, *Auto Hapus Background*, *Magic Wand Background Remover* (klik warna latar di foto), *Ganti Warna Latar* (Transparan, Putih, Merah/Biru Pas Foto), serta *Brush Doodle* (*Solid Pen*, *Neon Glow*, *Eraser*).
- **`03 EFFECTS` (Efek Optik Analog):**
  - **Light Leaks (`LEAK 01` – `LEAK 05`)** & **Film Burns (`BURN 01` – `BURN 04`)** dengan *Screen Blending* dan slider *Strength*.
  - **Vintage Dust & Scratches (`DUST 01` – `SCRATCH`)** serta **Cap Tanggal Retro (`'98 DATE STAMP`)**.
- **`04 TEXT` (Tipografi Editorial & Custom Font):**
  - Tambahkan beberapa baris teks di atas foto, geser posisi langsung di kanvas, atur ukuran, transparansi, rotasi, warna, dan *alignment*.
  - Dilengkapi kartu font kurasi (*DM Serif Display*, *Playfair Display*, *Cormorant*, *Dancing Script*, *Caveat*, *Great Vibes*, *Bebas Neue*, *Oswald*, *Space Mono*) dan tombol **`+ ADD FONT`** untuk mengunggah file font `.ttf` / `.otf` / `.woff` sendiri.

---

## 📁 Struktur Proyek

```text
├── index.html                  # Antarmuka utama (Studio Shell & Darkroom Editor Shell)
├── css/
│   └── style.css               # Styling tema Warm Cream Editorial & Espresso Darkroom
├── js/
│   ├── lut-presets.js          # Database Preset Film, Parser 3D LUT (.cube), Light Leaks, & Font
│   ├── ai-tools.js             # Mesin Smart Background Remover, Bokeh Blur, Glitch, & Halation
│   └── app.js                  # Engine utama aplikasi, manajemen Library, Canvas pipeline, & History
├── sample-luts/                # Contoh file 3D LUT (.cube) siap pakai untuk diuji coba
│   ├── Cinematic-Teal-Gold.cube
│   └── Vintage-Creamy-Film.cube
├── .github/workflows/
│   └── deploy-pages.yml        # GitHub Actions otomatis untuk GitHub Pages
├── netlify.toml                # Konfigurasi instan untuk deploy ke Netlify
├── package.json                # Metadata proyek
├── LICENSE                     # Lisensi MIT
└── README.md                   # Dokumentasi proyek
```

---

## 🚀 Cara Menjalankan secara Lokal

1. **Langsung Buka di Browser:**
   Klik dua kali pada file `index.html` untuk membukanya di Google Chrome, Microsoft Edge, Firefox, atau Safari.
2. **Menggunakan Local Server (Opsional):**
   ```bash
   npx serve .
   ```

---

## 🌐 Cara Upload ke GitHub & Mengaktifkan GitHub Pages

1. Buat repository baru di [GitHub](https://github.com/new) (misalnya `svn-lens`).
2. Jalankan file **`UPLOAD_KE_GITHUB.bat`** di dalam folder ini (atau jalankan perintah Git berikut di terminal):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: svn.lens Photo & 3D LUT Editor"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git
   git push -u origin main
   ```
3. Untuk mengaktifkan **GitHub Pages** agar aplikasi bisa diakses online:
   - Buka menu **Settings** → **Pages** di repository GitHub Anda.
   - Pada bagian **Build and deployment (Source)**, pilih **GitHub Actions** (atau **Deploy from a branch** → pilih branch `main` dan folder `/ (root)`).
   - Aplikasi web Anda akan langsung aktif dan dapat diakses melalui tautan GitHub Pages Anda!

---

## 📄 Lisensi

Didistribusikan di bawah [MIT License](LICENSE).
