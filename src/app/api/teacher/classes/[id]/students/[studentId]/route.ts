import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

// DELETE - 클래스에서 학생 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
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
    const studentId = resolvedParams.studentId

    // 클래스 소유권 확인
    const classInfo = await prisma.class.findUnique({
      where: {
        id: classId,
        teacherId: session.user.id
      }
    })

    if (!classInfo) {
      return NextResponse.json(
        { message: "클래스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 학생이 실제로 이 클래스에 속해 있는지 확인
    const student = await prisma.user.findUnique({
      where: {
        id: studentId,
        classId: classId,
        role: 'STUDENT'
      }
    })

    if (!student) {
      return NextResponse.json(
        { message: "해당 클래스에서 학생을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 학생을 클래스에서 제거 (학생 계정은 유지, classId만 null로 변경)
    await prisma.user.update({
      where: {
        id: studentId
      },
      data: {
        classId: null
      }
    })

    return NextResponse.json({
      message: "학생이 클래스에서 성공적으로 제거되었습니다."
    })

  } catch (error) {
    console.error("Student removal error:", error)
    return NextResponse.json(
      { message: "학생 제거 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}