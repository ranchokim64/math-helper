import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

// GET - 클래스 통계 조회
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

    // 병렬로 다양한 통계 데이터 수집
    const [
      totalStudents,
      totalAssignments,
      submissions,
      weeklySubmissions
    ] = await Promise.all([
      // 총 학생 수
      prisma.user.count({
        where: {
          classId: classId,
          role: 'STUDENT'
        }
      }),

      // 총 과제 수
      prisma.assignment.count({
        where: {
          classId: classId
        }
      }),

      // 모든 제출물 조회
      prisma.submission.findMany({
        where: {
          assignment: {
            classId: classId
          }
        },
        select: {
          id: true,
          score: true,
          submittedAt: true,
          studentId: true,
          assignment: {
            select: {
              id: true,
              problems: true
            }
          }
        }
      }),

      // 최근 7일간 제출물
      prisma.submission.count({
        where: {
          assignment: {
            classId: classId
          },
          submittedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7일 전
          }
        }
      })
    ])

    // 활성 학생 수 계산 (최근 7일 내 활동한 학생)
    const recentActiveStudents = new Set(
      submissions
        .filter(s => s.submittedAt && new Date(s.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .map(s => s.studentId)
    )
    const activeStudents = recentActiveStudents.size

    // 평균 완료율 계산
    const completedSubmissions = submissions.filter(s => s.submittedAt !== null)
    const totalPossibleSubmissions = totalStudents * totalAssignments
    const averageCompletionRate = totalPossibleSubmissions > 0
      ? (completedSubmissions.length / totalPossibleSubmissions) * 100
      : 0

    // 평균 점수 계산 (100점 만점으로 환산)
    const gradedSubmissions = submissions.filter(s => s.score !== null && s.assignment.problems)
    const averageScore = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => {
          const problemCount = Array.isArray(s.assignment.problems) ? s.assignment.problems.length : 1
          const maxScore = problemCount * 100
          const normalizedScore = ((s.score || 0) / maxScore) * 100
          return sum + normalizedScore
        }, 0) / gradedSubmissions.length
      : 0

    const stats = {
      totalStudents,
      activeStudents,
      totalAssignments,
      averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      weeklyActivity: weeklySubmissions,
      totalSubmissions: completedSubmissions.length,
      gradedSubmissions: gradedSubmissions.length
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error("Stats fetch error:", error)
    return NextResponse.json(
      { message: "통계 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}