import { prisma } from '../src/lib/prisma'

async function checkSchema() {
  try {
    console.log('🔍 ProblemRecording 스키마 확인 중...')

    // 스키마 정보 확인 (PostgreSQL)
    const result = await prisma.$queryRaw<Array<{
      column_name: string
      data_type: string
      is_nullable: string
    }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ProblemRecording'
      ORDER BY ordinal_position;
    `

    console.log('\n📋 ProblemRecording 테이블 컬럼:')
    console.table(result)

    // firstReactionTime 컬럼 확인
    const hasFirstReactionTime = result.some(col => col.column_name === 'firstReactionTime')

    if (hasFirstReactionTime) {
      console.log('\n✅ firstReactionTime 컬럼이 존재합니다!')
      const col = result.find(c => c.column_name === 'firstReactionTime')
      console.log(`   타입: ${col?.data_type}`)
      console.log(`   NULL 허용: ${col?.is_nullable}`)
    } else {
      console.log('\n❌ firstReactionTime 컬럼이 없습니다!')
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSchema()
