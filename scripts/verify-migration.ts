import { PrismaClient } from '@prisma/client'
import { getAreaFromAchievement, extractAreaFromAchievements, extractContentElementFromAchievements } from './achievement-area-mapping'

const prisma = new PrismaClient()

async function verifyMigration() {
  console.log('=== 마이그레이션 검증 시작 ===\n')

  try {
    // 1. 데이터베이스 연결 테스트
    await prisma.$connect()
    console.log('✓ 데이터베이스 연결 성공')

    // 2. 문제 총 개수 확인
    const totalProblems = await prisma.problem.count()
    console.log(`✓ 총 문제 수: ${totalProblems}개`)

    // 3. 영역 분포 확인
    const areaStats = await prisma.problem.groupBy({
      by: ['area'],
      _count: { area: true }
    })

    console.log('\n영역 분포:')
    areaStats.forEach(stat => {
      console.log(`- ${stat.area || '미분류'}: ${stat._count.area}개`)
    })

    // 4. 내용요소 분포 확인 (상위 5개)
    const contentElementStats = await prisma.problem.groupBy({
      by: ['contentElement'],
      _count: { contentElement: true },
      orderBy: { _count: { contentElement: 'desc' } },
      take: 5
    })

    console.log('\n내용요소 분포 (상위 5개):')
    contentElementStats.forEach(stat => {
      console.log(`- ${stat.contentElement || '미분류'}: ${stat._count.contentElement}개`)
    })

    // 5. 성취기준 구조 검증 (샘플)
    const sampleProblems = await prisma.problem.findMany({
      select: {
        sourceId: true,
        area: true,
        contentElement: true,
        achievementStandards: true
      },
      take: 3
    })

    console.log('\n성취기준 구조 검증 (샘플):')
    sampleProblems.forEach(problem => {
      console.log(`\n문제 ${problem.sourceId}:`)
      console.log(`  영역: ${problem.area}`)
      console.log(`  내용요소: ${problem.contentElement}`)

      const standards = problem.achievementStandards as any
      if (typeof standards === 'object' && standards !== null) {
        const has2015 = standards['2015'] && Array.isArray(standards['2015'])
        const has2022 = standards['2022'] && Array.isArray(standards['2022'])

        if (has2015 || has2022) {
          console.log(`  성취기준 구조: ✓ 올바른 형태 (2015: ${has2015 ? standards['2015'].length : 0}개, 2022: ${has2022 ? standards['2022'].length : 0}개)`)

          // 성취기준에서 영역과 내용요소 재추출하여 일치성 확인
          const allStandards = [
            ...(has2015 ? standards['2015'] : []),
            ...(has2022 ? standards['2022'] : [])
          ]

          const extractedArea = extractAreaFromAchievements(allStandards)
          const extractedContentElement = extractContentElementFromAchievements(allStandards)

          const areaMatch = extractedArea === problem.area
          const contentElementMatch = extractedContentElement === problem.contentElement

          console.log(`  영역 일치성: ${areaMatch ? '✓' : '❌'} (DB: ${problem.area}, 추출: ${extractedArea})`)
          console.log(`  내용요소 일치성: ${contentElementMatch ? '✓' : '❌'} (DB: ${problem.contentElement}, 추출: ${extractedContentElement})`)
        } else {
          console.log(`  성취기준 구조: ❌ 잘못된 형태`)
        }
      } else {
        console.log(`  성취기준 구조: ❌ 잘못된 형태 (${typeof standards})`)
      }
    })

    // 6. 데이터 무결성 검증
    console.log('\n=== 데이터 무결성 검증 ===')

    // 6-1. 영역이 null인 문제 확인
    const problemsWithoutArea = await prisma.problem.count({
      where: { area: null }
    })
    console.log(`영역이 없는 문제: ${problemsWithoutArea}개 ${problemsWithoutArea === 0 ? '✓' : '❌'}`)

    // 6-2. 내용요소가 null인 문제 확인
    const problemsWithoutContentElement = await prisma.problem.count({
      where: { contentElement: null }
    })
    console.log(`내용요소가 없는 문제: ${problemsWithoutContentElement}개 ${problemsWithoutContentElement === 0 ? '✓' : '❌'}`)

    // 6-3. 성취기준이 빈 문제 확인
    const problemsWithEmptyStandards = await prisma.problem.findMany({
      where: {
        OR: [
          { achievementStandards: null },
          { achievementStandards: {} },
          { achievementStandards: { equals: '[]' } }
        ]
      },
      select: { sourceId: true, achievementStandards: true }
    })
    console.log(`성취기준이 비어있는 문제: ${problemsWithEmptyStandards.length}개`)

    // 7. 마스터 파일 매핑 테스트
    console.log('\n=== 마스터 파일 매핑 테스트 ===')

    // 실제 성취기준 코드 몇 개를 테스트
    const testCodes = ['[4수01-05]', '[2수01-01]', '[6수03-01]']
    testCodes.forEach(code => {
      const areaResult = getAreaFromAchievement(code)
      if (areaResult) {
        console.log(`✓ ${code}: ${areaResult.area} (${areaResult.grade}, ${areaResult.curriculum})`)
      } else {
        console.log(`❌ ${code}: 매핑 실패`)
      }
    })

    console.log('\n=== 검증 완료 ===')

  } catch (error) {
    console.error('검증 중 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyMigration().catch(console.error)