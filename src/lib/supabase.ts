import { createClient } from '@supabase/supabase-js'

// 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
}

// 클라이언트용 Supabase 인스턴스 (브라우저에서도 사용 가능)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 서버 전용 Supabase 인스턴스 (관리자 권한)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// Storage 버킷 이름 상수
export const STORAGE_BUCKETS = {
  RECORDINGS: 'recordings',        // 비디오 녹화 파일
  SUBMISSIONS: 'submissions',      // 학생 제출 이미지
  PROBLEMS: 'problems',            // 문제 이미지
} as const