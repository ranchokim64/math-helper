import { PrismaClient } from '@prisma/client'
import { extractAreaFromAchievements } from './achievement-area-mapping'

const prisma = new PrismaClient()

async function migrateAreas() {
  console.log('기존 문제 데이터의 영역 마이그레이션을 시작합니다...')

  try {
    // 영역이 없는 문제들 조회
    const problems = await prisma.problem.findMany({
      where: {
        area: null
      },
      select: {
        id: true,
        sourceId: true,
        achievementStandards: true
      }
    })

    console.log(`영역이 없는 문제 ${problems.length}개를 발견했습니다.`)

    let updatedCount = 0
    let failedCount = 0

    for (const problem of problems) {
      try {
        // 성취기준에서 영역 추출
        let area: string | null = null

        if (Array.isArray(problem.achievementStandards)) {
          area = extractAreaFromAchievements(problem.achievementStandards as string[])
        }

        if (area) {
          // 영역 업데이트
          await prisma.problem.update({
            where: { id: problem.id },
            data: { area }
          })
          updatedCount++
          console.log(`문제 ${problem.sourceId}: ${area}`)
        } else {
          failedCount++
          console.log(`문제 ${problem.sourceId}: 영역을 추출할 수 없음`)
        }

      } catch (error) {
        failedCount++
        console.error(`문제 ${problem.sourceId} 업데이트 실패:`, error)
      }
    }

    console.log('\n마이그레이션 완료:')
    console.log(`- 성공: ${updatedCount}개`)
    console.log(`- 실패: ${failedCount}개`)

    // 영역별 통계 출력
    const areaStats = await prisma.problem.groupBy({
      by: ['area'],
      _count: {
        area: true
      }
    })

    console.log('\n영역별 문제 수:')
    areaStats.forEach(stat => {
      console.log(`- ${stat.area || '미분류'}: ${stat._count.area}개`)
    })

  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateAreas().catch(console.error)