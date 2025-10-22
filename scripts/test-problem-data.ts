import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testProblemData() {
  try {
    console.log('=== 문제 데이터 테스트 ===\n')

    // 1. 총 문제 수 확인
    const totalCount = await prisma.problem.count()
    console.log(`총 문제 수: ${totalCount}개`)

    // 2. 몇 개 문제 샘플 조회
    const sampleProblems = await prisma.problem.findMany({
      select: {
        id: true,
        sourceId: true,
        area: true,
        contentElement: true,
        achievementStandards: true,
        sections: true,
        grade: true,
        difficulty: true,
        problemType: true
      },
      take: 3
    })

    console.log('\n=== 문제 데이터 샘플 ===')
    sampleProblems.forEach((problem, index) => {
      console.log(`\n${index + 1}. 문제 ID: ${problem.id}`)
      console.log(`   Source ID: ${problem.sourceId}`)
      console.log(`   영역: ${problem.area}`)
      console.log(`   내용요소: ${problem.contentElement}`)
      console.log(`   학년: ${problem.grade}`)
      console.log(`   난이도: ${problem.difficulty}`)
      console.log(`   문제 유형: ${problem.problemType}`)
      console.log(`   성취기준: ${JSON.stringify(problem.achievementStandards)}`)

      // sections에서 문제 내용 추출
      const sections = problem.sections as any
      if (sections && sections.question) {
        const questionText = sections.question.substring(0, 100).replace(/\n/g, ' ')
        console.log(`   문제 내용: ${questionText}...`)
      } else {
        console.log(`   문제 내용: 섹션 데이터 확인 필요 - ${JSON.stringify(sections).substring(0, 100)}...`)
      }
    })

    // 3. 영역별 내용요소 분포
    console.log('\n=== 영역별 내용요소 분포 ===')
    const areaContentElements = await prisma.problem.groupBy({
      by: ['area', 'contentElement'],
      _count: { contentElement: true },
      where: {
        area: { not: null },
        contentElement: { not: null }
      }
    })

    const grouped: Record<string, Record<string, number>> = {}
    areaContentElements.forEach(item => {
      const area = item.area as string
      const contentElement = item.contentElement as string
      if (!grouped[area]) grouped[area] = {}
      grouped[area][contentElement] = item._count.contentElement
    })

    Object.keys(grouped).forEach(area => {
      console.log(`\n${area}:`)
      Object.keys(grouped[area]).forEach(contentElement => {
        console.log(`  - ${contentElement}: ${grouped[area][contentElement]}개`)
      })
    })

    console.log('\n=== 테스트 완료 ===')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testProblemData()