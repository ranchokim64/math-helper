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

    const classes = await prisma.class.findMany({
      where: {
        id: student.classId
      },
      include: {
        teacher: {
          select: {
            name: true
          }
        },
        assignments: {
          select: {
            id: true,
            problems: true,
            submissions: {
              where: {
                studentId: studentId
              }
            }
          }
        },
        _count: {
          select: {
            students: true,
            assignments: true
          }
        }
      }
    })

    const classesWithStats = classes.map(classData => {
      const totalAssignments = classData._count.assignments
      const submittedAssignments = classData.assignments.filter(
        assignment => assignment.submissions.length > 0 && assignment.submissions[0]!.submittedAt
      ).length
      const gradedAssignments = classData.assignments.filter(
        assignment => assignment.submissions.length > 0 && assignment.submissions[0]!.score !== null
      ).length

      // 평균 점수 계산 (100점 만점으로 환산)
      const gradedAssignmentsWithScore = classData.assignments.filter(
        assignment => assignment.submissions.length > 0 && assignment.submissions[0]!.score !== null && assignment.problems
      )

      const averageScore = gradedAssignmentsWithScore.length > 0
        ? gradedAssignmentsWithScore.reduce((sum, assignment) => {
            const problemCount = Array.isArray(assignment.problems) ? assignment.problems.length : 1
            const maxScore = problemCount * 100
            const normalizedScore = ((assignment.submissions[0]!.score || 0) / maxScore) * 100
            return sum + normalizedScore
          }, 0) / gradedAssignmentsWithScore.length
        : 0

      return {
        id: classData.id,
        name: classData.name,
        code: classData.code,
        teacherName: classData.teacher.name,
        studentCount: classData._count.students,
        totalAssignments,
        submittedAssignments,
        gradedAssignments,
        averageScore: Math.round(averageScore),
        completionRate: totalAssignments > 0 ? Math.round((submittedAssignments / totalAssignments) * 100) : 0
      }
    })

    return NextResponse.json(classesWithStats)
  } catch (error) {
    console.error('Error fetching student classes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}