import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateClassSchema = z.object({
  name: z.string().min(1, "클래스 이름을 입력해주세요"),
})

// GET - 특정 클래스 조회
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
    const classId = resolvedParams.id

    const classInfo = await prisma.class.findUnique({
      where: {
        id: classId,
        teacherId: session.user.id
      },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        },
        assignments: {
          select: {
            id: true,
            title: true,
            createdAt: true
          }
        }
      }
    })

    if (!classInfo) {
      return NextResponse.json(
        { message: "클래스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 응답 데이터 구성
    const responseData = {
      id: classInfo.id,
      name: classInfo.name,
      code: classInfo.code,
      teacherId: classInfo.teacherId,
      createdAt: classInfo.createdAt,
      studentCount: classInfo.students.length,
      assignmentCount: classInfo.assignments.length,
      students: classInfo.students,
      assignments: classInfo.assignments
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error("Class fetch error:", error)
    return NextResponse.json(
      { message: "클래스 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// PUT - 클래스 정보 수정
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
    const classId = resolvedParams.id

    const body = await request.json()
    const validatedData = updateClassSchema.parse(body)

    // 클래스 소유권 확인
    const existingClass = await prisma.class.findUnique({
      where: {
        id: classId,
        teacherId: session.user.id
      }
    })

    if (!existingClass) {
      return NextResponse.json(
        { message: "클래스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 클래스 정보 업데이트
    const updatedClass = await prisma.class.update({
      where: {
        id: classId
      },
      data: {
        name: validatedData.name,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: "클래스 정보가 성공적으로 수정되었습니다.",
      class: updatedClass
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "입력 데이터가 올바르지 않습니다." },
        { status: 400 }
      )
    }

    console.error("Class update error:", error)
    return NextResponse.json(
      { message: "클래스 정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// DELETE - 클래스 삭제
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
    const classId = resolvedParams.id

    // 클래스 소유권 확인
    const existingClass = await prisma.class.findUnique({
      where: {
        id: classId,
        teacherId: session.user.id
      }
    })

    if (!existingClass) {
      return NextResponse.json(
        { message: "클래스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 트랜잭션으로 관련 데이터 모두 삭제
    await prisma.$transaction(async (tx) => {
      // 먼저 과제와 관련된 제출물들 삭제
      await tx.submission.deleteMany({
        where: {
          assignment: {
            classId: classId
          }
        }
      })

      // 과제들 삭제
      await tx.assignment.deleteMany({
        where: {
          classId: classId
        }
      })

      // 학생들의 classId를 null로 변경 (학생 계정은 유지)
      await tx.user.updateMany({
        where: {
          classId: classId
        },
        data: {
          classId: null
        }
      })

      // 클래스 삭제
      await tx.class.delete({
        where: {
          id: classId
        }
      })
    })

    return NextResponse.json({
      message: "클래스가 성공적으로 삭제되었습니다."
    })

  } catch (error) {
    console.error("Class delete error:", error)
    return NextResponse.json(
      { message: "클래스 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}