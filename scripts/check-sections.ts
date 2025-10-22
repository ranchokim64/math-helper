import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const problem = await prisma.problem.findFirst({
    where: {
      sourceId: 'S3_초등_3_008540'
    }
  })

  if (!problem) {
    console.log('문제를 찾을 수 없습니다.')
    return
  }

  console.log('=== 문제 정보 ===')
  console.log('Source ID:', problem.sourceId)
  console.log('\n=== Sections ===')
  console.log(JSON.stringify(problem.sections, null, 2))

  // answer나 explanation 타입이 있는지 확인
  const sections = problem.sections as any[]
  const answerSections = sections?.filter(s => s.type === 'answer' || s.type === 'explanation')

  console.log('\n=== 정답/해설 섹션 ===')
  console.log('개수:', answerSections?.length || 0)
  console.log(JSON.stringify(answerSections, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
