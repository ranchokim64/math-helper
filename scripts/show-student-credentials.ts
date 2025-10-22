import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const student = await prisma.user.findFirst({
      where: {
        role: 'STUDENT',
        name: '박학생'
      }
    })

    if (student) {
      console.log('=== 박학생 계정 정보 ===')
      console.log('이름:', student.name)
      console.log('이메일:', student.email)
      console.log('\n💡 비밀번호는 seed 스크립트에서 설정한 기본값을 사용합니다.')
      console.log('일반적으로 "password" 또는 "password123" 입니다.')
    } else {
      console.log('박학생 계정을 찾을 수 없습니다.')

      // 모든 학생 목록 출력
      const allStudents = await prisma.user.findMany({
        where: { role: 'STUDENT' }
      })

      if (allStudents.length > 0) {
        console.log('\n=== 등록된 학생 목록 ===')
        allStudents.forEach(s => {
          console.log(`- ${s.name} (${s.email})`)
        })
      }
    }
  } catch (error) {
    console.error('오류:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()