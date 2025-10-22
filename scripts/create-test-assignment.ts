import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // 교사 찾기
    const teacher = await prisma.user.findFirst({
      where: { role: 'TEACHER' }
    })

    if (!teacher) {
      console.log('교사를 찾을 수 없습니다.')
      return
    }

    // 교사의 클래스 찾기
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId: teacher.id }
    })

    if (!teacherClass) {
      console.log('클래스를 찾을 수 없습니다.')
      return
    }

    // Bounding Box가 있는 문제 확인
    const problem = await prisma.problem.findUnique({
      where: { sourceId: 'S3_초등_3_008540' }
    })

    if (!problem) {
      console.log('S3_초등_3_008540 문제를 찾을 수 없습니다.')
      return
    }

    console.log('문제 확인:', problem.sourceId)
    console.log('Sections:', JSON.stringify(problem.sections, null, 2))

    // 기존 테스트 과제 삭제
    await prisma.assignment.deleteMany({
      where: {
        title: '마스킹 테스트 과제',
        classId: teacherClass.id
      }
    })

    // 새 과제 생성
    const assignment = await prisma.assignment.create({
      data: {
        title: '마스킹 테스트 과제',
        description: 'Bounding Box 마스킹 테스트용',
        classId: teacherClass.id,
        problems: [
          { id: 'S3_초등_3_008540', order: 1 }
        ],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후
      }
    })

    console.log('\n✅ 테스트 과제 생성 완료!')
    console.log('과제 ID:', assignment.id)
    console.log('과제 제목:', assignment.title)
    console.log('문제:', assignment.problems)

    // 학생 찾기
    const student = await prisma.user.findFirst({
      where: {
        role: 'STUDENT',
        classId: teacherClass.id
      }
    })

    if (student) {
      // 기존 제출 삭제
      await prisma.submission.deleteMany({
        where: {
          assignmentId: assignment.id,
          studentId: student.id
        }
      })

      // 새 제출 생성
      await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id
        }
      })

      console.log('\n학생:', student.name)
      console.log('학생이 과제를 시작할 수 있습니다!')
    }

  } catch (error) {
    console.error('오류:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
