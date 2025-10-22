import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const registerSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  role: z.enum(["TEACHER", "STUDENT"]),
  classCode: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role, classCode } = registerSchema.parse(body)

    // 이미 존재하는 이메일인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "이미 사용 중인 이메일입니다." },
        { status: 400 }
      )
    }

    // 학생인 경우 클래스 코드 확인
    let classId: string | undefined = undefined
    if (role === "STUDENT") {
      if (!classCode) {
        return NextResponse.json(
          { message: "학생은 클래스 코드가 필요합니다." },
          { status: 400 }
        )
      }

      const classExists = await prisma.class.findUnique({
        where: { code: classCode }
      })

      if (!classExists) {
        return NextResponse.json(
          { message: "유효하지 않은 클래스 코드입니다." },
          { status: 400 }
        )
      }

      classId = classExists.id
    }

    // 비밀번호 해싱
    const hashedPassword = await hash(password, 12)

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        classId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        classId: true,
      }
    })

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user
      },
      { status: 201 }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}