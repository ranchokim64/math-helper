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

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 제출물 조회 (문제별 녹화 포함)
    const submission = await prisma.submission.findUnique({
      where: {
        id: submissionId
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            problems: true,
            dueDate: true
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

    // 권한 확인: 본인의 제출물만 조회 가능
    if (submission.studentId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only view your own submissions" },
        { status: 403 }
      )
    }

    // 문제 ID 배열 추출
    const problemIds = (submission.assignment.problems as Array<{ id: number }>)?.map(p => String(p.id)) || []

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
      assignmentId: submission.assignment.id,
      assignmentTitle: submission.assignment.title,
      assignmentDescription: submission.assignment.description,
      dueDate: submission.assignment.dueDate?.toISOString() || null,
      submittedAt: submission.submittedAt?.toISOString() || null,
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
        capturedImageUrl: rec.capturedImageUrl, // 학생 필기가 포함된 캡처 이미지
        duration: rec.duration
      }))
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Get student submission error:', error)
    return NextResponse.json(
      { error: "Failed to get submission" },
      { status: 500 }
    )
  }
}
