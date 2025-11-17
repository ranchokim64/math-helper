import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const total = await prisma.problem.count()
  console.log('총 문제 수:', total)

  const byGrade = await prisma.problem.groupBy({
    by: ['grade'],
    _count: true
  })

  console.log('\n학년별 분포:')
  byGrade.forEach(item => {
    console.log(`- ${item.grade}학년: ${item._count}개`)
  })

  await prisma.$disconnect()
}

main()