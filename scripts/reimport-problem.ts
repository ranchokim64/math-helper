import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface Section {
  type: string
  content: string
  position: number
  boundingBox?: number[][]
}

async function reimportProblem() {
  const sourceId = 'S3_초등_6_010432'
  const problemsDir = path.join(process.cwd(), 'data', 'problems')
  const filePath = path.join(problemsDir, `${sourceId}.json`)

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(fileContent)

  const sourceInfo = data.source_data_info
  const rawInfo = data.raw_data_info
  const learningData = data.learning_data_info

  console.log('Parsing sections...')

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

    console.log(`\nProcessing: ${className} -> type: ${sectionType}`)

    item.class_info_list?.forEach((info: any, idx: number) => {
      const content = info.text_description || ''
      const boundingBox = info.Type === 'Bounding_Box' ? info.Type_value : undefined

      console.log(`  Item ${idx + 1}:`)
      console.log(`    Content: ${content.substring(0, 50)}...`)
      console.log(`    Has boundingBox: ${!!boundingBox}`)
      if (boundingBox) {
        console.log(`    BoundingBox: ${JSON.stringify(boundingBox)}`)
      }

      sections.push({
        type: sectionType,
        content,
        position: position++,
        boundingBox
      })
    })
  })

  console.log(`\n\nTotal sections created: ${sections.length}`)
  const answerSections = sections.filter(s => s.type === 'answer' || s.type === 'explanation')
  console.log(`Answer/Explanation sections: ${answerSections.length}`)

  answerSections.forEach((s, i) => {
    console.log(`\nAnswer/Explanation ${i + 1}:`)
    console.log(`  Type: ${s.type}`)
    console.log(`  Has boundingBox: ${!!s.boundingBox}`)
    if (s.boundingBox) {
      console.log(`  BoundingBox: ${JSON.stringify(s.boundingBox)}`)
    }
  })

  // Find image file
  const pngPath = path.join(process.cwd(), 'public', 'problems', `${sourceId}.png`)
  const imageUrl = fs.existsSync(pngPath) ? `/problems/${sourceId}.png` : null

  console.log(`\nImage URL: ${imageUrl}`)

  // Prepare achievement standards
  const achievementStandards: Record<string, string[]> = {}
  if (sourceInfo['2015_achievement_standard']) {
    achievementStandards['2015'] = sourceInfo['2015_achievement_standard'].filter((s: string) => s.trim())
  }
  if (sourceInfo['2022_achievement_standard']) {
    achievementStandards['2022'] = sourceInfo['2022_achievement_standard'].filter((s: string) => s.trim())
  }

  // Update problem
  const problem = await prisma.problem.update({
    where: { sourceId },
    data: {
      sections,
      imageUrl,
      updatedAt: new Date()
    }
  })

  console.log(`\n✅ Re-imported: ${sourceId}`)
  console.log(`   Database ID: ${problem.id}`)

  // Verify
  const verifyProblem = await prisma.problem.findUnique({
    where: { sourceId }
  })

  if (verifyProblem) {
    const verifySections = verifyProblem.sections as any[]
    const verifyAnswerSections = verifySections.filter(s => s.type === 'answer' || s.type === 'explanation')

    console.log(`\n✅ Verification:`)
    console.log(`   Total sections: ${verifySections.length}`)
    console.log(`   Answer/Explanation sections: ${verifyAnswerSections.length}`)

    verifyAnswerSections.forEach((s, i) => {
      console.log(`\n   Section ${i + 1}:`)
      console.log(`     Type: ${s.type}`)
      console.log(`     Has boundingBox: ${!!s.boundingBox}`)
      if (s.boundingBox) {
        console.log(`     BoundingBox: ${JSON.stringify(s.boundingBox)}`)
      }
    })
  }
}

reimportProblem()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
