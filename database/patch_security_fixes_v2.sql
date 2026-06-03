-- PATCH: Fix Critical Security Vulnerabilities in Supabase RLS

-- 1. FIX MAHASISWA BARU (High Severity)
-- Menghapus hak akses Publik untuk memodifikasi atau melihat data sensitif pendaftar
DROP POLICY IF EXISTS "Allow public update on mahasiswa_baru" ON public.mahasiswa_baru;
DROP POLICY IF EXISTS "Allow public select on mahasiswa_baru" ON public.mahasiswa_baru;
DROP POLICY IF EXISTS "Allow public insert on mahasiswa_baru" ON public.mahasiswa_baru;

-- Sebagai gantinya, pendaftar yang sudah login menggunakan Google dapat melihat data pendaftarannya sendiri
CREATE POLICY "mahasiswa_baru_select_own" ON public.mahasiswa_baru
AS PERMISSIVE FOR SELECT
TO authenticated
USING (google_id = auth.uid()::text);

-- Menambahkan policy UPDATE khusus untuk Admin/Staff (opsional namun sangat disarankan sebagai best practice)
CREATE POLICY "mahasiswa_baru_admin_update"
ON public.mahasiswa_baru
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin','staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin','staff')
  )
);

-- Catatan:
-- Operasi INSERT/UPDATE data pendaftar baru dilakukan melalui Next.js API (/api/v1/pmb/sync)
-- yang menggunakan Supabase Service Role Key, sehingga otomatis membypass RLS ini dengan aman.


-- 2. FIX NOTIFICATIONS (High Severity)
-- Menghapus kemampuan client/publik untuk mengirim notifikasi secara sepihak
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;

-- Catatan:
-- Semua notifikasi baru sekarang dikirim dari Next.js API (seperti /api/classes/[id]/assignments/route.ts)
-- menggunakan `createAdminClient()` (Supabase Service Role Key).
-- RLS tidak perlu mendefinisikan INSERT policy untuk notifikasi karena insert hanya boleh melalui backend.
