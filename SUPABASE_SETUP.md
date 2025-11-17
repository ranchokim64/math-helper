# Supabase 설정 가이드

이 문서는 쌤스케치 앱을 Supabase와 연동하여 프로덕션 환경으로 마이그레이션하는 방법을 설명합니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인하거나 계정 생성
2. 새 프로젝트 생성
   - Organization 선택 또는 생성
   - Project name: `ssam-sketch` (또는 원하는 이름)
   - Database Password: 강력한 비밀번호 설정 (잘 보관하세요!)
   - Region: **Northeast Asia (Seoul)** 선택 (한국 사용자 대상이므로)
   - Pricing Plan: **Pro** ($25/월) 선택
     - 이유: 100GB 스토리지 포함, 더 많은 대역폭, 무제한 API 요청

3. 프로젝트 생성 완료 대기 (1-2분 소요)

## 2. 환경 변수 설정

### 2.1 Supabase 프로젝트 설정에서 정보 가져오기

1. **Database URL 가져오기**
   - Supabase 대시보드 → Project Settings → Database
   - Connection string 섹션에서 **Connection pooling** 탭 선택
   - Mode: **Transaction** 선택
   - 연결 문자열 복사 (예: `postgresql://postgres.[REF]:[PASSWORD]@...`)
   - `[YOUR-PASSWORD]`를 실제 데이터베이스 비밀번호로 교체

2. **API Keys 가져오기**
   - Supabase 대시보드 → Project Settings → API
   - **Project URL** 복사
   - **anon public** key 복사
   - **service_role** key 복사 (⚠️ 절대 클라이언트에 노출하지 마세요!)

### 2.2 .env 파일 업데이트

`.env` 파일을 열고 다음 값들을 업데이트하세요:

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

## 3. 데이터베이스 마이그레이션

### 3.1 Prisma 마이그레이션 실행

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 스키마 푸시
npx prisma db push
```

### 3.2 기존 데이터 마이그레이션 (선택사항)

기존 SQLite 데이터가 있다면:

```bash
# 기존 데이터를 JSON으로 내보내기
npx prisma db seed  # 또는 커스텀 내보내기 스크립트 작성

# PostgreSQL로 데이터 임포트
# (필요시 별도 스크립트 작성)
```

## 4. Supabase Storage 설정

### 4.1 Storage Buckets 생성

스크립트가 자동으로 생성하지만, 수동으로도 가능합니다:

1. Supabase 대시보드 → Storage
2. 다음 3개의 public bucket 생성:
   - `recordings` - 학생 녹화 비디오
   - `submissions` - 학생 제출 이미지
   - `problems` - 문제 이미지

**각 bucket 설정:**
- Public bucket: ✅ 체크
- File size limit: 10MB
- Allowed MIME types:
  - `recordings`: `video/webm`
  - `submissions`: `image/jpeg`
  - `problems`: `image/png`

### 4.2 문제 이미지 업로드

로컬의 374MB 문제 이미지를 Supabase Storage로 업로드:

```bash
npx tsx scripts/upload-images-to-supabase.ts
```

이 스크립트는:
- ✅ `problems` bucket 자동 생성 (없는 경우)
- ✅ `public/images/problems`의 모든 PNG 파일 업로드
- ✅ 데이터베이스의 `imageUrl` 필드 자동 업데이트
- ✅ 진행 상황 및 결과 표시

**예상 소요 시간:** 7,157개 파일 기준 10-20분

## 5. Storage 정책 (Row Level Security) 설정

Supabase Storage는 기본적으로 모든 접근을 차단합니다. 정책 설정 필요:

### 5.1 problems bucket (공개 읽기)

```sql
-- Supabase 대시보드 → Storage → problems → Policies

-- 정책 1: 누구나 읽기 가능
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'problems');

-- 정책 2: 인증된 사용자만 업로드
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'problems');
```

### 5.2 recordings bucket (학생별 접근 제어)

```sql
-- 정책 1: 자신의 녹화만 업로드
CREATE POLICY "Users can upload own recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 정책 2: 자신의 녹화만 읽기
CREATE POLICY "Users can read own recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 정책 3: 선생님은 모든 녹화 읽기 가능
-- (User 테이블의 role 필드 활용)
```

### 5.3 submissions bucket (recordings와 동일한 정책)

```sql
-- recordings와 동일한 정책을 submissions bucket에도 적용
-- bucket_id만 'submissions'로 변경
```

## 6. 애플리케이션 테스트

### 6.1 로컬 테스트

```bash
# 개발 서버 실행
npm run dev
```

**확인 사항:**
- ✅ 문제 이미지가 Supabase에서 로드되는지
- ✅ 학생이 과제를 제출할 때 녹화 파일이 업로드되는지
- ✅ 제출 이미지가 저장되는지
- ✅ 데이터베이스 연결이 정상인지

### 6.2 Supabase 대시보드에서 확인

1. **Storage 확인**
   - Storage → recordings: 녹화 파일 확인
   - Storage → submissions: 제출 이미지 확인
   - Storage → problems: 문제 이미지 확인 (7,157개)

2. **Database 확인**
   - Table Editor에서 데이터 확인
   - User, Assignment, Submission, ProblemRecording 테이블

## 7. Vercel 배포

### 7.1 Vercel 프로젝트 생성

1. [Vercel](https://vercel.com)에 로그인
2. Import Project → GitHub 저장소 선택
3. Framework Preset: **Next.js** 자동 감지

### 7.2 환경 변수 설정

Vercel 프로젝트 → Settings → Environment Variables에 추가:

```bash
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@..."
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-nextauth-secret"
```

⚠️ **중요:** Production, Preview, Development 모두에 적용

### 7.3 배포

```bash
git push origin main
```

Vercel이 자동으로 빌드 및 배포합니다.

## 8. 비용 예측

### 초기 (1000명 학생 기준)

**Supabase Pro - $25/월**
- Database: 8GB (충분)
- Storage: 100GB 포함
  - 문제 이미지: 0.4GB
  - 녹화/제출물: 예상 50-80GB/년
- Bandwidth: 250GB 포함
- 추가 스토리지: $0.021/GB

**Vercel Pro - $20/월**
- Bandwidth: 1TB
- Serverless Function 실행: 1,000시간
- 빌드 시간: 6,000분

**총 초기 비용: $45-50/월**

### 성장 시 (5000명)

- Supabase: $25 + 추가 스토리지 ~$50 = $75/월
- Vercel: $20/월 (충분)
- **총: $95-100/월**

## 9. 추가 최적화

### 9.1 녹화 파일 압축

- WebM 코덱 설정 최적화
- 비트레이트 조정으로 파일 크기 50% 감소 가능

### 9.2 CDN 캐싱

- Supabase Storage는 기본적으로 CDN 제공
- `Cache-Control` 헤더 활용

### 9.3 데이터베이스 인덱스

- 이미 최적화된 인덱스 포함 (`prisma/schema.prisma`)
- 필요시 추가 인덱스 생성

## 10. 문제 해결

### 문제 1: "Missing environment variables"

- `.env` 파일의 모든 변수가 설정되었는지 확인
- Vercel에도 동일한 변수를 설정했는지 확인

### 문제 2: Storage 업로드 실패

- Storage bucket이 public으로 설정되었는지 확인
- RLS 정책이 올바른지 확인
- `SUPABASE_SERVICE_ROLE_KEY`가 설정되었는지 확인

### 문제 3: 데이터베이스 연결 실패

- `DATABASE_URL`이 올바른지 확인
- Connection pooling 모드 사용 (`?pgbouncer=true`)
- Supabase 대시보드에서 데이터베이스 상태 확인

### 문제 4: 이미지 로딩 실패

- Supabase Storage에서 이미지 URL 확인
- 브라우저 개발자 도구에서 네트워크 탭 확인
- CORS 설정 확인 (Supabase는 기본적으로 허용)

## 다음 단계

✅ Supabase 프로젝트 생성 완료
✅ 환경 변수 설정 완료
✅ 데이터베이스 마이그레이션 완료
✅ 문제 이미지 업로드 완료
✅ 로컬 테스트 완료
✅ Vercel 배포 완료

🎉 **프로덕션 준비 완료!**