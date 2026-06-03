-- Backfill banner kelas yang masih NULL (jalankan sekali, opsional)
-- Kelas tanpa cover_image_url akan pakai placeholder client-side;
-- script ini menyimpan URL auto ke database agar konsisten.

-- Catatan: URL di-generate di aplikasi (Unsplash). Untuk kelas existing,
-- refresh dashboard LMS sudah cukup — client fallback otomatis.
-- Update manual contoh untuk Pemrograman Web:
-- UPDATE classes SET cover_image_url = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&h=360&q=80&fm=webp'
-- WHERE class_name ILIKE '%pemrograman web%' AND cover_image_url IS NULL;
