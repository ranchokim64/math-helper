import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 첫 번째 문제 조회
  const problem = await prisma.problem.findFirst({
    select: {
      id: true,
      sourceId: true,
      imageUrl: true,
      grade: true,
      subject: true
    }
  })

  if (problem) {
    console.log('✅ 문제 정보:')
    console.log(`ID: ${problem.id}`)
    console.log(`Source ID: ${problem.sourceId}`)
    console.log(`학년: ${problem.grade}`)
    console.log(`과목: ${problem.subject}`)
    console.log(`\n이미지 URL:`)
    console.log(problem.imageUrl)

    // URL 형식 확인
    if (problem.imageUrl?.includes('supabase')) {
      console.log('\n✅ Supabase Storage URL 확인됨')
    } else {
      console.log('\n⚠️  로컬 경로를 사용 중')
    }
  } else {
    console.log('❌ 문제를 찾을 수 없습니다')
  }

  await prisma.$disconnect()
}

main()