import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, extname, basename } from 'path'

interface ImageImportOptions {
  sourceDir: string
  targetDir: string
  copyImages: boolean
  createDirectories: boolean
}

function ensureDirectoryExists(dirPath: string) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
    console.log(`디렉토리 생성: ${dirPath}`)
  }
}

function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  const ext = extname(filename).toLowerCase()
  return imageExtensions.includes(ext)
}

function sanitizeFilename(filename: string): string {
  // 파일명에서 특수문자 제거하고 안전한 문자로 변경
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
}

async function copyImageFiles(options: ImageImportOptions) {
  const { sourceDir, targetDir, copyImages, createDirectories } = options

  try {
    console.log(`이미지 복사 시작:`)
    console.log(`- 소스: ${sourceDir}`)
    console.log(`- 대상: ${targetDir}`)

    if (!existsSync(sourceDir)) {
      console.error(`소스 디렉토리가 존재하지 않습니다: ${sourceDir}`)
      return
    }

    if (createDirectories) {
      ensureDirectoryExists(targetDir)
    }

    const files = readdirSync(sourceDir)
    const imageFiles = files.filter(file => {
      const filePath = join(sourceDir, file)
      return statSync(filePath).isFile() && isImageFile(file)
    })

    console.log(`총 ${imageFiles.length}개의 이미지 파일을 발견했습니다.`)

    let copiedCount = 0
    let skippedCount = 0

    for (const imageFile of imageFiles) {
      try {
        const sourcePath = join(sourceDir, imageFile)
        const sanitizedName = sanitizeFilename(imageFile)
        const targetPath = join(targetDir, sanitizedName)

        if (copyImages) {
          if (existsSync(targetPath)) {
            console.log(`건너뛰기 (이미 존재): ${sanitizedName}`)
            skippedCount++
            continue
          }

          copyFileSync(sourcePath, targetPath)
          console.log(`복사 완료: ${imageFile} -> ${sanitizedName}`)
          copiedCount++
        } else {
          console.log(`확인됨: ${imageFile}`)
          copiedCount++
        }

      } catch (error) {
        console.error(`파일 처리 중 오류 ${imageFile}:`, error)
        skippedCount++
      }
    }

    console.log(`\n=== 이미지 처리 완료 ===`)
    console.log(`- 처리된 파일: ${copiedCount}개`)
    console.log(`- 건너뛴 파일: ${skippedCount}개`)
    console.log(`- 전체 파일: ${imageFiles.length}개`)

  } catch (error) {
    console.error('이미지 처리 중 오류:', error)
  }
}

async function organizeImagesByProblemId(options: ImageImportOptions & { problemIdPattern?: RegExp }) {
  const { sourceDir, targetDir, copyImages, createDirectories, problemIdPattern } = options

  try {
    console.log(`문제 ID별 이미지 정리:`)
    console.log(`- 소스: ${sourceDir}`)
    console.log(`- 대상: ${targetDir}`)

    if (!existsSync(sourceDir)) {
      console.error(`소스 디렉토리가 존재하지 않습니다: ${sourceDir}`)
      return
    }

    if (createDirectories) {
      ensureDirectoryExists(targetDir)
    }

    const files = readdirSync(sourceDir)
    const imageFiles = files.filter(file => {
      const filePath = join(sourceDir, file)
      return statSync(filePath).isFile() && isImageFile(file)
    })

    console.log(`총 ${imageFiles.length}개의 이미지 파일을 발견했습니다.`)

    let organizedCount = 0
    let skippedCount = 0

    for (const imageFile of imageFiles) {
      try {
        const sourcePath = join(sourceDir, imageFile)
        const fileBasename = basename(imageFile, extname(imageFile))

        // 문제 ID 추출 (S3_초등_3_008540 -> S3_초등_3_008540)
        let problemId = fileBasename
        if (problemIdPattern) {
          const match = fileBasename.match(problemIdPattern)
          problemId = match ? match[1] || match[0] : fileBasename
        }

        const targetFilename = `${problemId}${extname(imageFile)}`
        const targetPath = join(targetDir, targetFilename)

        if (copyImages) {
          if (existsSync(targetPath)) {
            console.log(`건너뛰기 (이미 존재): ${targetFilename}`)
            skippedCount++
            continue
          }

          copyFileSync(sourcePath, targetPath)
          console.log(`정리 완료: ${imageFile} -> ${targetFilename}`)
          organizedCount++
        } else {
          console.log(`매핑 확인: ${imageFile} -> ${targetFilename}`)
          organizedCount++
        }

      } catch (error) {
        console.error(`파일 정리 중 오류 ${imageFile}:`, error)
        skippedCount++
      }
    }

    console.log(`\n=== 이미지 정리 완료 ===`)
    console.log(`- 정리된 파일: ${organizedCount}개`)
    console.log(`- 건너뛴 파일: ${skippedCount}개`)
    console.log(`- 전체 파일: ${imageFiles.length}개`)

  } catch (error) {
    console.error('이미지 정리 중 오류:', error)
  }
}

// 디렉토리 체크
function checkDirectories(sourceDir: string, targetDir: string) {
  console.log('=== 디렉토리 확인 ===')

  if (!existsSync(sourceDir)) {
    console.error(`✗ 소스 디렉토리가 존재하지 않습니다: ${sourceDir}`)
    console.log('\n해결 방법:')
    console.log('1. 올바른 소스 경로를 지정하세요')
    console.log('2. 이미지 파일이 있는 디렉토리를 확인하세요')
    return false
  }

  console.log(`✓ 소스 디렉토리 확인: ${sourceDir}`)

  if (!existsSync(targetDir)) {
    console.log(`! 대상 디렉토리가 없어 생성합니다: ${targetDir}`)
  } else {
    console.log(`✓ 대상 디렉토리 확인: ${targetDir}`)
  }

  return true
}

// 이미지 파일 통계
function getImageStats(sourceDir: string) {
  try {
    const files = readdirSync(sourceDir)
    const imageFiles = files.filter(file => {
      const filePath = join(sourceDir, file)
      return statSync(filePath).isFile() && isImageFile(file)
    })

    const stats = {
      total: imageFiles.length,
      byExtension: {} as { [key: string]: number }
    }

    imageFiles.forEach(file => {
      const ext = extname(file).toLowerCase()
      stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1
    })

    console.log('\n=== 이미지 파일 통계 ===')
    console.log(`총 이미지 파일: ${stats.total}개`)
    console.log('확장자별 분포:')
    Object.entries(stats.byExtension).forEach(([ext, count]) => {
      console.log(`- ${ext}: ${count}개`)
    })

    return stats
  } catch (error) {
    console.error('통계 수집 중 오류:', error)
    return { total: 0, byExtension: {} }
  }
}

// 메인 실행 함수
async function main() {
  try {
    console.log('=== 문제 이미지 가져오기 시작 ===\n')

    // 명령행 인수 처리
    const args = process.argv.slice(2)
    const sourceDir = args[0] || './data/images'
    const targetDir = args[1] || './public/problems'
    const mode = args[2] || 'copy' // 'copy' 또는 'organize'
    const dryRun = args.includes('--dry-run')

    console.log(`실행 모드: ${mode}`)
    console.log(`소스 디렉토리: ${sourceDir}`)
    console.log(`대상 디렉토리: ${targetDir}`)
    console.log(`실제 복사: ${!dryRun ? '예' : '아니오 (테스트 모드)'}`)

    // 디렉토리 확인
    if (!checkDirectories(sourceDir, targetDir)) {
      process.exit(1)
    }

    // 이미지 파일 통계
    const stats = getImageStats(sourceDir)
    if (stats.total === 0) {
      console.log('\n처리할 이미지 파일이 없습니다.')
      return
    }

    const options: ImageImportOptions = {
      sourceDir,
      targetDir,
      copyImages: !dryRun,
      createDirectories: true
    }

    if (mode === 'organize') {
      // 문제 ID 패턴: 전체 파일명을 사용 (S3_초등_3_008540.png -> S3_초등_3_008540)
      const problemIdPattern = null // 패턴 없이 전체 파일명 사용
      await organizeImagesByProblemId({ ...options, problemIdPattern })
    } else {
      // 기본 복사 모드
      await copyImageFiles(options)
    }

    console.log('\n=== 이미지 가져오기 완료 ===')

    if (dryRun) {
      console.log('\n실제 파일 복사를 수행하려면 --dry-run 옵션을 제거하고 다시 실행하세요.')
    } else {
      console.log('\n이미지 파일이 성공적으로 업로드되었습니다.')
      console.log(`대상 경로: ${targetDir}`)
    }

  } catch (error) {
    console.error('실행 중 오류:', error)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  main()
}

export { copyImageFiles, organizeImagesByProblemId }