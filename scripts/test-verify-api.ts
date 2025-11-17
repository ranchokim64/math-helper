import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testVerifyAPI() {
  try {
    console.log('=== API 테스트 시작 ===\n')

    // 1. 전체 객관식 문제 수
    const totalCount = await prisma.problem.count({
      where: { problemType: 'multiple_choice' }
    })
    console.log(`1. 전체 객관식 문제 수: ${totalCount}개`)

    // 2. 검증 완료된 객관식 문제 수
    const verifiedCount = await prisma.problem.count({
      where: {
        problemType: 'multiple_choice',
        maskingVerified: true
      }
    })
    console.log(`2. 검증 완료된 문제 수: ${verifiedCount}개`)

    // 3. 미검증 객관식 문제 1개 가져오기
    const problem = await prisma.problem.findFirst({
      where: {
        problemType: 'multiple_choice',
        maskingVerified: false
      },
      orderBy: {
        id: 'asc'
      }
    })

    if (problem) {
      console.log(`3. 미검증 문제 발견: ${problem.sourceId}`)
      console.log(`   - maskingVerified: ${problem.maskingVerified}`)
      console.log(`   - maskingValid: ${problem.maskingValid}`)
      console.log(`   - sections: ${JSON.stringify(problem.sections).length} bytes`)
    } else {
      console.log('3. 미검증 문제를 찾을 수 없습니다!')
    }

    console.log('\n=== 테스트 완료 ===')

  } catch (error) {
    console.error('에러 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testVerifyAPI()
