import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetMaskingVerification() {
  try {
    console.log('객관식 문제의 maskingVerified를 false로 초기화 중...')

    const result = await prisma.problem.updateMany({
      where: {
        problemType: '객관식'
      },
      data: {
        maskingVerified: false,
        maskingValid: true
      }
    })

    console.log(`✓ ${result.count}개의 객관식 문제를 초기화했습니다.`)

    // 통계 확인
    const total = await prisma.problem.count({
      where: { problemType: '객관식' }
    })

    const unverified = await prisma.problem.count({
      where: {
        problemType: '객관식',
        maskingVerified: false
      }
    })

    console.log(`\n현황:`)
    console.log(`- 총 객관식 문제: ${total}개`)
    console.log(`- 미검증 문제: ${unverified}개`)

  } catch (error) {
    console.error('에러 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetMaskingVerification()
