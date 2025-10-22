const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAchievementFormats() {
  try {
    const samples = await prisma.problem.findMany({
      select: {
        sourceId: true,
        achievementStandards: true
      },
      take: 10
    });

    console.log('=== 기존 데이터의 성취기준 형식 예시 ===\n');

    samples.forEach((problem, index) => {
      console.log(`${index + 1}. 문제 ID: ${problem.sourceId}`);
      console.log(`   성취기준 원본: ${JSON.stringify(problem.achievementStandards)}`);

      // 성취기준이 배열인지 확인
      if (Array.isArray(problem.achievementStandards)) {
        console.log(`   첫 번째 성취기준: "${problem.achievementStandards[0]}"`);
        console.log(`   전체 개수: ${problem.achievementStandards.length}개`);
      } else {
        console.log(`   타입: ${typeof problem.achievementStandards}`);
      }
      console.log('');
    });

    // 매핑 시스템에서 기대하는 형식 예시
    console.log('=== 매핑 시스템에서 기대하는 성취기준 형식 ===');
    console.log('예시: "[4수01-05]", "[2수04-01]", "[6수03-01]"');
    console.log('패턴: [학년코드수영역번호-순서번호]');
    console.log('- 학년코드: 2(1-2학년), 4(3-4학년), 6(5-6학년)');
    console.log('- 영역번호: 01(수와연산), 02(변화관계), 03(도형측정), 04(자료가능성)');

  } catch (error) {
    console.error('데이터 확인 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAchievementFormats();