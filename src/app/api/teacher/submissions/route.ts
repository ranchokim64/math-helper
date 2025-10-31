import { auth } from "@/lib/auth/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 교사의 모든 클래스에서 제출된 과제 조회
    const submissions = await prisma.submission.findMany({
      where: {
        assignment: {
          class: {
            teacherId: session.user.id
          }
        },
        submittedAt: {
          not: null // 실제로 제출된 것만
        }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignment: {
          select: {
            id: true,
            title: true,
            classId: true,
            class: {
              select: {
                name: true
              }
            }
          }
        },
        problemRecordings: {
          select: {
            duration: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    // 응답 데이터 구성
    const responseData = submissions.map(submission => {
      // 문제별 녹화 시간 합계
      const totalRecordingDuration = submission.problemRecordings.reduce(
        (sum, rec) => sum + rec.duration,
        0
      )

      return {
        id: submission.id,
        studentId: submission.student.id,
        studentName: submission.student.name || submission.student.email,
        assignmentId: submission.assignment.id,
        assignmentTitle: submission.assignment.title,
        className: submission.assignment.class.name,
        submittedAt: submission.submittedAt?.toISOString() || null,
        status: submission.feedback ? 'graded' : 'submitted',
        score: submission.score,
        recordingDuration: submission.recordingDuration || totalRecordingDuration, // 레거시 지원
        feedback: submission.feedback
      }
    })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Get submissions error:', error)
    return NextResponse.json(
      { error: "Failed to get submissions" },
      { status: 500 }
    )
  }
}
