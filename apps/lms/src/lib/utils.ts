// ============================================================
// Response helpers - Standardized API responses
// ============================================================

import { NextResponse } from 'next/server'

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: Record<string, unknown>
}

export function successResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data, message, meta },
    { status }
  )
}

export function errorResponse(
  error: string,
  status = 400,
  details?: Record<string, unknown>
) {
  return NextResponse.json<ApiResponse>(
    { success: false, error, ...details },
    { status }
  )
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse(message, 401)
}

export function forbiddenResponse(message = 'Access denied') {
  return errorResponse(message, 403)
}

export function notFoundResponse(resource = 'Resource') {
  return errorResponse(`${resource} not found`, 404)
}

export function serverErrorResponse(error: unknown) {
  console.error('[API Error]', error)
  let message = 'Internal server error'
  if (error instanceof Error) {
    message = error.message
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    message = String((error as any).message)
  } else {
    message = JSON.stringify(error)
  }
  return errorResponse(message, 500)
}

// ============================================================
// Token generator - for attendance sessions
// ============================================================

export function generateAttendanceToken(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

// ============================================================
// Grade utilities
// ============================================================

export function calculateLetterGrade(score: number): {
  letter: string
  gradePoints: number
} {
  if (score >= 85) return { letter: 'A', gradePoints: 4.0 }
  if (score >= 80) return { letter: 'A-', gradePoints: 3.7 }
  if (score >= 75) return { letter: 'B+', gradePoints: 3.3 }
  if (score >= 70) return { letter: 'B', gradePoints: 3.0 }
  if (score >= 65) return { letter: 'B-', gradePoints: 2.7 }
  if (score >= 60) return { letter: 'C+', gradePoints: 2.3 }
  if (score >= 55) return { letter: 'C', gradePoints: 2.0 }
  if (score >= 50) return { letter: 'C-', gradePoints: 1.7 }
  if (score >= 40) return { letter: 'D', gradePoints: 1.0 }
  return { letter: 'E', gradePoints: 0.0 }
}

export function calculateWeightedScore(components: {
  attendanceScore: number
  assignmentScore: number
  quizScore: number
  midtermScore: number
  finalScore: number
  weights: {
    attendance: number
    assignments: number
    quiz: number
    midterm: number
    final: number
  }
}): number {
  const { attendanceScore, assignmentScore, quizScore, midtermScore, finalScore, weights } =
    components
  return (
    (attendanceScore * weights.attendance) / 100 +
    (assignmentScore * weights.assignments) / 100 +
    (quizScore * weights.quiz) / 100 +
    (midtermScore * weights.midterm) / 100 +
    (finalScore * weights.final) / 100
  )
}

// ============================================================
// Chunk array - for batch processing
// ============================================================

export function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  )
}

// ============================================================
// Date utilities
// ============================================================

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  })
}

export function isExpired(expiresAt: string | Date): boolean {
  return new Date() > new Date(expiresAt)
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}
