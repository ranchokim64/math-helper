import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const problemFilterSchema = z.object({
  school: z.string().optional(),
  grade: z.string().optional(),
  semester: z.string().optional(),
  unit: z.string().optional(),
  area: z.string().optional(),
  contentElement: z.string().optional(),
  difficulty: z.string().optional(),
  type: z.string().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
})

// 테스트용 엔드포인트 - 인증 없이 사용 가능
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const filters = problemFilterSchema.parse(body)

    console.log('테스트 API 호출:', filters)

    // 데이터베이스 쿼리 조건 구성
    const whereConditions: Record<string, unknown> = {}

    if (filters.school) {
      whereConditions.school = filters.school
    }
    if (filters.grade) {
      whereConditions.grade = filters.grade
    }
    if (filters.semester) {
      whereConditions.semester = filters.semester
    }
    if (filters.unit) {
      whereConditions.unit = filters.unit
    }
    if (filters.area) {
      whereConditions.area = filters.area
    }
    if (filters.contentElement) {
      whereConditions.contentElement = filters.contentElement
    }
    if (filters.difficulty) {
      whereConditions.difficulty = filters.difficulty
    }
    if (filters.type) {
      whereConditions.problemType = filters.type
    }
    if (filters.search) {
      whereConditions.OR = [
        { sourceDataName: { contains: filters.search, mode: 'insensitive' } },
        { unit: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    console.log('쿼리 조건:', whereConditions)

    const problems = await prisma.problem.findMany({
      where: whereConditions,
      take: filters.limit || 50,
      orderBy: { createdAt: 'desc' }
    })

    console.log(`검색 결과: ${problems.length}개 문제 발견`)

    // ProcessedProblem 형태로 변환
    const processedProblems = problems.map(problem => ({
      id: problem.sourceId,
      imageUrl: problem.imageUrl,
      difficulty: problem.difficulty as 'easy' | 'medium' | 'hard',
      type: problem.problemType as 'multiple_choice' | 'subjective',
      grade: problem.grade,
      semester: problem.semester,
      subject: problem.subject,
      area: problem.area,
      contentElement: problem.contentElement,
      metadata: problem.metadata as Record<string, unknown>,
      sections: problem.sections as Array<Record<string, unknown>>
    }))

    return NextResponse.json({
      problems: processedProblems,
      total: processedProblems.length,
      debug: {
        filters,
        whereConditions,
        foundCount: problems.length
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message || "잘못된 필터 형식입니다.",
          debug: { error: error.issues }
        },
        { status: 400 }
      )
    }

    console.error("테스트 API 오류:", error)
    return NextResponse.json(
      {
        message: "문제를 불러오는 중 오류가 발생했습니다.",
        debug: { error: error instanceof Error ? error.message : String(error) }
      },
      { status: 500 }
    )
  }
}