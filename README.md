# Forensic Insight Hub

## Cara Install & Menjalankan Project

Project ini dibangun menggunakan:
- **Vite**
- **React (TypeScript)**
- **Tailwind CSS**
- **shadcn/ui**
- **Supabase**

Ikuti langkah berikut untuk menjalankan project secara lokal.

---

## 1. Clone Repository
Clone repository dari GitHub menggunakan perintah berikut:

```sh
git clone https://github.com/Fiz5892/Digital-Forensic-Incident-Handling.git
```

---

## 2. Masuk ke Folder Project

```sh
cd forensic-insight-hub
```

---

## 3. Install Semua Dependencies
Pastikan **Node.js** dan **npm** sudah terinstall di perangkatmu.

```sh
npm install
```

---

## 4. Setup & Migration Supabase
1. Buka **Supabase Dashboard**.
2. Masuk ke project kamu.
3. Pilih **SQL Editor**.
4. Jalankan migration yang diperlukan — seperti membuat tabel, policies, atau schema yang dibutuhkan aplikasi.
5. Update environment variable Supabase di file: 

```
.env.local
```

Format:
```env
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
```

Pastikan key sesuai dengan project Supabase milikmu.

---

## 5. Menjalankan Project

Setelah semua konfigurasi selesai, jalankan server development:

```sh
npm run dev
```

Buka browser dan akses:
```
http://localhost:8080
```

---

## Deployment
Untuk deployment, kamu bisa menggunakan platform seperti:
- **Vercel**
- **Netlify**
- **Cloudflare Pages**

