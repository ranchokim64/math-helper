import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 특정 문제 삭제
  const problemId = 'S3_초등_3_008540'

  console.log(`문제 ${problemId} 삭제 중...`)

  await prisma.problem.delete({
    where: { sourceId: problemId }
  }).catch(() => console.log('문제가 존재하지 않습니다.'))

  console.log('삭제 완료!')
}

main()
  .finally(() => prisma.$disconnect())