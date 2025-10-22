import { auth } from "@/lib/auth/auth"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id: assignmentId } = await params

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const studentId = session.user.id

    // FormData로 받기 (문제별 녹화 파일 포함)
    const formData = await request.formData()
    const recordedProblemsCount = parseInt(formData.get('recordedProblemsCount') as string || '0')

    console.log('📥 제출 데이터 수신:', {
      studentId,
      assignmentId,
      recordedProblemsCount
    })

    // 문제별 녹화 데이터 파싱
    const problemRecordings: Array<{
      problemId: string
      problemIndex: number
      duration: number
      segments: any
      file: File
    }> = []

    for (let i = 0; i < recordedProblemsCount; i++) {
      const file = formData.get(`recording_${i}`) as File | null
      const problemId = formData.get(`recording_${i}_problemId`) as string | null
      const problemIndex = formData.get(`recording_${i}_problemIndex`) as string | null
      const duration = formData.get(`recording_${i}_duration`) as string | null
      const segmentsJson = formData.get(`recording_${i}_segments`) as string | null

      if (file && problemId && problemIndex !== null && duration) {
        problemRecordings.push({
          problemId,
          problemIndex: parseInt(problemIndex),
          duration: parseInt(duration),
          segments: segmentsJson ? JSON.parse(segmentsJson) : null,
          file
        })
      }
    }

    console.log('📊 파싱된 녹화 데이터:', {
      count: problemRecordings.length,
      problemIds: problemRecordings.map(r => r.problemId)
    })

    // 제출물 생성 또는 업데이트
    const submission = await prisma.submission.upsert({
      where: {
        studentId_assignmentId: {
          studentId,
          assignmentId
        }
      },
      update: {
        submittedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        studentId,
        assignmentId,
        submittedAt: new Date()
      }
    })

    // 문제별 녹화 저장
    // 기존 녹화 데이터 삭제 (재제출 시)
    await prisma.problemRecording.deleteMany({
      where: {
        submissionId: submission.id
      }
    })

    // 새 녹화 데이터 생성
    for (const recording of problemRecordings) {
      // 파일 저장 처리
      // TODO: 실제로는 파일을 S3나 로컬 스토리지에 저장하고 URL을 반환
      const recordingUrl = `/recordings/${studentId}-${assignmentId}-problem_${recording.problemIndex}-${Date.now()}.webm`
      // 실제 구현:
      // const buffer = await recording.file.arrayBuffer()
      // const recordingUrl = await uploadToStorage(buffer, recording.file.name)

      await prisma.problemRecording.create({
        data: {
          submissionId: submission.id,
          problemId: recording.problemId,
          problemIndex: recording.problemIndex,
          recordingUrl,
          duration: recording.duration,
          segments: recording.segments
        }
      })

      console.log(`💾 문제 ${recording.problemIndex + 1} 녹화 저장:`, {
        problemId: recording.problemId,
        duration: recording.duration,
        url: recordingUrl
      })
    }

    console.log('✅ 제출 완료:', {
      submissionId: submission.id,
      recordingsCount: problemRecordings.length
    })

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        submittedAt: submission.submittedAt,
        recordingsCount: problemRecordings.length
      }
    })

  } catch (error) {
    console.error('Submit assignment error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      {
        error: "Failed to submit assignment",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
