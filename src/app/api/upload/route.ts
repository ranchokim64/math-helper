import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "업로드할 파일이 없습니다." },
        { status: 400 }
      )
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads')

    // uploads 디렉토리가 없으면 생성
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uploadedUrls: string[] = []

    for (const file of files) {
      // 파일 검증
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `${file.name}은 이미지 파일이 아닙니다.` },
          { status: 400 }
        )
      }

      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `${file.name}의 크기가 10MB를 초과합니다.` },
          { status: 400 }
        )
      }

      // 고유한 파일명 생성
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const extension = file.name.split('.').pop()
      const fileName = `${timestamp}_${randomString}.${extension}`

      // 파일 저장
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filePath = join(uploadDir, fileName)

      await writeFile(filePath, buffer)

      // 공개 URL 생성
      const publicUrl = `/uploads/${fileName}`
      uploadedUrls.push(publicUrl)
    }

    return NextResponse.json({
      message: "파일 업로드 성공",
      urls: uploadedUrls
    })

  } catch (error) {
    console.error("파일 업로드 오류:", error)
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')

    if (!fileUrl) {
      return NextResponse.json(
        { error: "삭제할 파일 URL이 없습니다." },
        { status: 400 }
      )
    }

    // URL에서 파일명 추출
    const fileName = fileUrl.split('/').pop()
    if (!fileName) {
      return NextResponse.json(
        { error: "잘못된 파일 URL입니다." },
        { status: 400 }
      )
    }

    const filePath = join(process.cwd(), 'public', 'uploads', fileName)

    // 파일이 존재하는지 확인
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 파일 삭제
    const { unlink } = await import('fs/promises')
    await unlink(filePath)

    return NextResponse.json({
      message: "파일 삭제 성공"
    })

  } catch (error) {
    console.error("파일 삭제 오류:", error)
    return NextResponse.json(
      { error: "파일 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}