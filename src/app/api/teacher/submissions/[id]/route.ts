import { auth } from "@/lib/auth/auth"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id: submissionId } = await params

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 제출물 조회 (학생 정보, 과제 정보, 문제별 녹화 포함)
    const submission = await prisma.submission.findUnique({
      where: {
        id: submissionId
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
            description: true,
            problems: true,
            classId: true,
            class: {
              select: {
                teacherId: true
              }
            }
          }
        },
        problemRecordings: {
          orderBy: {
            problemIndex: 'asc'
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      )
    }

    // 권한 확인: 해당 과제가 교사의 반에 속하는지
    if (submission.assignment.class.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // 문제 ID 배열 추출
    const problemIds = submission.assignment.problems as string[]

    // 문제 데이터 조회
    const problems = await prisma.problem.findMany({
      where: {
        sourceId: {
          in: problemIds
        }
      }
    })

    // 문제를 순서대로 정렬
    const orderedProblems = problemIds.map(id =>
      problems.find(p => p.sourceId === id)
    ).filter(p => p !== undefined)

    // 응답 데이터 구성
    const responseData = {
      id: submission.id,
      studentId: submission.student.id,
      studentName: submission.student.name || submission.student.email,
      assignmentId: submission.assignment.id,
      assignmentTitle: submission.assignment.title,
      submittedAt: submission.submittedAt?.toISOString() || null,
      recordingUrl: submission.recordingUrl, // 레거시 (전체 과제 녹화)
      recordingDuration: submission.recordingDuration, // 레거시
      segments: submission.segments, // 레거시
      answers: submission.answers || {},
      feedback: submission.feedback,
      score: submission.score,
      status: submission.submittedAt ?
        (submission.feedback ? 'graded' : 'submitted') :
        'draft',
      problems: orderedProblems.map(problem => ({
        id: problem!.sourceId,
        imageUrl: problem!.imageUrl,
        difficulty: problem!.difficulty === '상' ? 'hard' : problem!.difficulty === '중' ? 'medium' : 'easy',
        type: problem!.problemType === '객관식' ? 'multiple_choice' : 'subjective',
        grade: `${problem!.grade}`,
        semester: problem!.semester,
        subject: problem!.subject,
        area: problem!.area,
        contentElement: problem!.contentElement,
        metadata: problem!.metadata,
        sections: problem!.sections
      })),
      problemRecordings: submission.problemRecordings.map(rec => ({
        id: rec.id,
        problemId: rec.problemId,
        problemIndex: rec.problemIndex,
        recordingUrl: rec.recordingUrl,
        duration: rec.duration,
        segments: rec.segments
      }))
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Get submission error:', error)
    return NextResponse.json(
      { error: "Failed to get submission" },
      { status: 500 }
    )
  }
}

// 채점 업데이트 API
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id: submissionId } = await params

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { feedback, score, problemScores } = body

    // 제출물 조회 (권한 확인용)
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            class: {
              select: { teacherId: true }
            }
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      )
    }

    // 권한 확인
    if (submission.assignment.class.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // 채점 업데이트
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        feedback,
        score,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      submission: {
        id: updatedSubmission.id,
        feedback: updatedSubmission.feedback,
        score: updatedSubmission.score
      }
    })

  } catch (error) {
    console.error('Update grading error:', error)
    return NextResponse.json(
      { error: "Failed to update grading" },
      { status: 500 }
    )
  }
}
