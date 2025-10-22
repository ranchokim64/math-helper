import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findMissingData() {
  try {
    console.log('영역이 없는 문제들:')
    const problemsWithoutArea = await prisma.problem.findMany({
      where: { area: null },
      select: { sourceId: true, achievementStandards: true }
    })

    problemsWithoutArea.forEach(p => {
      console.log(`- ${p.sourceId}: ${JSON.stringify(p.achievementStandards)}`)
    })

    console.log('\n내용요소가 없는 문제들:')
    const problemsWithoutContentElement = await prisma.problem.findMany({
      where: { contentElement: null },
      select: { sourceId: true, achievementStandards: true }
    })

    problemsWithoutContentElement.forEach(p => {
      console.log(`- ${p.sourceId}: ${JSON.stringify(p.achievementStandards)}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findMissingData()