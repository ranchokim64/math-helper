import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET: 미검증 객관식 문제 1개 가져오기 + 진행률 정보
export async function GET(request: NextRequest) {
  try {
    // 전체 객관식 문제 수
    const totalCount = await prisma.problem.count({
      where: { problemType: 'multiple_choice' }
    })

    // 검증 완료된 객관식 문제 수
    const verifiedCount = await prisma.problem.count({
      where: {
        problemType: 'multiple_choice',
        maskingVerified: true
      }
    })

    // 미검증 객관식 문제 1개 가져오기
    const problem = await prisma.problem.findFirst({
      where: {
        problemType: 'multiple_choice',
        maskingVerified: false
      },
      orderBy: {
        id: 'asc'
      }
    })

    if (!problem) {
      return NextResponse.json({
        problem: null,
        progress: {
          total: totalCount,
          verified: verifiedCount,
          remaining: 0
        },
        message: '모든 객관식 문제 검증 완료!'
      })
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
      metadata: problem.metadata as Record<string, unknown>,
      sections: problem.sections as Array<Record<string, unknown>>
    }

    return NextResponse.json({
      problem: processedProblem,
      progress: {
        total: totalCount,
        verified: verifiedCount,
        remaining: totalCount - verifiedCount
      }
    })

  } catch (error) {
    console.error('Error fetching problem:', error)
    return NextResponse.json(
      { error: '문제를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 문제 검증 결과 저장 및 다음 문제 반환
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { problemId, isValid } = body

    if (!problemId || typeof isValid !== 'boolean') {
      return NextResponse.json(
        { error: 'problemId와 isValid 값이 필요합니다.' },
        { status: 400 }
      )
    }

    // 검증 결과 저장 (problemId는 sourceId)
    await prisma.problem.update({
      where: { sourceId: problemId },
      data: {
        maskingVerified: true,
        maskingValid: isValid
      }
    })

    // 다음 미검증 문제 가져오기
    const totalCount = await prisma.problem.count({
      where: { problemType: 'multiple_choice' }
    })

    const verifiedCount = await prisma.problem.count({
      where: {
        problemType: 'multiple_choice',
        maskingVerified: true
      }
    })

    const nextProblem = await prisma.problem.findFirst({
      where: {
        problemType: 'multiple_choice',
        maskingVerified: false
      },
      orderBy: {
        id: 'asc'
      }
    })

    // ProcessedProblem 형태로 변환
    const processedNextProblem = nextProblem ? {
      id: nextProblem.sourceId,
      imageUrl: nextProblem.imageUrl,
      difficulty: nextProblem.difficulty as 'easy' | 'medium' | 'hard',
      type: nextProblem.problemType as 'multiple_choice' | 'subjective',
      grade: nextProblem.grade,
      semester: nextProblem.semester,
      subject: nextProblem.subject,
      area: nextProblem.area,
      contentElement: nextProblem.contentElement,
      metadata: nextProblem.metadata as Record<string, unknown>,
      sections: nextProblem.sections as Array<Record<string, unknown>>
    } : null

    return NextResponse.json({
      success: true,
      problem: processedNextProblem,
      progress: {
        total: totalCount,
        verified: verifiedCount,
        remaining: totalCount - verifiedCount
      }
    })

  } catch (error) {
    console.error('Error updating problem:', error)
    return NextResponse.json(
      { error: '문제 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
