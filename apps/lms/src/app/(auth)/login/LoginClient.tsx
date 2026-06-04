'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getHomePathForRole } from '@/lib/role-routes'
import { KeyRound, Mail, AlertTriangle, Eye, EyeOff, Loader2, User, Phone, MapPin, Calendar, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function LoginClient() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let width = (canvas.width = window.innerWidth)
        let height = (canvas.height = window.innerHeight)

        const handleResize = () => {
            if (!canvas) return
            // Only update on width change to prevent mobile scroll glitch
            if (window.innerWidth !== width) {
                width = canvas.width = window.innerWidth
                height = canvas.height = window.innerHeight
            }
        }
        window.addEventListener('resize', handleResize)

        // Create 24 lightweight floating particles with campus theme colors (navy & gold)
        const particles: Array<{
            x: number
            y: number
            vx: number
            vy: number
            radius: number
            alpha: number
            color: string
        }> = []

        const themeColors = [
            '30, 58, 138',   // STMIK Navy
            '212, 175, 55',  // J-Learn Gold
            '59, 130, 246'   // sky blue
        ]

        for (let i = 0; i < 24; i++) {
            const color = themeColors[Math.floor(Math.random() * themeColors.length)]
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.25, // slow motion
                vy: (Math.random() - 0.5) * 0.25,
                radius: Math.random() * 3 + 2,   // size 2px to 5px (visible)
                alpha: Math.random() * 0.35 + 0.15, // opacity 0.15 to 0.50 (perfectly visible)
                color
            })
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height)

            particles.forEach((p) => {
                p.x += p.vx
                p.y += p.vy

                // Wrap around edges
                if (p.x < 0) p.x = width
                if (p.x > width) p.x = 0
                if (p.y < 0) p.y = height
                if (p.y > height) p.y = 0

                ctx.beginPath()
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`
                ctx.fill()
            })

            animationFrameId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', handleResize)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    useEffect(() => {
        // Mobile splash screen logic
        const timer1 = setTimeout(() => {
            setFadeSplash(true)
        }, 2000) // Hold for 2 seconds
        
        const timer2 = setTimeout(() => {
            setShowMobileSplash(false)
        }, 2500) // Completely remove 500ms later matching the CSS transition

        return () => {
            clearTimeout(timer1)
            clearTimeout(timer2)
        }
    }, [])

    // State for Login
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingGoogle, setLoadingGoogle] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // State for Mobile Splash Screen
    const [showMobileSplash, setShowMobileSplash] = useState(true)
    const [fadeSplash, setFadeSplash] = useState(false)

    // State for Slide Panel
    const [isRegistering, setIsRegistering] = useState(false)

    // State for Registration
    const [regName, setRegName] = useState('')
    const [regEmail, setRegEmail] = useState('')
    const [regPhone, setRegPhone] = useState('')
    const [regDob, setRegDob] = useState('')
    const [regAddress, setRegAddress] = useState('')
    const [loadingReg, setLoadingReg] = useState(false)

    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectParam = searchParams.get('redirect')
    const paramError = searchParams.get('error')

    const getErrorMessage = (code: string) => {
        if (code === 'account_deactivated') {
            return 'Akun Anda dinonaktifkan. Silakan hubungi admin akademik.'
        }
        return 'Silakan login terlebih dahulu.'
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccessMsg(null)

        const supabase = createClient()

        try {
            // Intercept for Backup Dosen
            if (email.startsWith('backup.')) {
                const backupRes = await fetch('/api/v1/dosen/backup/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                })
                const backupJson = await backupRes.json()
                if (backupJson.success) {
                    router.push('/lecturer/dashboard')
                    router.refresh()
                    return
                } else {
                    throw new Error(backupJson.error || 'Akun backup tidak valid atau expired')
                }
            }

            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                throw new Error(authError.message === 'Invalid login credentials'
                    ? 'Email atau password salah'
                    : authError.message
                )
            }

            if (data.user) {
                // Fetch role
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role, is_active')
                    .eq('id', data.user.id)
                    .single()

                if (profileError || !profile) {
                    router.push(redirectParam || '/dashboard')
                    router.refresh()
                    return
                }

                if (!profile.is_active) {
                    await supabase.auth.signOut()
                    throw new Error('Akun Anda dinonaktifkan. Hubungi Administrator.')
                }

                const role = profile.role as string
                const safeRedirect = redirectParam && !redirectParam.startsWith('/lecturer') && role === 'student'
                    ? redirectParam
                    : redirectParam && redirectParam.startsWith('/lecturer') && (role === 'lecturer' || role === 'admin' || role === 'staff')
                        ? redirectParam
                        : getHomePathForRole(role)

                router.push(safeRedirect)
                router.refresh()
            }
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan sistem')
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setLoadingGoogle(true)
        setError(null)
        const supabase = createClient()

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            })
            if (error) throw error
        } catch (err: any) {
            setError(err.message || 'Gagal login dengan Google')
            setLoadingGoogle(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoadingReg(true)
        setError(null)
        setSuccessMsg(null)

        try {
            // Dummy check for presentation (you'd integrate with SIAKAD API here)
            // fetch('/api/v1/mahasiswa-baru', { method: 'POST', body: JSON.stringify({ ... }) })
            await new Promise(resolve => setTimeout(resolve, 1500))

            setSuccessMsg('Pendaftaran awal berhasil. Silakan cek email atau login dengan Google untuk melengkapi profil.')
            setRegName('')
            setRegEmail('')
            setRegPhone('')
            setRegDob('')
            setRegAddress('')
            setTimeout(() => setIsRegistering(false), 3000)
        } catch (err: any) {
            setError(err.message || 'Gagal mendaftar')
        } finally {
            setLoadingReg(false)
        }
    }

    return (
        <div className="relative flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300 overflow-hidden">
            {/* Mobile Splash Screen Overlay */}
            {showMobileSplash && (
                <div className={`fixed inset-0 z-[100] flex flex-col justify-between pt-8 pb-16 px-10 text-slate-800 lg:hidden overflow-hidden bg-white dark:bg-[#121B2E] transition-opacity duration-500 ease-in-out ${fadeSplash ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Background Backdrop for Splash */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="/backdrop-loginform.webp"
                            alt="STMIK Jayakarta Campus Backdrop"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="absolute inset-0 z-10 bg-white/80 dark:bg-[#121B2E]/90 backdrop-blur-[2px]" />

                    {/* Center Content */}
                    <div className="z-20 my-auto flex flex-col items-center text-center -mt-4">
                        <img
                            src="/logo.png"
                            alt="J-Learn Logo"
                            className="h-[320px] w-[320px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                        />
                        <h2 className="-mt-16 text-lg font-black tracking-tight text-slate-900 dark:text-white">
                            Jayakarta <span className="text-primary font-black">Classroom</span>
                        </h2>
                        <p className="mt-2 max-w-xs text-[10px] font-semibold text-slate-600 dark:text-gray-400 leading-relaxed text-center">
                            Platform Learning Management System (LMS) terintegrasi SIAKAD untuk menunjang perkuliahan kolaboratif, aman, dan inovatif.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="z-20 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-3 text-[9px] font-bold text-slate-500 dark:text-gray-400 w-full relative">
                        <span>- 2026 STMIK Jayakarta</span>
                        <div className="flex gap-3">
                            <span className="opacity-80">Bantuan</span>
                            <span className="opacity-80">Panduan</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Background Image Body */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/backdrop-formloginbody.jpg"
                    alt="Body Background"
                    className="h-full w-full object-cover blur-[4px]"
                />
            </div>

            {/* Particle Background Canvas (paling belakang) */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-0 pointer-events-none select-none"
            />

            {/* Container split layout (Clean Melayang) */}
            <div className="z-10 flex w-full max-w-4xl lg:h-[580px] h-auto max-h-[95vh] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#121B2E] m-4 border border-slate-100 dark:border-slate-800">

                {/* Left Side: Brand & Campus Info */}
                <div className="relative hidden w-1/2 flex-col justify-between pt-8 pb-16 px-10 text-slate-800 lg:flex select-none overflow-hidden border-r border-slate-100 dark:border-slate-800/50">
                    <div className="absolute inset-0 z-0">
                        <img
                            src="/backdrop-loginform.webp"
                            alt="STMIK Jayakarta Campus Backdrop"
                            className="h-full w-full object-cover"
                        />
                    </div>

                    <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px]" />

                    <div className="z-20 flex items-center gap-2.5 self-start">
                        <img
                            src="/logo-stmik-jayakarta.webp"
                            alt="STMIK Jayakarta Logo"
                            className="h-[52px] w-[52px] object-contain drop-shadow-sm"
                        />
                        <div className="flex flex-col">
                            <h1 className="text-[12px] font-black tracking-wider text-slate-900 leading-none">STMIK JAYAKARTA</h1>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 leading-none">Academic Ecosystem</p>
                        </div>
                    </div>

                    <div className="z-20 my-auto flex flex-col items-center text-center -mt-4">
                        <img
                            src="/logo.png"
                            alt="J-Learn Logo"
                            className="h-[320px] w-[320px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                        />
                        <h2 className="-mt-14 text-base font-black tracking-tight text-slate-900">
                            Jayakarta <span className="text-primary font-black">Classroom</span>
                        </h2>
                        <p className="mt-1 max-w-xs text-[10px] font-semibold text-slate-600 leading-relaxed text-center">
                            Platform Learning Management System (LMS) terintegrasi SIAKAD untuk menunjang perkuliahan kolaboratif, aman, dan inovatif.
                        </p>
                    </div>

                    <div className="absolute bottom-6 left-10 right-10 z-20 flex items-center justify-between border-t border-slate-200 pt-3 text-[9px] font-bold text-slate-500">
                        <span>- 2026 STMIK Jayakarta</span>
                        <div className="flex gap-3">
                            <a href="#" className="hover:text-slate-900 transition-colors">Bantuan</a>
                            <a href="#" className="hover:text-slate-900 transition-colors">Panduan</a>
                        </div>
                    </div>
                </div>

                {/* Right Side: Interactive Sliding Panels */}
                <div className="relative flex w-full lg:w-1/2 overflow-hidden bg-white dark:bg-[#121B2E]">

                    <div
                        className={`flex w-full h-full transition-transform duration-700 ease-in-out ${isRegistering ? '-translate-x-full' : 'translate-x-0'}`}
                    >
                        {/* ---------------- PANEL 1: LOGIN ---------------- */}
                        <div className="w-full shrink-0 h-full flex flex-col justify-center p-8 sm:p-10 overflow-y-auto custom-scrollbar relative">

                            <div className="flex items-center gap-2.5 mb-6 self-start lg:hidden">
                                <img
                                    src="/logo-stmik-jayakarta.webp"
                                    alt="STMIK Jayakarta Logo"
                                    className="h-[38px] w-[38px] object-contain drop-shadow-sm"
                                />
                                <div className="flex flex-col">
                                    <h1 className="text-[11px] font-black tracking-wider text-slate-900 dark:text-white leading-none">STMIK JAYAKARTA</h1>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 leading-none">Academic Ecosystem</p>
                                </div>
                            </div>

                            <div className="mb-5">
                                <h2 className="text-xl font-black text-slate-800 dark:text-white leading-tight">Selamat Datang</h2>
                                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-gray-400 leading-normal">
                                    Masuk ke akun civitas akademika Anda.
                                </p>
                            </div>

                            {paramError && !error && (
                                <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/20 border border-amber-200/40">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                    <span>{getErrorMessage(paramError)}</span>
                                </div>
                            )}

                            {error && !isRegistering && (
                                <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-[10px] font-bold text-red-800 dark:bg-red-950/20 border border-red-200/40">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-4" suppressHydrationWarning>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        Email Institusi
                                    </label>
                                    <div className="relative mt-1">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                            <Mail className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="email@jayakarta.ac.id"
                                            className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-[#18233C]/80 dark:text-white"
                                            suppressHydrationWarning
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                            Kata Sandi
                                        </label>
                                        <a href="#" className="text-[10px] font-bold text-primary hover:underline dark:text-blue-400">
                                            Lupa Sandi?
                                        </a>
                                    </div>
                                    <div className="relative mt-1">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                            <KeyRound className="h-4 w-4" />
                                        </span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="-"
                                            className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-9 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-[#18233C]/80 dark:text-white"
                                            suppressHydrationWarning
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                            suppressHydrationWarning
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || loadingGoogle}
                                    className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-xs font-bold text-white shadow-md shadow-primary/10 transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50 dark:bg-blue-600"
                                    suppressHydrationWarning
                                >
                                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Masuk...</> : 'Masuk Sistem'}
                                </button>
                            </form>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                                    <span className="bg-white px-3 dark:bg-[#121B2E]">ATAU LANJUTKAN DENGAN</span>
                                </div>
                            </div>

                            {/* Google Login Button */}
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading || loadingGoogle}
                                className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-[#18233C] dark:text-white dark:hover:bg-[#1C2842]"
                                suppressHydrationWarning
                            >
                                {loadingGoogle ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                )}
                                Login dengan Google
                            </button>

                            <p className="mt-8 text-center text-[11px] text-slate-500 dark:text-gray-400">
                                Calon mahasiswa baru?{' '}
                                <button
                                    onClick={() => {
                                        setError(null)
                                        setIsRegistering(true)
                                    }}
                                    className="font-bold text-primary hover:underline dark:text-blue-400"
                                    suppressHydrationWarning
                                >
                                    Daftar di sini
                                </button>
                            </p>

                            {/* Footer inside form */}
                            <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 text-[9px] font-bold text-slate-400 dark:text-gray-500 w-full lg:hidden">
                                <span>- 2026 STMIK Jayakarta</span>
                                <div className="flex gap-3">
                                    <span className="hover:text-slate-600 transition-colors cursor-pointer">Bantuan</span>
                                    <span className="hover:text-slate-600 transition-colors cursor-pointer">Panduan</span>
                                </div>
                            </div>
                        </div>

                        {/* ---------------- PANEL 2: REGISTER (SIMPLIFIED FOR BREVITY - Keep all fields from original) */}
                        <div className="w-full shrink-0 h-full flex flex-col p-8 sm:p-10 overflow-y-auto custom-scrollbar relative bg-slate-50 dark:bg-[#0f1625]">

                            <button
                                onClick={() => {
                                    setError(null)
                                    setSuccessMsg(null)
                                    setIsRegistering(false)
                                }}
                                className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
                                title="Kembali ke Login"
                                suppressHydrationWarning
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>

                            <div className="mt-6 mb-4 md:mt-8 md:mb-6">
                                <h2 className="text-base md:text-xl font-black text-slate-800 dark:text-white leading-tight">Pendaftaran Mahasiswa Baru</h2>
                                <p className="mt-1 text-[10px] md:text-[11px] font-medium text-slate-500 dark:text-gray-400 leading-normal">
                                    Lengkapi data awal untuk proses verifikasi PMB STMIK Jayakarta.
                                </p>
                            </div>

                            {error && isRegistering && (
                                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[10px] font-bold text-red-800 border border-red-200/40">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {successMsg && (
                                <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-[10px] font-bold text-emerald-800 border border-emerald-200/40">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                    <span>{successMsg}</span>
                                </div>
                            )}

                            <form onSubmit={handleRegister} className="space-y-4" suppressHydrationWarning>

                                {/* Full Name */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        Nama Lengkap Sesuai KTP
                                    </label>
                                    <div className="relative mt-1">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><User className="h-4 w-4" /></span>
                                        <input
                                            type="text" required value={regName} onChange={(e) => setRegName(e.target.value)}
                                            placeholder="Masukkan nama lengkap"
                                            className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                                            suppressHydrationWarning
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        Email Pribadi (Aktif)
                                    </label>
                                    <div className="relative mt-1">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Mail className="h-4 w-4" /></span>
                                        <input
                                            type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                                            placeholder="email@gmail.com"
                                            className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                                            suppressHydrationWarning
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        Nomor WhatsApp
                                    </label>
                                    <div className="relative mt-1">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Phone className="h-4 w-4" /></span>
                                        <input
                                            type="tel" required value={regPhone} onChange={(e) => setRegPhone(e.target.value)}
                                            placeholder="+62..."
                                            className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                                            suppressHydrationWarning
                                        />
                                    </div>
                                </div>

                                {/* DOB */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        Tanggal Lahir
                                    </label>
                                    <div className="relative mt-1">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Calendar className="h-4 w-4" /></span>
                                        <input
                                            type="date" required value={regDob} onChange={(e) => setRegDob(e.target.value)}
                                            className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        Alamat Lengkap
                                    </label>
                                    <div className="relative mt-1">
                                        <span className="absolute top-3 left-0 flex items-center pl-3 text-slate-400"><MapPin className="h-4 w-4" /></span>
                                        <textarea
                                            required value={regAddress} onChange={(e) => setRegAddress(e.target.value)}
                                            placeholder="Jl. Alamat No. XX..."
                                            rows={3}
                                            className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 resize-none dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loadingReg}
                                    className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-xs font-bold text-white shadow-md shadow-primary/10 transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50 dark:bg-blue-600"
                                    suppressHydrationWarning
                                >
                                    {loadingReg ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mendaftar...</> : 'Daftar Sekarang'}
                                </button>
                            </form>

                            <p className="mt-6 text-center text-[11px] text-slate-500 dark:text-gray-400">
                                Sudah punya akun?{' '}
                                <button
                                    onClick={() => {
                                        setError(null)
                                        setIsRegistering(false)
                                    }}
                                    className="font-bold text-primary hover:underline dark:text-blue-400"
                                    suppressHydrationWarning
                                >
                                    Masuk di sini
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
