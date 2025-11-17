import { auth } from "@/lib/auth/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: assignmentId } = await params

    // 과제 조회 및 교사 권한 확인
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        class: {
          teacherId: session.user.id
        }
      },
      include: {
        class: {
          include: {
            students: {
              select: {
                id: true,
                name: true,
                email: true
              },
              orderBy: {
                name: 'asc'
              }
            }
          }
        },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            problemRecordings: {
              select: {
                duration: true
              }
            }
          }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found or unauthorized" },
        { status: 404 }
      )
    }

    // 제출물을 학생 ID로 매핑
    const submissionsByStudent = new Map(
      assignment.submissions.map(sub => [sub.studentId, sub])
    )

    // 전체 학생 목록과 제출물 매칭
    const studentSubmissions = assignment.class.students.map(student => {
      const submission = submissionsByStudent.get(student.id)

      if (submission && submission.submittedAt) {
        // 제출물이 있는 경우
        const totalRecordingDuration = submission.problemRecordings.reduce(
          (sum, rec) => sum + rec.duration,
          0
        )

        // 상태 결정
        let status: 'submitted' | 'graded' | 'returned' = 'submitted'
        if (submission.gradedAt) {
          status = 'graded'
          // TODO: 반환 상태 추가 시 로직 업데이트
        }

        return {
          student: {
            id: student.id,
            name: student.name || student.email,
            email: student.email
          },
          submission: {
            id: submission.id,
            submittedAt: submission.submittedAt.toISOString(),
            score: submission.score,
            status,
            recordingDuration: submission.recordingDuration || totalRecordingDuration
          }
        }
      } else {
        // 미제출 학생
        return {
          student: {
            id: student.id,
            name: student.name || student.email,
            email: student.email
          },
          submission: null
        }
      }
    })

    // 통계 계산
    const submittedStudents = studentSubmissions.filter(s => s.submission !== null)
    const gradedStudents = submittedStudents.filter(s => {
      if (!s.submission) return false
      return s.submission.status === 'graded'
    })

    const totalStudents = assignment.class.students.length
    const submittedCount = submittedStudents.length
    const gradedCount = gradedStudents.length

    const scores = gradedStudents
      .map(s => s.submission?.score)
      .filter((score): score is number => score !== null && score !== undefined)

    // 문제 수 계산 (각 문제당 100점이므로, 100점 만점으로 환산)
    const problemCount = Array.isArray(assignment.problems) ? assignment.problems.length : 1
    const maxScore = problemCount * 100

    const averageScore = scores.length > 0
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length / maxScore) * 100)
      : 0

    // 응답 데이터 구성
    const responseData = {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate?.toISOString() || null,
        classId: assignment.class.id,
        className: assignment.class.name,
        problemCount: Array.isArray(assignment.problems) ? assignment.problems.length : 0
      },
      statistics: {
        totalStudents,
        submittedCount,
        submissionRate: totalStudents > 0
          ? Math.round((submittedCount / totalStudents) * 100)
          : 0,
        gradedCount,
        averageScore
      },
      studentSubmissions
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Get assignment submissions error:', error)
    return NextResponse.json(
      { error: "Failed to get assignment submissions" },
      { status: 500 }
    )
  }
}
