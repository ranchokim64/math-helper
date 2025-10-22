#!/bin/bash

# 문제은행 데이터베이스 설정 스크립트
echo "=== 문제은행 데이터베이스 설정 시작 ==="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 단계별 실행
echo -e "\n${YELLOW}1. 데이터베이스 스키마 적용...${NC}"
npm run db:push
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 스키마 적용 완료${NC}"
else
    echo -e "${RED}✗ 스키마 적용 실패${NC}"
    exit 1
fi

echo -e "\n${YELLOW}2. 이미지 파일 업로드 (테스트 모드)...${NC}"
npm run import:images ./data/images ./public/problems -- --dry-run
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 이미지 테스트 완료${NC}"

    echo -e "\n${YELLOW}3. 이미지 파일 실제 업로드...${NC}"
    npm run import:images ./data/images ./public/problems
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 이미지 업로드 완료${NC}"
    else
        echo -e "${RED}✗ 이미지 업로드 실패${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ 이미지 테스트 실패${NC}"
    exit 1
fi

echo -e "\n${YELLOW}4. 문제 데이터 업로드...${NC}"
npm run import:problems ./data/problems
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 문제 데이터 업로드 완료${NC}"
else
    echo -e "${RED}✗ 문제 데이터 업로드 실패${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== 모든 설정이 완료되었습니다! ===${NC}"
echo -e "\n다음 명령으로 데이터를 확인할 수 있습니다:"
echo -e "  ${YELLOW}npm run db:studio${NC}"
echo -e "\n개발 서버 실행:"
echo -e "  ${YELLOW}npm run dev${NC}"