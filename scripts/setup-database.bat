@echo off
setlocal enabledelayedexpansion

echo === 문제은행 데이터베이스 설정 시작 ===

echo.
echo 1. 데이터베이스 스키마 적용...
call npm run db:push
if !errorlevel! neq 0 (
    echo ✗ 스키마 적용 실패
    pause
    exit /b 1
)
echo ✓ 스키마 적용 완료

echo.
echo 2. 이미지 파일 업로드 (테스트 모드)...
call npm run import:images ./data/images ./public/problems -- --dry-run
if !errorlevel! neq 0 (
    echo ✗ 이미지 테스트 실패
    pause
    exit /b 1
)
echo ✓ 이미지 테스트 완료

echo.
echo 3. 이미지 파일 실제 업로드...
call npm run import:images ./data/images ./public/problems
if !errorlevel! neq 0 (
    echo ✗ 이미지 업로드 실패
    pause
    exit /b 1
)
echo ✓ 이미지 업로드 완료

echo.
echo 4. 문제 데이터 업로드...
call npm run import:problems ./data/problems
if !errorlevel! neq 0 (
    echo ✗ 문제 데이터 업로드 실패
    pause
    exit /b 1
)
echo ✓ 문제 데이터 업로드 완료

echo.
echo === 모든 설정이 완료되었습니다! ===
echo.
echo 다음 명령으로 데이터를 확인할 수 있습니다:
echo   npm run db:studio
echo.
echo 개발 서버 실행:
echo   npm run dev
echo.
pause