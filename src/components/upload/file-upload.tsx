"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Upload,
  X,
  FileImage,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react"

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<string[]> // 업로드된 파일의 URL 배열 반환
  onRemove?: (url: string) => void
  accept?: string
  multiple?: boolean
  maxSize?: number // MB 단위
  maxFiles?: number
  existingFiles?: string[]
  disabled?: boolean
  className?: string
}

interface UploadFile {
  file: File
  url?: string
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  error?: string
}

export function FileUpload({
  onUpload,
  onRemove,
  accept = "image/*",
  multiple = true,
  maxSize = 10, // 10MB
  maxFiles = 5,
  existingFiles = [],
  disabled = false,
  className = ""
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 파일 검증
  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `파일 크기가 ${maxSize}MB를 초과합니다.`
    }

    if (!file.type.startsWith('image/')) {
      return '이미지 파일만 업로드 가능합니다.'
    }

    return null
  }

  // 파일 추가
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const totalFiles = files.length + existingFiles.length + fileArray.length

    if (totalFiles > maxFiles) {
      toast.error(`최대 ${maxFiles}개의 파일만 업로드 가능합니다.`)
      return
    }

    const validFiles: UploadFile[] = []
    const errors: string[] = []

    fileArray.forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push({
          file,
          status: "pending",
          progress: 0
        })
      }
    })

    if (errors.length > 0) {
      toast.error(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      uploadFiles(validFiles)
    }
  }, [files, existingFiles, maxFiles, maxSize])

  // 파일 업로드 실행
  const uploadFiles = async (filesToUpload: UploadFile[]) => {
    const fileObjects = filesToUpload.map(f => f.file)

    // 업로드 상태 업데이트
    setFiles(prev => prev.map(f =>
      filesToUpload.some(upload => upload.file === f.file)
        ? { ...f, status: "uploading" as const }
        : f
    ))

    try {
      // 가상의 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f =>
          filesToUpload.some(upload => upload.file === f.file) && f.status === "uploading"
            ? { ...f, progress: Math.min(f.progress + Math.random() * 20, 90) }
            : f
        ))
      }, 200)

      // 실제 업로드 호출
      const uploadedUrls = await onUpload(fileObjects)

      clearInterval(progressInterval)

      // 성공 상태 업데이트
      setFiles(prev => prev.map(f => {
        const uploadIndex = filesToUpload.findIndex(upload => upload.file === f.file)
        if (uploadIndex !== -1) {
          return {
            ...f,
            status: "success" as const,
            progress: 100,
            url: uploadedUrls[uploadIndex]
          }
        }
        return f
      }))

      toast.success(`${filesToUpload.length}개 파일이 업로드되었습니다.`)

    } catch (error) {
      // 에러 상태 업데이트
      setFiles(prev => prev.map(f =>
        filesToUpload.some(upload => upload.file === f.file)
          ? {
              ...f,
              status: "error" as const,
              progress: 0,
              error: error instanceof Error ? error.message : '업로드 실패'
            }
          : f
      ))

      toast.error("파일 업로드에 실패했습니다.")
    }
  }

  // 파일 제거
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 기존 파일 제거
  const removeExistingFile = (url: string) => {
    if (onRemove) {
      onRemove(url)
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setDragActive(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles)
    }
  }

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles)
    }

    // 입력 필드 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 파일 선택 버튼 클릭
  const openFileDialog = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click()
    }
  }

  const totalFiles = files.length + existingFiles.length
  const canAddMore = totalFiles < maxFiles && !disabled

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 드래그 앤 드롭 영역 */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
              disabled ? 'bg-gray-200' : 'bg-blue-100'
            }`}>
              <Upload className={`h-6 w-6 ${disabled ? 'text-gray-400' : 'text-blue-600'}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium">파일 업로드</h3>
              <p className="text-sm text-gray-500 mt-1">
                파일을 드래그하거나 클릭하여 선택하세요
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={openFileDialog}
                disabled={!canAddMore}
                variant="outline"
              >
                파일 선택
              </Button>

              <div className="text-xs text-gray-500">
                <p>최대 {maxFiles}개 파일, 각 파일 최대 {maxSize}MB</p>
                <p>지원 형식: 이미지 파일 (JPG, PNG, WebP 등)</p>
              </div>
            </div>

            {totalFiles > 0 && (
              <div className="text-sm text-gray-600">
                {totalFiles}/{maxFiles} 파일 업로드됨
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* 기존 파일 목록 */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">기존 파일</h4>
          <div className="grid grid-cols-1 gap-2">
            {existingFiles.map((url, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileImage className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">파일 {index + 1}</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    업로드 완료
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExistingFile(url)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 업로드 중인 파일 목록 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">업로드 파일</h4>
          <div className="grid grid-cols-1 gap-2">
            {files.map((file, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <FileImage className="h-5 w-5 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium">{file.file.name}</span>
                      <p className="text-xs text-gray-500">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {file.status === "uploading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    {file.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {file.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={file.status === "uploading"}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {file.status === "uploading" && (
                  <Progress value={file.progress} className="h-1" />
                )}

                {file.status === "error" && file.error && (
                  <p className="text-xs text-red-600 mt-1">{file.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}