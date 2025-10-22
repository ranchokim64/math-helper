import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugProblemSearch() {
  console.log('=== 문제 검색 디버깅 ===\n')

  try {
    // 1. 전체 문제 수 확인
    const totalCount = await prisma.problem.count()
    console.log(`총 문제 수: ${totalCount}개`)

    // 2. 각 필터 조건별 문제 수 확인
    console.log('\n=== 필터별 문제 수 ===')

    // 학년별
    const gradeStats = await prisma.problem.groupBy({
      by: ['grade'],
      _count: { grade: true },
      where: { grade: { not: null } }
    })
    console.log('\n학년별:')
    gradeStats.forEach(stat => {
      console.log(`  ${stat.grade}: ${stat._count.grade}개`)
    })

    // 학기별
    const semesterStats = await prisma.problem.groupBy({
      by: ['semester'],
      _count: { semester: true },
      where: { semester: { not: null } }
    })
    console.log('\n학기별:')
    semesterStats.forEach(stat => {
      console.log(`  ${stat.semester}: ${stat._count.semester}개`)
    })

    // 난이도별
    const difficultyStats = await prisma.problem.groupBy({
      by: ['difficulty'],
      _count: { difficulty: true },
      where: { difficulty: { not: null } }
    })
    console.log('\n난이도별:')
    difficultyStats.forEach(stat => {
      console.log(`  ${stat.difficulty}: ${stat._count.difficulty}개`)
    })

    // 영역별
    const areaStats = await prisma.problem.groupBy({
      by: ['area'],
      _count: { area: true },
      where: { area: { not: null } }
    })
    console.log('\n영역별:')
    areaStats.forEach(stat => {
      console.log(`  ${stat.area}: ${stat._count.area}개`)
    })

    // 3. 실제 API 쿼리 시뮬레이션
    console.log('\n=== 일반적인 검색 조건 시뮬레이션 ===')

    const commonSearches = [
      { area: '수와 연산' },
      { area: '수와 연산', difficulty: 'easy' },
      { area: '수와 연산', difficulty: 'easy', grade: '3학년' },
      { contentElement: '자연수의 어림셈' },
      { grade: '3학년' },
      { grade: '3학년', semester: '1학기' },
      { difficulty: 'easy' }
    ]

    for (const search of commonSearches) {
      try {
        const results = await prisma.problem.findMany({
          where: search,
          take: 5
        })

        console.log(`\n검색 조건: ${JSON.stringify(search)}`)
        console.log(`결과: ${results.length}개`)

        if (results.length > 0) {
          console.log(`샘플: ${results[0].sourceId} (${results[0].area} > ${results[0].contentElement})`)
        }
      } catch (error) {
        console.log(`검색 오류: ${JSON.stringify(search)} - ${error}`)
      }
    }

    // 4. 빈 결과가 나올 수 있는 조건들 확인
    console.log('\n=== 빈 결과 조건 확인 ===')

    const emptySearches = [
      { area: '변화와 관계' },
      { area: '자료와 가능성' },
      { grade: '1학년' },
      { grade: '2학년' },
      { semester: '2학기' },
      { difficulty: 'hard' },
      { contentElement: '분수의 덧셈과 뺄셈' }
    ]

    for (const search of emptySearches) {
      const count = await prisma.problem.count({ where: search })
      console.log(`${JSON.stringify(search)}: ${count}개`)
    }

    // 5. 데이터베이스의 실제 고유값들 확인
    console.log('\n=== 실제 데이터베이스 값들 ===')

    const uniqueGrades = await prisma.problem.findMany({
      select: { grade: true },
      distinct: ['grade']
    })
    console.log('학년:', uniqueGrades.map(g => g.grade).filter(Boolean))

    const uniqueSemesters = await prisma.problem.findMany({
      select: { semester: true },
      distinct: ['semester']
    })
    console.log('학기:', uniqueSemesters.map(s => s.semester).filter(Boolean))

    const uniqueDifficulties = await prisma.problem.findMany({
      select: { difficulty: true },
      distinct: ['difficulty']
    })
    console.log('난이도:', uniqueDifficulties.map(d => d.difficulty).filter(Boolean))

  } catch (error) {
    console.error('디버깅 중 오류:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugProblemSearch()