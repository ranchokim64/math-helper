import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { generateClassCode } from "@/lib/utils"

const createClassSchema = z.object({
  name: z.string().min(1, "클래스명은 필수입니다"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { message: "교사만 클래스를 생성할 수 있습니다." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name } = createClassSchema.parse(body)

    // 중복되지 않는 클래스 코드 생성
    let classCode: string
    let isUnique = false

    do {
      classCode = generateClassCode()
      const existingClass = await prisma.class.findUnique({
        where: { code: classCode }
      })
      isUnique = !existingClass
    } while (!isUnique)

    // 클래스 생성
    const newClass = await prisma.class.create({
      data: {
        name,
        code: classCode,
        teacherId: session.user.id,
      },
      include: {
        students: true,
        assignments: true,
      }
    })

    return NextResponse.json({
      message: "클래스가 성공적으로 생성되었습니다.",
      class: {
        ...newClass,
        studentCount: newClass.students.length,
        assignmentCount: newClass.assignments.length,
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      )
    }

    console.error("Class creation error:", error)
    return NextResponse.json(
      { message: "클래스 생성 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { message: "교사만 클래스를 조회할 수 있습니다." },
        { status: 403 }
      )
    }

    const classes = await prisma.class.findMany({
      where: {
        teacherId: session.user.id
      },
      include: {
        students: true,
        assignments: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedClasses = classes.map(cls => ({
      ...cls,
      studentCount: cls.students.length,
      assignmentCount: cls.assignments.length,
    }))

    return NextResponse.json(formattedClasses)

  } catch (error) {
    console.error("Classes fetch error:", error)
    return NextResponse.json(
      { message: "클래스를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}