import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateAssignmentSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  problems: z.array(z.object({
    id: z.string(),
    order: z.number()
  })).optional(),
})

// GET - 특정 과제 조회
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
    const assignmentId = resolvedParams.id

    const assignment = await prisma.assignment.findUnique({
      where: {
        id: assignmentId
      },
      include: {
        class: true
      }
    })

    if (!assignment || assignment.class.teacherId !== session.user.id) {
      return NextResponse.json(
        { message: "과제를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // problems는 Json 필드에서 문제 ID 배열을 가져옴
    const problemIds = (assignment.problems as any[])?.map(p => p.id) || []

    // 실제 문제 데이터를 가져옴
    const problems = await prisma.problem.findMany({
      where: {
        sourceId: {
          in: problemIds
        }
      }
    })

    // 응답 형식 변환
    const responseData = {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      createdAt: assignment.createdAt,
      classId: assignment.classId,
      className: assignment.class.name,
      problems: problems.map(problem => ({
        id: problem.sourceId,
        imageUrl: problem.imageUrl,
        difficulty: problem.difficulty as 'easy' | 'medium' | 'hard',
        type: problem.problemType as 'multiple_choice' | 'subjective',
        grade: problem.grade,
        semester: problem.semester,
        subject: problem.subject,
        area: problem.area,
        contentElement: problem.contentElement,
        sections: problem.sections as Array<Record<string, unknown>>,
        metadata: problem.metadata as Record<string, unknown>
      }))
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error("Assignment fetch error:", error)
    return NextResponse.json(
      { message: "과제를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// PUT - 과제 수정
export async function PUT(
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
    const assignmentId = resolvedParams.id

    const body = await request.json()
    const validatedData = updateAssignmentSchema.parse(body)

    // 과제 소유권 확인
    const existingAssignment = await prisma.assignment.findUnique({
      where: {
        id: assignmentId
      },
      include: {
        class: true
      }
    })

    if (!existingAssignment || existingAssignment.class.teacherId !== session.user.id) {
      return NextResponse.json(
        { message: "과제를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 과제 정보 업데이트
    const updatedAssignment = await prisma.assignment.update({
      where: {
        id: assignmentId
      },
      data: {
        title: validatedData.title,
        description: validatedData.description || null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        problems: validatedData.problems || existingAssignment.problems,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: "과제가 성공적으로 수정되었습니다.",
      assignment: updatedAssignment
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "입력 데이터가 올바르지 않습니다." },
        { status: 400 }
      )
    }

    console.error("Assignment update error:", error)
    return NextResponse.json(
      { message: "과제 수정 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// DELETE - 과제 삭제
export async function DELETE(
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
    const assignmentId = resolvedParams.id

    // 과제 소유권 확인
    const existingAssignment = await prisma.assignment.findUnique({
      where: {
        id: assignmentId
      },
      include: {
        class: true
      }
    })

    if (!existingAssignment || existingAssignment.class.teacherId !== session.user.id) {
      return NextResponse.json(
        { message: "과제를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 과제 삭제 (submissions는 자동으로 cascade 될 것임)
    await prisma.assignment.delete({
      where: {
        id: assignmentId
      }
    })

    return NextResponse.json({
      message: "과제가 성공적으로 삭제되었습니다."
    })

  } catch (error) {
    console.error("Assignment delete error:", error)
    return NextResponse.json(
      { message: "과제 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}