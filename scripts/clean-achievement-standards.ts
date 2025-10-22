import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 성취기준 배열에서 공백과 불필요한 요소들을 제거
 * @param achievementStandards 원본 성취기준 배열
 * @returns 정제된 성취기준 배열
 */
function cleanAchievementStandards(achievementStandards: unknown): string[] {
  if (!Array.isArray(achievementStandards)) {
    return []
  }

  const cleaned = achievementStandards
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => {
      // 공백이나 빈 문자열 제거
      if (item === '' || item === ' ' || item === '  ') {
        return false
      }

      // 성취기준 패턴이 있는 항목만 유지
      const hasAchievementCode = /\[(\d)수(\d{2})-(\d{2})\]/.test(item)
      return hasAchievementCode
    })
    .map(item => {
      // 성취기준 코드만 추출 (설명 제거)
      const match = item.match(/(\[(\d)수(\d{2})-(\d{2})\])/)
      return match ? match[1] : item
    })
    .filter((item): item is string => item !== undefined)

  return cleaned
}

async function cleanAllAchievementStandards() {
  console.log('기존 성취기준 데이터 정제를 시작합니다...')

  try {
    // 모든 문제 조회
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        sourceId: true,
        achievementStandards: true
      }
    })

    console.log(`총 ${problems.length}개의 문제를 확인합니다.`)

    let updatedCount = 0
    let unchangedCount = 0

    for (const problem of problems) {
      try {
        const originalStandards = problem.achievementStandards as unknown
        const cleanedStandards = cleanAchievementStandards(originalStandards)

        // 변경사항이 있는지 확인
        const originalArray = Array.isArray(originalStandards) ? originalStandards : []
        const hasChanges = JSON.stringify(originalArray) !== JSON.stringify(cleanedStandards)

        if (hasChanges && cleanedStandards.length > 0) {
          await prisma.problem.update({
            where: { id: problem.id },
            data: { achievementStandards: cleanedStandards }
          })
          updatedCount++
          console.log(`✓ ${problem.sourceId}: ${originalArray.length} → ${cleanedStandards.length} (${cleanedStandards.join(', ')})`)
        } else {
          unchangedCount++
        }

      } catch (error) {
        console.error(`❌ 문제 ${problem.sourceId} 처리 실패:`, error)
      }
    }

    console.log('\n정제 완료:')
    console.log(`- 업데이트: ${updatedCount}개`)
    console.log(`- 변경없음: ${unchangedCount}개`)

    // 정제 후 통계
    console.log('\n정제 후 성취기준 통계:')
    const sampleAfter = await prisma.problem.findMany({
      select: { sourceId: true, achievementStandards: true },
      take: 5
    })

    sampleAfter.forEach(p => {
      console.log(`${p.sourceId}: ${JSON.stringify(p.achievementStandards)}`)
    })

  } catch (error) {
    console.error('정제 중 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanAllAchievementStandards().catch(console.error)