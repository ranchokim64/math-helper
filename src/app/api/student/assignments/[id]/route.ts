import { auth } from '@/lib/auth/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const assignmentId = resolvedParams.id
    const studentId = session.user.id

    // 과제 정보와 문제들 가져오기
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          select: {
            name: true,
            students: {
              where: { id: studentId },
              select: { id: true }
            }
          }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // 학생이 해당 클래스에 속해있는지 확인
    if (assignment.class.students.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 문제 ID들 추출
    const problemIds = Array.isArray(assignment.problems)
      ? assignment.problems.map((p) => String((p as { id: number }).id))
      : []

    // 실제 문제 데이터들 가져오기
    const problems = await prisma.problem.findMany({
      where: {
        sourceId: { in: problemIds }
      }
    })

    // 문제 순서대로 정렬
    const orderedProblems = problemIds.map(id => {
      const problem = problems.find(p => p.sourceId === id)
      if (!problem) {
        console.warn(`Problem not found: ${id}`)
        return null
      }

      // 디버깅: sections 데이터 확인
      const sections = problem.sections as Array<Record<string, unknown>>
      const answerSections = sections?.filter(s => s.type === 'answer' || s.type === 'explanation') || []
      console.log(`\n[DEBUG] Problem: ${problem.sourceId}`)
      console.log(`[DEBUG] Total sections: ${sections?.length || 0}`)
      console.log(`[DEBUG] Answer/Explanation sections: ${answerSections.length}`)
      if (answerSections.length > 0) {
        answerSections.forEach((s, i) => {
          console.log(`[DEBUG] Section ${i + 1}: type=${s.type}, hasBoundingBox=${!!s.boundingBox}`)
          if (s.boundingBox) {
            console.log(`[DEBUG]   boundingBox: ${JSON.stringify(s.boundingBox)}`)
          }
        })
      }

      // 난이도와 문제유형을 한글로 변환
      const getDifficultyInKorean = (difficulty: string): string => {
        const mapping: Record<string, string> = {
          'easy': '하',
          'medium': '중',
          'hard': '상'
        }
        return mapping[difficulty] || difficulty
      }

      const getProblemTypeInKorean = (problemType: string): string => {
        const mapping: Record<string, string> = {
          'multiple_choice': '객관식',
          'subjective': '주관식'
        }
        return mapping[problemType] || problemType
      }

      // 메타데이터에 한글 난이도/문제유형 추가
      const dbMetadata = problem.metadata as Record<string, unknown>
      const enhancedMetadata = {
        ...dbMetadata,
        source_data_name: problem.sourceId,
        level_of_difficulty: getDifficultyInKorean(problem.difficulty),
        types_of_problems: getProblemTypeInKorean(problem.problemType)
      }

      return {
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
        metadata: enhancedMetadata,
        sections: problem.sections as Array<Record<string, unknown>>
      }
    }).filter(Boolean)

    const assignmentData = {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate?.toISOString(),
      className: assignment.class.name,
      problems: orderedProblems
    }

    return NextResponse.json(assignmentData)

  } catch (error) {
    console.error('Error fetching assignment for student:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}