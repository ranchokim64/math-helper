import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProblemTypes() {
  try {
    // 전체 문제 수
    const total = await prisma.problem.count()
    console.log(`총 문제 수: ${total}개\n`)

    // 문제 유형별 분포
    const problems = await prisma.problem.findMany({
      select: {
        problemType: true
      }
    })

    const typeCounts: Record<string, number> = {}
    problems.forEach(p => {
      typeCounts[p.problemType] = (typeCounts[p.problemType] || 0) + 1
    })

    console.log('문제 유형별 분포:')
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`- "${type}": ${count}개`)
    })

    // 샘플 문제 확인
    console.log('\n샘플 문제 (처음 3개):')
    const samples = await prisma.problem.findMany({
      take: 3,
      select: {
        sourceId: true,
        problemType: true,
        grade: true,
        maskingVerified: true,
        maskingValid: true
      }
    })

    samples.forEach(s => {
      console.log(`- ID: ${s.sourceId}, Type: "${s.problemType}", Grade: ${s.grade}, Verified: ${s.maskingVerified}, Valid: ${s.maskingValid}`)
    })

  } catch (error) {
    console.error('에러 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProblemTypes()
