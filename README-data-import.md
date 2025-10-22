# 문제은행 데이터 가져오기 가이드

이 가이드는 JSON 형태의 문제은행 데이터와 이미지 파일을 데이터베이스와 서버에 업로드하는 방법을 설명합니다.

## 전제 조건

1. PostgreSQL 데이터베이스가 실행 중이어야 합니다
2. `.env` 파일에 `DATABASE_URL`이 올바르게 설정되어 있어야 합니다
3. Node.js와 npm이 설치되어 있어야 합니다

## 1. 데이터베이스 스키마 적용

```bash
# 데이터베이스 스키마 적용
npm run db:push

# 또는 마이그레이션 사용
npm run db:migrate
```

## 2. 데이터 디렉토리 구조

다음과 같은 구조로 데이터를 준비하세요:

```
data/
├── problems/
│   ├── elementary_math_1.json
│   ├── elementary_math_2.json
│   └── middle_school_math.json
└── images/
    ├── problem_001.png
    ├── problem_002.jpg
    └── ...
```

## 3. JSON 데이터 형식

JSON 파일은 다음 중 하나의 구조를 가져야 합니다:

### 옵션 1: 문제 배열
```json
[
  {
    "id": "problem_001",
    "source_data_name": "초등수학 4학년 1학기",
    "grade": "4학년",
    "semester": "1학기",
    "subject": "수학",
    "level_of_difficulty": "중",
    "types_of_problems": "주관식",
    "unit": "수와 연산",
    "school": "초등학교",
    "question": "다음 계산을 하시오.",
    "image_path": "problem_001.png",
    "answer": "24",
    "2015_achievement_standard": ["[4수01-04] 곱하는 수가..."],
    "2022_achievement_standard": ["[4수01-04] 곱하는 수가..."]
  }
]
```

### 옵션 2: 래핑된 구조
```json
{
  "problems": [...],
  // 또는
  "data": [...]
}
```

## 4. 이미지 파일 업로드

### 4-1. 기본 복사 모드
```bash
# 이미지 파일을 public/problems/ 디렉토리로 복사
npm run import:images [소스디렉토리] [대상디렉토리]

# 예시
npm run import:images ./data/images ./public/problems

# 테스트 실행 (실제 복사하지 않음)
npm run import:images ./data/images ./public/problems -- --dry-run
```

### 4-2. 문제 ID별 정리 모드
```bash
# 파일명을 문제 ID에 맞게 정리하여 복사
npm run import:images ./data/images ./public/problems organize

# 예시: problem_12345.jpg -> 12345.jpg
```

## 5. JSON 데이터 업로드

### 5-1. 단일 파일 업로드
```bash
npm run import:problems ./data/problems/elementary_math_1.json
```

### 5-2. 디렉토리 일괄 업로드
```bash
npm run import:problems ./data/problems
```

### 5-3. 기본 디렉토리 사용
```bash
# ./data 디렉토리의 모든 JSON 파일 처리
npm run import:problems
```

## 6. 전체 업로드 프로세스

```bash
# 1. 데이터베이스 스키마 적용
npm run db:push

# 2. 이미지 파일 업로드 (테스트)
npm run import:images ./data/images ./public/problems -- --dry-run

# 3. 이미지 파일 실제 업로드
npm run import:images ./data/images ./public/problems

# 4. JSON 데이터 업로드
npm run import:problems ./data/problems

# 5. 데이터베이스 확인
npm run db:studio
```

## 7. 문제 해결

### 데이터베이스 연결 오류
```bash
# PostgreSQL이 실행 중인지 확인
psql -h localhost -p 5432 -U your_username -d your_database

# .env 파일의 DATABASE_URL 확인
cat .env | grep DATABASE_URL
```

### 중복 데이터 처리
- 스크립트는 자동으로 중복 문제를 건너뜁니다
- `sourceId` 필드를 기준으로 중복을 확인합니다

### 이미지 파일 누락
- 이미지 파일이 없어도 문제 데이터는 저장됩니다
- `imageUrl` 필드가 null로 설정됩니다

## 8. 데이터 확인

```bash
# Prisma Studio로 데이터 확인
npm run db:studio

# 또는 직접 쿼리
npx prisma db seed --preview-feature
```

## 9. 백업 및 복원

### 백업
```bash
pg_dump your_database > backup.sql
```

### 복원
```bash
psql your_database < backup.sql
```

## 10. 성능 최적화

대량의 데이터 업로드 시:

1. 배치 크기 조정 (스크립트에서 100개씩 처리)
2. 인덱스 최적화
3. 트랜잭션 단위 조정

문제나 질문이 있으면 개발팀에 문의하세요.