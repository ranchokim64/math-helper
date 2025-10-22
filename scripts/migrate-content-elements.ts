import { PrismaClient } from '@prisma/client'
import { extractContentElementFromAchievements } from './achievement-area-mapping'

const prisma = new PrismaClient()

async function migrateContentElements() {
  console.log('기존 문제 데이터의 내용요소 마이그레이션을 시작합니다...')

  try {
    // 내용요소가 없는 문제들 조회
    const problems = await prisma.problem.findMany({
      where: {
        contentElement: null
      },
      select: {
        id: true,
        sourceId: true,
        achievementStandards: true
      }
    })

    console.log(`내용요소가 없는 문제 ${problems.length}개를 발견했습니다.`)

    let updatedCount = 0
    let failedCount = 0

    for (const problem of problems) {
      try {
        // 성취기준에서 내용요소 추출
        let contentElement: string | null = null

        if (Array.isArray(problem.achievementStandards)) {
          contentElement = extractContentElementFromAchievements(problem.achievementStandards as string[])
        }

        if (contentElement) {
          // 내용요소 업데이트
          await prisma.problem.update({
            where: { id: problem.id },
            data: { contentElement }
          })
          updatedCount++
          console.log(`문제 ${problem.sourceId}: ${contentElement}`)
        } else {
          failedCount++
          console.log(`문제 ${problem.sourceId}: 내용요소를 추출할 수 없음`)
        }

      } catch (error) {
        failedCount++
        console.error(`문제 ${problem.sourceId} 업데이트 실패:`, error)
      }
    }

    console.log('\n마이그레이션 완료:')
    console.log(`- 성공: ${updatedCount}개`)
    console.log(`- 실패: ${failedCount}개`)

    // 내용요소별 통계 출력
    const contentElementStats = await prisma.problem.groupBy({
      by: ['contentElement'],
      _count: {
        contentElement: true
      }
    })

    console.log('\n내용요소별 문제 수:')
    contentElementStats.forEach(stat => {
      console.log(`- ${stat.contentElement || '미분류'}: ${stat._count.contentElement}개`)
    })

    // 영역별 내용요소 통계
    const areaContentElementStats = await prisma.problem.groupBy({
      by: ['area', 'contentElement'],
      _count: {
        contentElement: true
      },
      where: {
        area: { not: null },
        contentElement: { not: null }
      }
    })

    console.log('\n영역별 내용요소 분포:')
    const groupedByArea: Record<string, Record<string, number>> = {}

    areaContentElementStats.forEach(stat => {
      if (!groupedByArea[stat.area as string]) {
        groupedByArea[stat.area as string] = {}
      }
      groupedByArea[stat.area as string][stat.contentElement as string] = stat._count.contentElement
    })

    Object.keys(groupedByArea).forEach(area => {
      console.log(`\n${area}:`)
      Object.keys(groupedByArea[area]).forEach(contentElement => {
        console.log(`  - ${contentElement}: ${groupedByArea[area][contentElement]}개`)
      })
    })

  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateContentElements().catch(console.error)