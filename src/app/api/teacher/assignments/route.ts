import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

const createAssignmentSchema = z.object({
  title: z.string().min(1, "과제 제목은 필수입니다"),
  description: z.string().optional(),
  classId: z.string().min(1, "클래스 선택은 필수입니다"),
  dueDate: z.string().nullable().optional(),
  problems: z.array(z.object({
    id: z.string(),
    order: z.number()
  })).min(1, "최소 1개 이상의 문제를 선택해야 합니다"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { message: "교사만 과제를 생성할 수 있습니다." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, classId, dueDate, problems } = createAssignmentSchema.parse(body)

    // 클래스가 해당 교사의 것인지 확인
    const classExists = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: session.user.id
      }
    })

    if (!classExists) {
      return NextResponse.json(
        { message: "클래스를 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      )
    }

    // 과제 생성
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        classId,
        dueDate: dueDate ? new Date(dueDate) : null,
        problems: problems, // JSON 배열로 저장
      },
      include: {
        class: {
          include: {
            students: true
          }
        }
      }
    })

    return NextResponse.json({
      message: "과제가 성공적으로 생성되었습니다.",
      assignment: {
        ...assignment,
        studentCount: assignment.class.students.length
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      )
    }

    console.error("Assignment creation error:", error)
    return NextResponse.json(
      { message: "과제 생성 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { message: "교사만 과제를 조회할 수 있습니다." },
        { status: 403 }
      )
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        class: {
          teacherId: session.user.id
        }
      },
      include: {
        class: {
          include: {
            students: true
          }
        },
        submissions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedAssignments = assignments.map(assignment => ({
      ...assignment,
      studentCount: assignment.class.students.length,
      submissionCount: assignment.submissions.length,
      className: assignment.class.name
    }))

    return NextResponse.json(formattedAssignments)

  } catch (error) {
    console.error("Assignments fetch error:", error)
    return NextResponse.json(
      { message: "과제를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}