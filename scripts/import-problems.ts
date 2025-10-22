import { PrismaClient } from '@prisma/client'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'
import { getUnitFromAchievement } from './achievement-unit-mapping.js'
import { extractAreaFromAchievements, extractContentElementFromAchievements } from './achievement-area-mapping.js'
import { preprocessAchievementStandards, logAchievementProcessing } from './utils/achievement-standards-validator'

const prisma = new PrismaClient()

// 실제 JSON 구조에 맞춘 인터페이스
interface RawDataInfo {
  raw_data_name: string
  date: string
  publisher: string
  publication_year: string
  school: string
  grade: string
  semester: string
  subject: string
  revision_year: string
}

interface SourceDataInfo {
  source_data_name: string
  "2009_achievement_standard": string[]
  "2015_achievement_standard": string[]
  "2022_achievement_standard": string[]
  level_of_difficulty: string
  types_of_problems: string
}

interface ClassInfo {
  Type: string
  Type_value: number[][]
  text_description: string
}

interface LearningDataInfo {
  class_num: number
  class_name: string
  class_info_list: ClassInfo[]
}

interface OriginalProblemData {
  raw_data_info: RawDataInfo
  source_data_info: SourceDataInfo
  learning_data_info: LearningDataInfo[]
}

// 레거시 데이터 구조 (기존 예제 파일들)
interface LegacyProblemData {
  id: string
  source_data_name: string
  grade: string
  semester: string
  subject: string
  level_of_difficulty: string
  types_of_problems: string
  image_path?: string
  achievement_standards?: any
  unit?: string
  school?: string
  [key: string]: any
}

interface ProcessedProblemSection {
  type: string
  content: string
  position: number
  boundingBox?: number[][] // Bounding Box 좌표 [x1, y1, x2, y2]
}

function mapDifficulty(originalDifficulty: string): string {
  const mapping: { [key: string]: string } = {
    '하': 'easy',
    '중': 'medium',
    '상': 'hard',
    '쉬움': 'easy',
    '보통': 'medium',
    '어려움': 'hard'
  }
  return mapping[originalDifficulty] || 'medium'
}

function mapProblemType(originalType: string): string {
  const mapping: { [key: string]: string } = {
    '객관식': 'multiple_choice',
    '주관식': 'subjective',
    '선택형': 'multiple_choice',
    '서술형': 'subjective'
  }
  return mapping[originalType] || 'subjective'
}

function parseAchievementStandards(data: any): { "2015": string[], "2022": string[] } {
  const result = {
    "2015": [] as string[],
    "2022": [] as string[]
  }

  // 2015 교육과정 성취기준 처리
  if (data['2015_achievement_standard']) {
    let standards2015: string[] = []
    if (Array.isArray(data['2015_achievement_standard'])) {
      standards2015.push(...data['2015_achievement_standard'])
    } else if (typeof data['2015_achievement_standard'] === 'string') {
      standards2015.push(data['2015_achievement_standard'])
    }

    const { cleanedStandards: cleaned2015, validation: validation2015 } = preprocessAchievementStandards(standards2015)
    result["2015"] = cleaned2015

    if (validation2015.invalidCodes.length > 0) {
      console.warn(`⚠️ 2015 교육과정 유효하지 않은 성취기준 제거됨: ${validation2015.invalidCodes.join(', ')}`)
    }
  }

  // 2022 교육과정 성취기준 처리
  if (data['2022_achievement_standard']) {
    let standards2022: string[] = []
    if (Array.isArray(data['2022_achievement_standard'])) {
      standards2022.push(...data['2022_achievement_standard'])
    } else if (typeof data['2022_achievement_standard'] === 'string') {
      standards2022.push(data['2022_achievement_standard'])
    }

    const { cleanedStandards: cleaned2022, validation: validation2022 } = preprocessAchievementStandards(standards2022)
    result["2022"] = cleaned2022

    if (validation2022.invalidCodes.length > 0) {
      console.warn(`⚠️ 2022 교육과정 유효하지 않은 성취기준 제거됨: ${validation2022.invalidCodes.join(', ')}`)
    }
  }

  // 2009 교육과정은 더 이상 사용하지 않으므로 제외

  return result
}

// 실제 JSON 구조에서 텍스트 추출하여 문제 섹션 생성
function createProblemSectionsFromLearningData(learningData: LearningDataInfo[]): ProcessedProblemSection[] {
  const sections: ProcessedProblemSection[] = []
  let position = 0

  // 클래스별로 정보 추출
  learningData.forEach(classData => {
    const className = classData.class_name

    classData.class_info_list.forEach(info => {
      const textDescription = info.text_description
      const boundingBox = info.Type_value // Bounding Box 좌표

      // 클래스명에 따라 섹션 타입 결정
      let sectionType = 'text'
      if (className.includes('문항') && className.includes('텍스트')) {
        sectionType = 'question'
      } else if (className.includes('문항') && className.includes('이미지')) {
        sectionType = 'question_image'
      } else if (className.includes('정답')) {
        sectionType = 'answer'
      } else if (className.includes('해설')) {
        sectionType = 'explanation'
      } else if (className.includes('선택지')) {
        sectionType = 'choice'
      }

      sections.push({
        type: sectionType,
        content: textDescription,
        position: position++,
        boundingBox: boundingBox // Bounding Box 좌표 추가
      })
    })
  })

  // 기본 문제 섹션이 없다면 생성
  if (sections.length === 0) {
    sections.push({
      type: 'question',
      content: '문제 내용을 확인할 수 없습니다.',
      position: 0
    })
  }

  return sections
}

// 레거시 데이터용 문제 섹션 생성 함수 (기존 함수)
function createLegacyProblemSections(data: any): ProcessedProblemSection[] {
  const sections: ProcessedProblemSection[] = []
  let position = 0

  // 문제 섹션 분석 및 생성
  if (data.question) {
    sections.push({
      type: 'question',
      content: data.question,
      position: position++
    })
  }

  if (data.choices && Array.isArray(data.choices)) {
    data.choices.forEach((choice: string, index: number) => {
      sections.push({
        type: 'choice',
        content: choice,
        position: position++
      })
    })
  }

  if (data.image_path) {
    sections.push({
      type: 'image',
      content: data.image_path,
      position: position++
    })
  }

  if (data.answer) {
    sections.push({
      type: 'answer',
      content: data.answer,
      position: position++
    })
  }

  // 기본 문제 섹션이 없다면 생성
  if (sections.length === 0) {
    sections.push({
      type: 'question',
      content: `문제 ${data.id}`,
      position: 0
    })
  }

  return sections
}

// 성취기준에서 단원명, 영역명, 학교정보 추출
function extractAreaAndSchoolInfo(achievementStandards: { "2015": string[], "2022": string[] }): { unit: string | null, area: string | null, contentElement: string | null, school: string | null } {
  // 모든 성취기준을 통합하여 처리 (영역과 내용요소 추출 시)
  const allStandards = [...achievementStandards["2015"], ...achievementStandards["2022"]]

  // 영역 추출 (새로운 방식)
  const area = extractAreaFromAchievements(allStandards)

  // 내용요소 추출 (새로운 기능)
  const contentElement = extractContentElementFromAchievements(allStandards)

  // 기존 단원 추출 (호환성 유지)
  let unit = null
  let school = null

  for (const standard of allStandards) {
    if (standard && standard.trim() !== '' && standard.trim() !== ' ') {
      const unitInfo = getUnitFromAchievement(standard)
      if (unitInfo) {
        unit = unitInfo.unit
        // 학년 정보를 기반으로 학교급 추정
        const grade = unitInfo.grade
        // 초등학교만 지원
        if (grade.includes('1학년') || grade.includes('2학년') || grade.includes('3학년') ||
            grade.includes('4학년') || grade.includes('5학년') || grade.includes('6학년')) {
          school = '초등학교'
        }
        break
      }
    }
  }

  // 영역이 추출되었다면 초등학교로 설정 (영역은 초등학교 기준)
  if (area && !school) {
    school = '초등학교'
  }

  return { unit, area, contentElement, school }
}

// JSON 파일 구조 감지 함수
function detectJSONStructure(jsonData: any): 'official' | 'legacy' | 'unknown' {
  // 공식 구조: raw_data_info, source_data_info, learning_data_info가 모두 있는 경우
  if (jsonData.raw_data_info && jsonData.source_data_info && jsonData.learning_data_info) {
    return 'official'
  }

  // 레거시 구조: 배열이거나 problems/data 속성이 있는 경우
  if (Array.isArray(jsonData) || jsonData.problems || jsonData.data) {
    return 'legacy'
  }

  return 'unknown'
}

// 공식 JSON 구조 처리
async function processOfficialProblem(problemData: OriginalProblemData): Promise<boolean> {
  try {
    const { raw_data_info, source_data_info, learning_data_info } = problemData
    const sourceId = source_data_info.source_data_name

    // 초등학교 데이터만 처리
    if (raw_data_info.school !== '초등학교') {
      console.log(`초등학교가 아닌 데이터 건너뜀: ${raw_data_info.school} - ${sourceId}`)
      return false
    }

    // 이미 존재하는 문제인지 확인
    const existingProblem = await prisma.problem.findUnique({
      where: { sourceId }
    })

    if (existingProblem) {
      return false // 건너뜀
    }

    // 성취기준에서 단원, 영역, 내용요소 및 학교 정보 추출
    const achievementStandards = parseAchievementStandards(source_data_info)
    const { unit, area, contentElement, school } = extractAreaAndSchoolInfo(achievementStandards)

    // 성취기준 처리 로깅
    const allStandards = [...achievementStandards["2015"], ...achievementStandards["2022"]]
    logAchievementProcessing(sourceId, {
      cleanedStandards: allStandards,
      validation: { isValid: true, validCodes: allStandards, invalidCodes: [], warnings: [] },
      shouldSkip: allStandards.length === 0
    })

    // 학습 데이터에서 문제 섹션 생성
    const sections = createProblemSectionsFromLearningData(learning_data_info)

    // 난이도 및 문제 유형 매핑
    const difficulty = mapDifficulty(source_data_info.level_of_difficulty)
    const problemType = mapProblemType(source_data_info.types_of_problems)

    // 이미지 URL 생성 (파일명 기반)
    let imageUrl = null
    const hasImageSection = learning_data_info.some(data =>
      data.class_name.includes('이미지') || data.class_name.includes('그림')
    )
    if (hasImageSection) {
      imageUrl = `/problems/${sourceId}.png`
    }

    // DB에 저장
    await prisma.problem.create({
      data: {
        sourceId,
        sourceDataName: source_data_info.source_data_name,
        grade: raw_data_info.grade,
        semester: raw_data_info.semester,
        subject: raw_data_info.subject,
        difficulty: difficulty,
        problemType: problemType,
        imageUrl: imageUrl,
        achievementStandards: achievementStandards,
        unit: unit,
        area: area,
        contentElement: contentElement,
        school: school || raw_data_info.school,
        sections: sections as any,
        metadata: {
          publisher: raw_data_info.publisher,
          publication_year: raw_data_info.publication_year,
          revision_year: raw_data_info.revision_year,
          date: raw_data_info.date,
          raw_data_name: raw_data_info.raw_data_name,
          imported_at: new Date().toISOString()
        }
      }
    })

    return true // 성공적으로 처리됨

  } catch (error) {
    console.error(`공식 데이터 처리 중 오류:`, error)
    return false
  }
}

// 레거시 JSON 구조 처리
async function processLegacyProblem(problemData: LegacyProblemData): Promise<boolean> {
  try {
    // 초등학교 데이터만 처리
    if (problemData.school && problemData.school !== '초등학교') {
      console.log(`초등학교가 아닌 레거시 데이터 건너뜀: ${problemData.school} - ${problemData.id}`)
      return false
    }

    // 이미 존재하는 문제인지 확인
    const existingProblem = await prisma.problem.findUnique({
      where: { sourceId: problemData.id }
    })

    if (existingProblem) {
      return false // 건너뜀
    }

    // 문제 데이터 변환
    const achievementStandards = parseAchievementStandards(problemData)
    const { unit: extractedUnit, area, contentElement } = extractAreaAndSchoolInfo(achievementStandards)

    // 성취기준 처리 로깅
    const allStandards = [...achievementStandards["2015"], ...achievementStandards["2022"]]
    logAchievementProcessing(problemData.id, {
      cleanedStandards: allStandards,
      validation: { isValid: true, validCodes: allStandards, invalidCodes: [], warnings: [] },
      shouldSkip: allStandards.length === 0
    })
    const sections = createLegacyProblemSections(problemData)
    const difficulty = mapDifficulty(problemData.level_of_difficulty || '중')
    const problemType = mapProblemType(problemData.types_of_problems || '주관식')

    // 이미지 경로 처리
    let imageUrl = null
    if (problemData.image_path) {
      imageUrl = `/problems/${problemData.id}.png`
    }

    // DB에 저장
    await prisma.problem.create({
      data: {
        sourceId: problemData.id,
        sourceDataName: problemData.source_data_name || '',
        grade: problemData.grade || '',
        semester: problemData.semester || '',
        subject: problemData.subject || '수학',
        difficulty: difficulty,
        problemType: problemType,
        imageUrl: imageUrl,
        achievementStandards: achievementStandards,
        unit: problemData.unit || extractedUnit || null,
        area: area,
        contentElement: contentElement,
        school: problemData.school || null,
        sections: sections as any,
        metadata: {
          original_data: problemData,
          imported_at: new Date().toISOString()
        }
      }
    })

    return true // 성공적으로 처리됨

  } catch (error) {
    console.error(`레거시 데이터 처리 중 오류:`, error)
    return false
  }
}

async function importProblemsFromJSON(jsonFilePath: string) {
  try {
    console.log(`JSON 파일 읽기: ${jsonFilePath}`)
    const jsonData = JSON.parse(readFileSync(jsonFilePath, 'utf-8'))

    const structure = detectJSONStructure(jsonData)
    console.log(`감지된 JSON 구조: ${structure}`)

    let importedCount = 0
    let skippedCount = 0
    let errorCount = 0

    if (structure === 'official') {
      // 단일 공식 구조 파일 처리
      const success = await processOfficialProblem(jsonData as OriginalProblemData)
      if (success) {
        importedCount++
      } else {
        skippedCount++
      }

    } else if (structure === 'legacy') {
      // 레거시 구조 (배열 또는 래핑된 구조) 처리
      let problems: LegacyProblemData[] = []

      if (Array.isArray(jsonData)) {
        problems = jsonData
      } else if (jsonData.problems && Array.isArray(jsonData.problems)) {
        problems = jsonData.problems
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        problems = jsonData.data
      }

      console.log(`총 ${problems.length}개의 문제를 발견했습니다.`)

      // 배치 처리로 성능 최적화
      const BATCH_SIZE = 100
      const batches: LegacyProblemData[][] = []

      for (let i = 0; i < problems.length; i += BATCH_SIZE) {
        batches.push(problems.slice(i, i + BATCH_SIZE))
      }

      console.log(`${batches.length}개 배치로 나누어 처리합니다.`)

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]!
        const batchStartTime = Date.now()

        console.log(`\n배치 ${batchIndex + 1}/${batches.length} 처리 중... (${batch.length}개 문제)`)

        // 트랜잭션으로 배치 처리
        try {
          await prisma.$transaction(async (tx) => {
            for (const problemData of batch) {
              try {
                // 이미 존재하는 문제인지 확인
                const existingProblem = await tx.problem.findUnique({
                  where: { sourceId: problemData.id }
                })

                if (existingProblem) {
                  skippedCount++
                  continue
                }

                // 문제 데이터 변환
                const achievementStandards = parseAchievementStandards(problemData)
                const { unit: extractedUnit, area } = extractAreaAndSchoolInfo(achievementStandards)
                const sections = createLegacyProblemSections(problemData)
                const difficulty = mapDifficulty(problemData.level_of_difficulty || '중')
                const problemType = mapProblemType(problemData.types_of_problems || '주관식')

                // 이미지 경로 처리
                let imageUrl = null
                if (problemData.image_path) {
                  imageUrl = `/problems/${problemData.id}.png`
                }

                // DB에 저장
                await tx.problem.create({
                  data: {
                    sourceId: problemData.id,
                    sourceDataName: problemData.source_data_name || '',
                    grade: problemData.grade || '',
                    semester: problemData.semester || '',
                    subject: problemData.subject || '수학',
                    difficulty: difficulty,
                    problemType: problemType,
                    imageUrl: imageUrl,
                    achievementStandards: achievementStandards,
                    unit: problemData.unit || extractedUnit || null,
                    area: area,
                    school: problemData.school || null,
                    sections: sections as any,
                    metadata: {
                      original_data: problemData,
                      imported_at: new Date().toISOString()
                    }
                  }
                })

                importedCount++

              } catch (error) {
                console.error(`문제 ${problemData.id} 처리 중 오류:`, error)
                errorCount++
              }
            }
          }, {
            timeout: 60000, // 60초 타임아웃
            maxWait: 5000,  // 최대 5초 대기
          })

          const batchTime = Date.now() - batchStartTime
          const avgTimePerItem = batchTime / batch.length
          const remainingBatches = batches.length - batchIndex - 1
          const estimatedTimeRemaining = Math.round((remainingBatches * batch.length * avgTimePerItem) / 1000)

          console.log(`배치 ${batchIndex + 1} 완료 (${batchTime}ms, 평균 ${avgTimePerItem.toFixed(1)}ms/문제)`)
          console.log(`진행률: ${importedCount + skippedCount + errorCount}/${problems.length} (${((importedCount + skippedCount + errorCount) / problems.length * 100).toFixed(1)}%)`)

          if (remainingBatches > 0) {
            console.log(`예상 남은 시간: ${estimatedTimeRemaining}초`)
          }

        } catch (batchError) {
          console.error(`배치 ${batchIndex + 1} 처리 중 오류:`, batchError)

          // 배치 실패 시 개별 처리로 폴백
          console.log('개별 처리로 폴백합니다...')
          for (const problemData of batch) {
            const success = await processLegacyProblem(problemData)
            if (success) {
              importedCount++
            } else {
              skippedCount++
            }
          }
        }

        // 메모리 관리를 위한 가비지 컬렉션 힌트
        if (global.gc && batchIndex % 5 === 0) {
          global.gc()
        }
      }

    } else {
      console.error('지원되지 않는 JSON 구조입니다.')
      return
    }

    console.log(`\n=== 파일 처리 완료 ===`)
    console.log(`- 새로 가져온 문제: ${importedCount}개`)
    console.log(`- 건너뛴 문제: ${skippedCount}개`)
    if (errorCount > 0) {
      console.log(`- 오류 발생: ${errorCount}개`)
    }

  } catch (error) {
    console.error('JSON 파일 처리 중 오류:', error)
  }
}

async function importProblemsFromDirectory(directoryPath: string) {
  try {
    console.log(`디렉토리 스캔: ${directoryPath}`)
    const files = readdirSync(directoryPath)

    const jsonFiles = files.filter(file =>
      file.endsWith('.json') && statSync(join(directoryPath, file)).isFile()
    )

    if (jsonFiles.length === 0) {
      console.log('JSON 파일을 찾을 수 없습니다.')
      return
    }

    console.log(`${jsonFiles.length}개의 JSON 파일을 발견했습니다:`)
    jsonFiles.forEach(file => console.log(`- ${file}`))

    for (const jsonFile of jsonFiles) {
      const filePath = join(directoryPath, jsonFile)
      console.log(`\n처리 중: ${jsonFile}`)
      await importProblemsFromJSON(filePath)
    }

  } catch (error) {
    console.error('디렉토리 처리 중 오류:', error)
  }
}

// 데이터베이스 연결 테스트
async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log('✓ 데이터베이스 연결 성공')

    // 테이블 존재 확인
    const tableExists = await prisma.problem.findFirst()
    console.log('✓ Problem 테이블 접근 가능')
    return true
  } catch (error) {
    console.error('✗ 데이터베이스 연결 실패:', error)
    console.log('\n해결 방법:')
    console.log('1. PostgreSQL이 실행 중인지 확인하세요')
    console.log('2. .env 파일의 DATABASE_URL을 확인하세요')
    console.log('3. npm run db:push 로 스키마를 적용하세요')
    return false
  }
}

// 통계 출력
async function printStatistics() {
  try {
    const totalProblems = await prisma.problem.count()
    const problemsByDifficulty = await prisma.problem.groupBy({
      by: ['difficulty'],
      _count: true
    })
    const problemsByGrade = await prisma.problem.groupBy({
      by: ['grade'],
      _count: true
    })

    console.log('\n=== 데이터베이스 통계 ===')
    console.log(`총 문제 수: ${totalProblems}개`)

    console.log('\n난이도별 분포:')
    problemsByDifficulty.forEach(item => {
      console.log(`- ${item.difficulty}: ${item._count}개`)
    })

    console.log('\n학년별 분포:')
    problemsByGrade.forEach(item => {
      console.log(`- ${item.grade}: ${item._count}개`)
    })

  } catch (error) {
    console.log('통계 정보를 가져올 수 없습니다:', error instanceof Error ? error.message : error)
  }
}

// 메인 실행 함수
async function main() {
  try {
    console.log('=== 문제은행 데이터 가져오기 시작 ===\n')

    // 데이터베이스 연결 테스트
    const isConnected = await testDatabaseConnection()
    if (!isConnected) {
      process.exit(1)
    }

    // 명령행 인수에서 경로 읽기
    const args = process.argv.slice(2)
    const dataPath = args[0] || './data'

    console.log(`\n데이터 경로: ${dataPath}`)

    // 경로 존재 확인
    if (!existsSync(dataPath)) {
      console.error(`경로가 존재하지 않습니다: ${dataPath}`)
      console.log('\n해결 방법:')
      console.log('1. 올바른 경로를 지정하세요')
      console.log('2. 데이터 디렉토리를 생성하세요: mkdir -p ./data')
      process.exit(1)
    }

    // 경로가 파일인지 디렉토리인지 확인
    const pathStat = statSync(dataPath)

    if (pathStat.isFile() && dataPath.endsWith('.json')) {
      // 단일 JSON 파일 처리
      await importProblemsFromJSON(dataPath)
    } else if (pathStat.isDirectory()) {
      // 디렉토리 내 모든 JSON 파일 처리
      await importProblemsFromDirectory(dataPath)
    } else {
      console.error('유효한 JSON 파일 또는 디렉토리 경로를 제공해주세요.')
      process.exit(1)
    }

    // 최종 통계 출력
    await printStatistics()

    console.log('\n=== 가져오기 완료 ===')

  } catch (error) {
    console.error('실행 중 오류:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
if (require.main === module) {
  main()
}

export { importProblemsFromJSON, importProblemsFromDirectory }