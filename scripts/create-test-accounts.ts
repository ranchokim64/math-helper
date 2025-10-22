import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function createTestAccounts() {
  try {
    console.log('🔄 테스트 계정 생성을 시작합니다...')

    // 기존 테스트 계정 삭제 (있다면)
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['teacher@test.com', 'student@test.com']
        }
      }
    })

    console.log('✅ 기존 테스트 계정 정리 완료')

    // 패스워드 해싱
    const hashedPassword = await bcrypt.hash('test123', 10)

    // 교사 계정 생성
    const teacher = await prisma.user.create({
      data: {
        name: '김선생',
        email: 'teacher@test.com',
        password: hashedPassword,
        role: 'TEACHER'
      }
    })

    console.log('✅ 교사 계정 생성 완료')
    console.log(`   이메일: teacher@test.com`)
    console.log(`   비밀번호: test123`)
    console.log(`   이름: 김선생`)

    // 테스트 클래스 생성
    const testClass = await prisma.class.create({
      data: {
        name: '6학년 1반',
        code: 'CLASS001',
        teacherId: teacher.id
      }
    })

    console.log('✅ 테스트 클래스 생성 완료')
    console.log(`   클래스명: ${testClass.name}`)
    console.log(`   클래스 코드: ${testClass.code}`)

    // 학생 계정 생성
    const student = await prisma.user.create({
      data: {
        name: '박학생',
        email: 'student@test.com',
        password: hashedPassword,
        role: 'STUDENT',
        classId: testClass.id
      }
    })

    console.log('✅ 학생 계정 생성 완료')
    console.log(`   이메일: student@test.com`)
    console.log(`   비밀번호: test123`)
    console.log(`   이름: 박학생`)
    console.log(`   소속 클래스: ${testClass.name}`)

    // 추가 학생 계정들 생성
    const additionalStudents = await Promise.all([
      prisma.user.create({
        data: {
          name: '이학생',
          email: 'student2@test.com',
          password: hashedPassword,
          role: 'STUDENT',
          classId: testClass.id
        }
      }),
      prisma.user.create({
        data: {
          name: '최학생',
          email: 'student3@test.com',
          password: hashedPassword,
          role: 'STUDENT',
          classId: testClass.id
        }
      })
    ])

    console.log('✅ 추가 학생 계정들 생성 완료')
    additionalStudents.forEach((student, index) => {
      console.log(`   학생${index + 2}: ${student.name} (${student.email})`)
    })

    console.log('\n🎉 테스트 계정 생성이 완료되었습니다!')
    console.log('\n📋 로그인 정보:')
    console.log('👨‍🏫 교사 계정:')
    console.log('   이메일: teacher@test.com')
    console.log('   비밀번호: test123')
    console.log('\n👨‍🎓 학생 계정:')
    console.log('   이메일: student@test.com')
    console.log('   비밀번호: test123')
    console.log('   추가 학생: student2@test.com, student3@test.com (비밀번호 동일)')
    console.log('\n🌐 접속 URL: http://localhost:3000')

  } catch (error) {
    console.error('❌ 테스트 계정 생성 중 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
createTestAccounts()