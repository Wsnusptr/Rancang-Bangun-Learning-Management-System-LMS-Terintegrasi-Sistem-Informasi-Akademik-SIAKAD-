import { Suspense } from 'react'
import LoginClient from './LoginClient'

function LoginSkeleton() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="animate-pulse text-slate-400">Loading...</div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginClient />
    </Suspense>
  )
}
