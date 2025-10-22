import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const PROBLEMS_TO_IMPORT = [
  'S3_초등_3_012564',
  'S3_초등_3_012465',
  'S3_초등_3_012464'
]

interface Section {
  type: string
  content: string
  position: number
  boundingBox?: number[][]
}

async function importProblems() {
  const problemsDir = path.join(process.cwd(), 'data', 'problems')

  for (const sourceId of PROBLEMS_TO_IMPORT) {
    const filePath = path.join(problemsDir, `${sourceId}.json`)

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`)
      continue
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    const sourceInfo = data.source_data_info
    const rawInfo = data.raw_data_info
    const learningData = data.learning_data_info

    // Extract sections
    const sections: Section[] = []
    let position = 0

    learningData.forEach((item: any) => {
      const className = item.class_name || ''
      let sectionType = 'content'

      if (className.includes('문항')) {
        sectionType = 'question'
      } else if (className.includes('정답')) {
        sectionType = 'answer'
      } else if (className.includes('해설')) {
        sectionType = 'explanation'
      }

      item.class_info_list?.forEach((info: any) => {
        const content = info.text_description || ''
        const boundingBox = info.Type === 'Bounding_Box' ? info.Type_value : undefined

        sections.push({
          type: sectionType,
          content,
          position: position++,
          boundingBox
        })
      })
    })

    // Find image file
    const pngPath = path.join(problemsDir, `${sourceId}.png`)
    const imageUrl = fs.existsSync(pngPath) ? `/problems/${sourceId}.png` : null

    // Prepare achievement standards
    const achievementStandards: Record<string, string[]> = {}
    if (sourceInfo['2015_achievement_standard']) {
      achievementStandards['2015'] = sourceInfo['2015_achievement_standard'].filter((s: string) => s.trim())
    }
    if (sourceInfo['2022_achievement_standard']) {
      achievementStandards['2022'] = sourceInfo['2022_achievement_standard'].filter((s: string) => s.trim())
    }

    // Create or update problem
    const problem = await prisma.problem.upsert({
      where: { sourceId },
      update: {
        sections,
        imageUrl,
        updatedAt: new Date()
      },
      create: {
        sourceId,
        sourceDataName: sourceInfo.source_data_name,
        grade: rawInfo.grade || '',
        semester: rawInfo.semester || '',
        subject: rawInfo.subject || '',
        difficulty: sourceInfo.level_of_difficulty || '중',
        problemType: sourceInfo.types_of_problems || '주관식',
        imageUrl,
        achievementStandards,
        school: rawInfo.school || '',
        sections,
        metadata: {
          publisher: rawInfo.publisher,
          publicationYear: rawInfo.publication_year,
          revisionYear: rawInfo.revision_year
        }
      }
    })

    const answerSections = sections.filter(s => s.type === 'answer' || s.type === 'explanation')
    console.log(`✅ Imported: ${sourceId}`)
    console.log(`   Sections: ${sections.length}, Answer/Explanation: ${answerSections.length}`)
    console.log(`   Image: ${imageUrl || 'None'}`)
    console.log('')
  }

  console.log('✅ Import complete!')
}

importProblems()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
