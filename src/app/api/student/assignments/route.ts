import { auth } from '@/lib/auth/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const studentId = session.user.id

    // 학생이 속한 클래스 찾기 (단일 클래스)
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { classId: true }
    })

    if (!student?.classId) {
      return NextResponse.json([])
    }

    const studentClasses = await prisma.class.findMany({
      where: {
        id: student.classId
      },
      include: {
        assignments: {
          include: {
            submissions: {
              where: {
                studentId: studentId
              }
            }
          }
        },
        teacher: {
          select: {
            name: true
          }
        }
      }
    })

    // 모든 과제를 평탄화하고 제출 상태 포함
    const assignments = studentClasses.flatMap(classData =>
      classData.assignments.map(assignment => {
        const submission = assignment.submissions[0] // 학생당 하나의 제출물만 있음

        let status: 'pending' | 'submitted' | 'graded' = 'pending'
        if (submission) {
          if (submission.submittedAt) {
            status = submission.score !== null ? 'graded' : 'submitted'
          }
        }

        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          status,
          score: submission?.score || undefined,
          feedback: submission?.feedback || undefined,
          className: classData.name,
          teacherName: classData.teacher.name,
          problemCount: Array.isArray(assignment.problems) ? assignment.problems.length : 0,
          submissionId: submission?.id,
          createdAt: assignment.createdAt
        }
      })
    )

    // 최신순으로 정렬
    assignments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching student assignments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}