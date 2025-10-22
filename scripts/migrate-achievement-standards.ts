import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
// Achievement standards cleaning function (inlined to avoid import issues)
const ACHIEVEMENT_CODE_PATTERN = /\[(\d)수(\d{2})-(\d{2})\]/g

function cleanAchievementStandards(achievementStandards: unknown): string[] {
  if (!Array.isArray(achievementStandards)) {
    console.warn('성취기준이 배열이 아닙니다:', typeof achievementStandards)
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
      const hasAchievementCode = ACHIEVEMENT_CODE_PATTERN.test(item)
      ACHIEVEMENT_CODE_PATTERN.lastIndex = 0 // 정규식 상태 초기화
      return hasAchievementCode
    })
    .map(item => {
      // 성취기준 코드만 추출 (설명 제거)
      const match = item.match(/(\[(\d)수(\d{2})-(\d{2})\])/)
      return match ? match[1] : item
    })
    .filter((item): item is string => item !== undefined)

  return [...new Set(cleaned)] // 중복 제거
}

const prisma = new PrismaClient()

interface OriginalProblemData {
  source_data_info: {
    source_data_name: string
    "2015_achievement_standard": string[]
    "2022_achievement_standard": string[]
  }
}

/**
 * 원본 파일에서 성취기준 데이터를 추출하고 2015/2022 구분하여 반환
 */
function extractAchievementStandardsFromOriginal(data: OriginalProblemData): {
  "2015": string[]
  "2022": string[]
} {
  const standards2015 = cleanAchievementStandards(data.source_data_info["2015_achievement_standard"])
  const standards2022 = cleanAchievementStandards(data.source_data_info["2022_achievement_standard"])

  return {
    "2015": standards2015,
    "2022": standards2022
  }
}

/**
 * 모든 문제의 성취기준을 2015/2022 구분된 형태로 마이그레이션
 */
async function migrateAchievementStandards() {
  console.log('성취기준 데이터 마이그레이션을 시작합니다...')

  try {
    // 데이터 디렉토리 경로
    const dataDir = path.join(process.cwd(), 'data', 'problems')

    if (!fs.existsSync(dataDir)) {
      throw new Error(`데이터 디렉토리를 찾을 수 없습니다: ${dataDir}`)
    }

    // 모든 JSON 파일 목록 가져오기
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'))
    console.log(`총 ${files.length}개의 원본 데이터 파일을 발견했습니다.`)

    // 데이터베이스의 모든 문제 조회
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        sourceId: true,
        achievementStandards: true
      }
    })

    console.log(`데이터베이스에서 ${problems.length}개의 문제를 발견했습니다.`)

    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const problem of problems) {
      try {
        // 해당 문제의 원본 파일 찾기
        const sourceFileName = `${problem.sourceId}.json`
        const sourceFilePath = path.join(dataDir, sourceFileName)

        if (!fs.existsSync(sourceFilePath)) {
          console.warn(`⚠️  원본 파일을 찾을 수 없습니다: ${sourceFileName}`)
          skippedCount++
          continue
        }

        // 원본 파일 읽기
        const fileContent = fs.readFileSync(sourceFilePath, 'utf8')
        const originalData: OriginalProblemData = JSON.parse(fileContent)

        // 성취기준 추출
        const newAchievementStandards = extractAchievementStandardsFromOriginal(originalData)

        // 현재 DB의 성취기준과 비교 (이미 새로운 형태인지 확인)
        const currentStandards = problem.achievementStandards as any
        const isAlreadyMigrated =
          typeof currentStandards === 'object' &&
          currentStandards !== null &&
          ('2015' in currentStandards || '2022' in currentStandards)

        if (isAlreadyMigrated) {
          console.log(`✓ ${problem.sourceId}: 이미 마이그레이션됨`)
          skippedCount++
          continue
        }

        // 데이터베이스 업데이트
        await prisma.problem.update({
          where: { id: problem.id },
          data: { achievementStandards: newAchievementStandards }
        })

        const total2015 = newAchievementStandards["2015"].length
        const total2022 = newAchievementStandards["2022"].length

        console.log(`✓ ${problem.sourceId}: 2015(${total2015}개) + 2022(${total2022}개) = 총 ${total2015 + total2022}개`)
        console.log(`  - 2015: [${newAchievementStandards["2015"].join(', ')}]`)
        console.log(`  - 2022: [${newAchievementStandards["2022"].join(', ')}]`)

        updatedCount++

      } catch (error) {
        console.error(`❌ 문제 ${problem.sourceId} 처리 실패:`, error)
        errorCount++
      }
    }

    console.log('\n=== 마이그레이션 완료 ===')
    console.log(`- 업데이트: ${updatedCount}개`)
    console.log(`- 스킵: ${skippedCount}개`)
    console.log(`- 오류: ${errorCount}개`)

    // 마이그레이션 후 샘플 확인
    console.log('\n=== 마이그레이션 후 샘플 ===')
    const samples = await prisma.problem.findMany({
      select: { sourceId: true, achievementStandards: true },
      take: 3
    })

    samples.forEach(sample => {
      console.log(`${sample.sourceId}:`)
      console.log(`  ${JSON.stringify(sample.achievementStandards, null, 2)}`)
    })

  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
migrateAchievementStandards().catch(console.error)

export { migrateAchievementStandards }