import { PrismaClient } from '@prisma/client'
import { getAreaFromAchievement, extractAreaFromAchievements, extractContentElementFromAchievements } from './achievement-area-mapping'

const prisma = new PrismaClient()

/**
 * 새로운 마스터 파일 구조에 맞춰 모든 문제의 영역과 내용요소를 재분류하는 포괄적 마이그레이션
 */
async function migrateAchievementStandardsComprehensive() {
  console.log('새로운 마스터 파일 기준 포괄적 성취기준 마이그레이션을 시작합니다...')
  console.log('이 프로세스는 다음을 수행합니다:')
  console.log('1. 기존 성취기준 배열에서 영역 재추출')
  console.log('2. 기존 성취기준 배열에서 내용요소 재추출')
  console.log('3. 새로운 마스터 파일 기준으로 정확성 검증')

  try {
    // 모든 문제 조회
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        sourceId: true,
        achievementStandards: true,
        area: true,
        contentElement: true
      }
    })

    console.log(`\n총 ${problems.length}개의 문제를 처리합니다.`)

    let areaUpdatedCount = 0
    let contentElementUpdatedCount = 0
    let noChangeCount = 0
    let errorCount = 0

    for (let i = 0; i < problems.length; i++) {
      const problem = problems[i]
      const progress = `(${i + 1}/${problems.length})`

      try {
        // 현재 성취기준에서 새로운 영역과 내용요소 추출
        let newArea: string | null = null
        let newContentElement: string | null = null

        // 성취기준이 새로운 형태인지 확인 (2015/2022 구분)
        const achievementStandards = problem.achievementStandards as any
        let standardsArray: string[] = []

        if (typeof achievementStandards === 'object' && achievementStandards !== null) {
          // 새로운 형태: {2015: [...], 2022: [...]}
          const standards2015 = Array.isArray(achievementStandards['2015']) ? achievementStandards['2015'] : []
          const standards2022 = Array.isArray(achievementStandards['2022']) ? achievementStandards['2022'] : []
          standardsArray = [...standards2015, ...standards2022]
        } else if (Array.isArray(achievementStandards)) {
          // 기존 형태: [...]
          standardsArray = achievementStandards
        } else {
          console.log(`${progress} ${problem.sourceId}: 성취기준 형태를 인식할 수 없음`)
          errorCount++
          continue
        }

        if (standardsArray.length > 0) {
          // 새로운 마스터 파일 기준으로 영역과 내용요소 추출
          newArea = extractAreaFromAchievements(standardsArray)
          newContentElement = extractContentElementFromAchievements(standardsArray)
        }

        // 업데이트가 필요한지 확인
        const needsAreaUpdate = newArea && newArea !== problem.area
        const needsContentElementUpdate = newContentElement && newContentElement !== problem.contentElement

        if (needsAreaUpdate || needsContentElementUpdate) {
          const updateData: any = {}

          if (needsAreaUpdate) {
            updateData.area = newArea
            areaUpdatedCount++
          }

          if (needsContentElementUpdate) {
            updateData.contentElement = newContentElement
            contentElementUpdatedCount++
          }

          // 데이터베이스 업데이트
          await prisma.problem.update({
            where: { id: problem.id },
            data: updateData
          })

          console.log(`${progress} ✓ ${problem.sourceId}:`)
          if (needsAreaUpdate) {
            console.log(`  영역: "${problem.area}" → "${newArea}"`)
          }
          if (needsContentElementUpdate) {
            console.log(`  내용요소: "${problem.contentElement}" → "${newContentElement}"`)
          }
        } else {
          noChangeCount++
          if (i % 100 === 0) { // 100개마다 진행상황 출력
            console.log(`${progress} ${problem.sourceId}: 변경사항 없음`)
          }
        }

      } catch (error) {
        console.error(`${progress} ❌ 문제 ${problem.sourceId} 처리 실패:`, error)
        errorCount++
      }
    }

    console.log('\n=== 마이그레이션 완료 ===')
    console.log(`- 영역 업데이트: ${areaUpdatedCount}개`)
    console.log(`- 내용요소 업데이트: ${contentElementUpdatedCount}개`)
    console.log(`- 변경사항 없음: ${noChangeCount}개`)
    console.log(`- 오류: ${errorCount}개`)

    // 마이그레이션 후 통계
    console.log('\n=== 마이그레이션 후 통계 ===')

    // 영역별 통계
    const areaStats = await prisma.problem.groupBy({
      by: ['area'],
      _count: { area: true }
    })

    console.log('\n영역별 문제 수:')
    areaStats.forEach(stat => {
      console.log(`- ${stat.area || '미분류'}: ${stat._count.area}개`)
    })

    // 내용요소별 통계 (상위 10개)
    const contentElementStats = await prisma.problem.groupBy({
      by: ['contentElement'],
      _count: { contentElement: true },
      orderBy: { _count: { contentElement: 'desc' } },
      take: 10
    })

    console.log('\n내용요소별 문제 수 (상위 10개):')
    contentElementStats.forEach(stat => {
      console.log(`- ${stat.contentElement || '미분류'}: ${stat._count.contentElement}개`)
    })

    // 샘플 확인 (각 영역에서 3개씩)
    console.log('\n=== 마이그레이션 후 샘플 확인 ===')
    const sampleProblems = await prisma.problem.findMany({
      select: {
        sourceId: true,
        area: true,
        contentElement: true,
        achievementStandards: true
      },
      where: {
        area: { not: null },
        contentElement: { not: null }
      },
      take: 5
    })

    sampleProblems.forEach(sample => {
      console.log(`\n${sample.sourceId}:`)
      console.log(`  영역: ${sample.area}`)
      console.log(`  내용요소: ${sample.contentElement}`)
      console.log(`  성취기준: ${JSON.stringify(sample.achievementStandards)}`)
    })

  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
migrateAchievementStandardsComprehensive().catch(console.error)

export { migrateAchievementStandardsComprehensive }