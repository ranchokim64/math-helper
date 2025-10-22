import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const problemId = resolvedParams.id

    const problem = await prisma.problem.findUnique({
      where: {
        sourceId: problemId
      }
    })

    if (!problem) {
      return NextResponse.json(
        { message: "문제를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // ProcessedProblem 형태로 변환
    const processedProblem = {
      id: problem.sourceId,
      imageUrl: problem.imageUrl,
      difficulty: problem.difficulty as 'easy' | 'medium' | 'hard',
      type: problem.problemType as 'multiple_choice' | 'subjective',
      grade: problem.grade,
      semester: problem.semester,
      subject: problem.subject,
      area: problem.area,
      contentElement: problem.contentElement,
      unit: problem.unit,
      school: problem.school,
      achievementStandards: problem.achievementStandards,
      metadata: problem.metadata as Record<string, unknown>,
      sections: problem.sections as Array<Record<string, unknown>>
    }

    return NextResponse.json(processedProblem)

  } catch (error) {
    console.error("Problem fetch error:", error)
    return NextResponse.json(
      { message: "문제를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}