import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

const problemFilterSchema = z.object({
  school: z.string().optional(),
  grade: z.string().optional(),
  semester: z.string().optional(),
  unit: z.string().optional(), // 레거시 호환성
  area: z.string().optional(), // 새로운 영역 필터
  contentElement: z.union([z.string(), z.array(z.string())]).optional(), // 내용요소 필터 (단일 또는 배열)
  difficulty: z.string().optional(),
  type: z.string().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      school: searchParams.get('school') || undefined,
      grade: searchParams.get('grade') || undefined,
      semester: searchParams.get('semester') || undefined,
      unit: searchParams.get('unit') || undefined,
      area: searchParams.get('area') || undefined,
      contentElement: searchParams.get('contentElement') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    }

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

    const problems = await prisma.problem.findMany({
      where: whereConditions,
      take: filters.limit || 50,
      orderBy: { createdAt: 'desc' }
    })

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
      total: processedProblems.length
    })

  } catch (error) {
    console.error("Problems fetch error:", error)
    return NextResponse.json(
      { message: "문제를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const filters = problemFilterSchema.parse(body)

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

    const problems = await prisma.problem.findMany({
      where: whereConditions,
      take: filters.limit || 50,
      orderBy: { createdAt: 'desc' }
    })

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
      total: processedProblems.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "잘못된 필터 형식입니다." },
        { status: 400 }
      )
    }

    console.error("Problems fetch error:", error)
    return NextResponse.json(
      { message: "문제를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}