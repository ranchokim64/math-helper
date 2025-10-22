import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    })

    console.log('=== 기존 사용자 확인 ===')
    console.log(`총 사용자 수: ${users.length}명`)

    if (users.length > 0) {
      users.forEach(user => {
        console.log(`- ${user.email} (${user.name}, ${user.role})`)
      })
    } else {
      console.log('사용자가 없습니다.')
      console.log('테스트를 위해 사용자를 생성하거나 회원가입이 필요합니다.')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()