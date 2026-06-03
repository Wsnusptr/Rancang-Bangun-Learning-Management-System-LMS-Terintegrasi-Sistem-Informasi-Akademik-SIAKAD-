# J-Learn — STMIK Jayakarta Integrated Academic Ecosystem

> **Jayakarta Academic Learning System (J-Learn)** — Platform LMS terintegrasi SIAKAD berbasis web untuk STMIK Jayakarta.

## Struktur Proyek (Monorepo)

```
j-learn-integrated/
├── apps/
│   ├── lms/        → J-Learn LMS (Next.js 14, port 3000)
│   └── siakad/     → Dummy SIAKAD (Next.js 14, port 3001)
├── database/
│   ├── schema_lms.sql      → Schema database LMS lengkap
│   ├── schema_siakad.sql   → Schema database SIAKAD dummy
│   └── storage_policies.sql → Supabase Storage RLS policies
└── README.md
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS + Shadcn/UI |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |

## Setup (Langkah demi Langkah)

### 1. Clone & Install

```bash
git clone <repo-url>
cd j-learn-integrated
npm install
```

### 2. Setup Supabase

1. Buat **2 Supabase project** di [supabase.com](https://supabase.com):
   - Project #1: `jlearn-lms` (untuk LMS)
   - Project #2: `jlearn-siakad-dummy` (untuk SIAKAD)

2. Jalankan SQL schema di **masing-masing** project via SQL Editor:
   - **LMS**: `database/schema_lms.sql` → lalu `database/storage_policies.sql`
   - **SIAKAD**: `database/schema_siakad.sql`

### 3. Environment Variables

```bash
# LMS
cp apps/lms/.env.example apps/lms/.env.local
# Edit apps/lms/.env.local dengan credentials Supabase LMS

# SIAKAD
cp apps/siakad/.env.example apps/siakad/.env.local
# Edit apps/siakad/.env.local dengan credentials Supabase SIAKAD
```

### 4. Jalankan Development Server

```bash
# Jalankan kedua app sekaligus dari root
npm run dev

# Atau jalankan satu per satu:
npm run dev:lms     # → http://localhost:3000
npm run dev:siakad  # → http://localhost:3001
```

## API Endpoints

### LMS API (port 3000)

| Method | Endpoint | Role | Fungsi |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Daftar akun baru |
| GET | `/api/auth/me` | Auth | Profil user aktif |
| GET | `/api/classes` | Auth | List kelas |
| POST | `/api/classes` | Lecturer | Buat kelas |
| POST | `/api/classes/join` | Student | Join kelas via kode |
| GET | `/api/classes/[id]` | Auth | Detail kelas |
| GET/POST | `/api/classes/[id]/posts` | Auth | Stream posts |
| GET/POST | `/api/classes/[id]/assignments` | Auth | Tugas |
| POST | `/api/assignments/[id]/submit` | Student | Kumpul tugas |
| PATCH | `/api/submissions/[id]/grade` | Lecturer | Input nilai |
| POST | `/api/attendance/open` | Lecturer | Buka sesi absensi |
| POST | `/api/attendance/checkin` | Student | Absen (token + GPS) |
| GET | `/api/classes/[id]/attendance` | Auth | Rekap absensi |
| GET/POST | `/api/classes/[id]/gradebook` | Lecturer | Rekap nilai |
| **POST** | **`/api/integration/sync`** | Lecturer | **Sinkronisasi ke SIAKAD** |
| GET/PATCH | `/api/notifications` | Auth | Notifikasi |

### SIAKAD API (port 3001)

| Method | Endpoint | Auth | Fungsi |
|---|---|---|---|
| **POST** | **`/api/v1/sync-grades`** | API Key | **Terima data dari LMS** |

## Fitur Utama

### Mahasiswa
- Dashboard kelas (mirip Google Classroom)
- Join kelas via kode 6-digit
- Lihat stream, unduh materi
- Kumpul tugas (upload file)
- **Absensi dengan token + validasi GPS** (radius 150m dari kampus)
- Lihat nilai per tugas dan nilai akhir
- Notifikasi real-time (tugas baru, nilai masuk)

### Dosen
- Dashboard dengan statistik kelas
- Buat kelas dengan bobot nilai custom (UTS, UAS, Tugas, Kuis, Absensi)
- Publish pengumuman, materi, tugas
- **Buka sesi absensi dengan QR Code dinamis** (expire 15 menit)
- Live tabel kehadiran (Supabase Realtime)
- Input nilai submission inline
- **Sinkronisasi nilai ke SIAKAD** dengan batching & error handling
- Status badge per mahasiswa (Pending/Synced/Failed)

### SIAKAD (Dummy)
- Terima data nilai dari J-Learn via API Key
- Tampilkan tabel rekap nilai akademik
- Auto-generate nilai huruf (A/A-/B+/B/B-/C+/C/C-/D/E)
- Dashboard statistik penerimaan data

## Diagram Integrasi

```
[Dosen klik "Kirim ke SIAKAD"]
         ↓
[LMS Backend: /api/integration/sync]
         ↓ (batching 50 data/request)
[SIAKAD Backend: /api/v1/sync-grades]
         ↓ (validasi API Key)
[Supabase SIAKAD: academic_records]
         ↓
[SIAKAD Frontend: auto-refresh]
```

## Pengujian

```bash
# Gunakan Postman atau Thunder Client untuk test API
# Base URL LMS: http://localhost:3000/api
# Base URL SIAKAD: http://localhost:3001/api

# Test sinkronisasi:
POST http://localhost:3001/api/v1/sync-grades
Headers: x-api-key: SIAKAD_SECRET_INTEGRATION_KEY_JLEARN_2025
Body: { ... lihat dokumentasi API ... }
```
