import { auth } from "@/lib/auth/auth"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  saveRecordingFile,
  generateRecordingFilename,
  saveSubmissionImage,
  generateSubmissionImageFilename
} from "@/lib/storage"

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
      segments: unknown
      file: File
      capturedImage?: File  // 학생 필기가 포함된 캡처 이미지
      firstReactionTime?: number  // 최초 반응 시간 (초)
    }> = []

    for (let i = 0; i < recordedProblemsCount; i++) {
      const file = formData.get(`recording_${i}`) as File | null
      const problemId = formData.get(`recording_${i}_problemId`) as string | null
      const problemIndex = formData.get(`recording_${i}_problemIndex`) as string | null
      const duration = formData.get(`recording_${i}_duration`) as string | null
      const segmentsJson = formData.get(`recording_${i}_segments`) as string | null
      const capturedImage = formData.get(`captured_image_${i}`) as File | null
      const firstReaction = formData.get(`recording_${i}_firstReaction`) as string | null

      if (file && problemId && problemIndex !== null && duration) {
        problemRecordings.push({
          problemId,
          problemIndex: parseInt(problemIndex),
          duration: parseInt(duration),
          segments: segmentsJson ? JSON.parse(segmentsJson) : null,
          file,
          capturedImage: capturedImage || undefined,
          firstReactionTime: firstReaction ? parseFloat(firstReaction) : undefined
        })
      }
    }

    console.log('📊 파싱된 녹화 데이터:', {
      count: problemRecordings.length,
      problemIds: problemRecordings.map(r => r.problemId),
      segmentsInfo: problemRecordings.map(r => ({
        problemId: r.problemId,
        hasSegments: !!r.segments,
        segmentsCount: Array.isArray(r.segments) ? r.segments.length : 0,
        segments: r.segments
      }))
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
      // 녹화 파일 저장 처리
      const filename = generateRecordingFilename(
        studentId,
        assignmentId,
        recording.problemIndex
      )

      // 파일을 디스크에 저장
      const buffer = await recording.file.arrayBuffer()
      const recordingUrl = await saveRecordingFile(buffer, filename)

      // 캡처 이미지 저장 처리
      let capturedImageUrl: string | null = null
      if (recording.capturedImage) {
        const imageFilename = generateSubmissionImageFilename(
          studentId,
          assignmentId,
          recording.problemIndex
        )
        const imageBuffer = await recording.capturedImage.arrayBuffer()
        capturedImageUrl = await saveSubmissionImage(imageBuffer, imageFilename)

        console.log(`📸 문제 ${recording.problemIndex + 1} 캡처 이미지 저장:`, {
          url: capturedImageUrl,
          fileSize: imageBuffer.byteLength
        })
      }

      await prisma.problemRecording.create({
        data: {
          submissionId: submission.id,
          problemId: recording.problemId,
          problemIndex: recording.problemIndex,
          recordingUrl,
          capturedImageUrl,
          duration: recording.duration,
          segments: (recording.segments ?? undefined) as never,
          firstReactionTime: recording.firstReactionTime
        }
      })

      console.log(`💾 문제 ${recording.problemIndex + 1} 녹화 저장:`, {
        problemId: recording.problemId,
        duration: recording.duration,
        url: recordingUrl,
        capturedImageUrl,
        fileSize: buffer.byteLength,
        hasSegments: !!recording.segments,
        segmentsCount: Array.isArray(recording.segments) ? recording.segments.length : 0,
        segmentsPreview: Array.isArray(recording.segments) ? recording.segments.slice(0, 2) : null
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
