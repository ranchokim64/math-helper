import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function simpleDebug() {
  console.log('=== 간단한 문제 검색 디버깅 ===\n')

  try {
    // 1. 전체 문제 수
    const totalCount = await prisma.problem.count()
    console.log(`총 문제 수: ${totalCount}개`)

    // 2. 샘플 문제 몇 개 확인
    const sampleProblems = await prisma.problem.findMany({
      select: {
        sourceId: true,
        grade: true,
        semester: true,
        difficulty: true,
        area: true,
        contentElement: true,
        problemType: true
      },
      take: 5
    })

    console.log('\n=== 샘플 문제 데이터 ===')
    sampleProblems.forEach((p, i) => {
      console.log(`${i + 1}. ${p.sourceId}`)
      console.log(`   학년: ${p.grade}`)
      console.log(`   학기: ${p.semester}`)
      console.log(`   난이도: ${p.difficulty}`)
      console.log(`   영역: ${p.area}`)
      console.log(`   내용요소: ${p.contentElement}`)
      console.log(`   문제유형: ${p.problemType}`)
      console.log('')
    })

    // 3. 가장 일반적인 조건으로 검색 테스트
    console.log('=== 일반적인 검색 테스트 ===')

    const testSearches = [
      { area: '수와 연산' },
      { grade: '3학년' },
      { difficulty: 'easy' },
      { area: '수와 연산', difficulty: 'easy' }
    ]

    for (const search of testSearches) {
      const results = await prisma.problem.findMany({
        where: search,
        take: 3,
        select: { sourceId: true, area: true, contentElement: true }
      })

      console.log(`\n검색: ${JSON.stringify(search)}`)
      console.log(`결과: ${results.length}개`)
      results.forEach(r => {
        console.log(`  - ${r.sourceId}: ${r.area} > ${r.contentElement}`)
      })
    }

    // 4. 고유값들 확인
    console.log('\n=== 고유값 확인 ===')

    // 학년
    const grades = await prisma.problem.findMany({
      select: { grade: true },
      distinct: ['grade'],
      take: 10
    })
    console.log('학년:', grades.map(g => g.grade))

    // 학기
    const semesters = await prisma.problem.findMany({
      select: { semester: true },
      distinct: ['semester'],
      take: 10
    })
    console.log('학기:', semesters.map(s => s.semester))

    // 난이도
    const difficulties = await prisma.problem.findMany({
      select: { difficulty: true },
      distinct: ['difficulty'],
      take: 10
    })
    console.log('난이도:', difficulties.map(d => d.difficulty))

    // 영역
    const areas = await prisma.problem.findMany({
      select: { area: true },
      distinct: ['area'],
      take: 10
    })
    console.log('영역:', areas.map(a => a.area))

    // 5. 프론트엔드에서 보낼 수 있는 조건들로 테스트
    console.log('\n=== 프론트엔드 시나리오 테스트 ===')

    // 시나리오 1: 영역만 선택
    const scenario1 = await prisma.problem.findMany({
      where: { area: '수와 연산' },
      take: 5
    })
    console.log(`시나리오 1 (영역만): ${scenario1.length}개`)

    // 시나리오 2: 영역 + 내용요소
    const scenario2 = await prisma.problem.findMany({
      where: {
        area: '수와 연산',
        contentElement: '자연수의 어림셈'
      },
      take: 5
    })
    console.log(`시나리오 2 (영역+내용요소): ${scenario2.length}개`)

    // 시나리오 3: 영역 + 난이도
    const scenario3 = await prisma.problem.findMany({
      where: {
        area: '수와 연산',
        difficulty: 'easy'
      },
      take: 5
    })
    console.log(`시나리오 3 (영역+난이도): ${scenario3.length}개`)

  } catch (error) {
    console.error('오류:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simpleDebug()