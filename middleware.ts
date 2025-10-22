import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"

export default async function middleware(request: NextRequest) {
  const session = await auth()
  const isAuth = !!session
  const pathname = request.nextUrl.pathname

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isProtectedRoute = pathname.startsWith('/teacher') || pathname.startsWith('/student')

  // 인증된 사용자가 auth 페이지에 접근하려는 경우
  if (isAuthPage && isAuth) {
    if (session.user.role === 'TEACHER') {
      return NextResponse.redirect(new URL('/teacher', request.url))
    } else {
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  // 보호된 라우트에 인증되지 않은 사용자가 접근하려는 경우
  if (isProtectedRoute && !isAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 역할 기반 접근 제어
  if (isAuth && session.user.role) {
    // 교사 전용 페이지
    if (pathname.startsWith('/teacher') && session.user.role !== 'TEACHER') {
      return NextResponse.redirect(new URL('/student', request.url))
    }

    // 학생 전용 페이지
    if (pathname.startsWith('/student') && session.user.role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/teacher', request.url))
    }

    // 루트 페이지 접근 시 역할에 따라 리다이렉트 (이미 로그인된 사용자)
    if (pathname === '/' && isAuth) {
      if (session.user.role === 'TEACHER') {
        return NextResponse.redirect(new URL('/teacher', request.url))
      } else {
        return NextResponse.redirect(new URL('/student', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ]
}