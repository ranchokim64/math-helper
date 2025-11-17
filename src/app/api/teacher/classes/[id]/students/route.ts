import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

// GET - 클래스 학생 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const classId = resolvedParams.id

    // 클래스 소유권 확인
    const classInfo = await prisma.class.findUnique({
      where: {
        id: classId,
        teacherId: session.user.id
      }
    })

    if (!classInfo) {
      return NextResponse.json(
        { message: "클래스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 학생 목록과 각 학생의 성과 데이터 조회
    const students = await prisma.user.findMany({
      where: {
        classId: classId,
        role: 'STUDENT'
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        submissions: {
          select: {
            id: true,
            score: true,
            submittedAt: true,
            assignment: {
              select: {
                classId: true,
                problems: true
              }
            }
          },
          where: {
            assignment: {
              classId: classId
            }
          }
        }
      }
    })

    // 각 학생의 통계 계산
    const studentsWithStats = students.map(student => {
      const completedSubmissions = student.submissions.filter(s => s.submittedAt !== null)
      const gradedSubmissions = student.submissions.filter(s => s.score !== null && s.assignment.problems)

      const completedAssignments = completedSubmissions.length

      // 평균 점수 계산 (100점 만점으로 환산)
      const averageScore = gradedSubmissions.length > 0
        ? Math.round(gradedSubmissions.reduce((sum, s) => {
            const problemCount = Array.isArray(s.assignment.problems) ? s.assignment.problems.length : 1
            const maxScore = problemCount * 100
            const normalizedScore = ((s.score || 0) / maxScore) * 100
            return sum + normalizedScore
          }, 0) / gradedSubmissions.length)
        : 0

      // 가장 최근 제출일을 최근 활동으로 간주
      const lastActiveAt = completedSubmissions.length > 0
        ? new Date(Math.max(...completedSubmissions.map(s => new Date(s.submittedAt!).getTime())))
        : null

      return {
        id: student.id,
        name: student.name || '이름 없음',
        email: student.email,
        joinedAt: student.createdAt,
        lastActiveAt: lastActiveAt,
        completedAssignments,
        averageScore
      }
    })

    return NextResponse.json(studentsWithStats)

  } catch (error) {
    console.error("Students fetch error:", error)
    return NextResponse.json(
      { message: "학생 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}