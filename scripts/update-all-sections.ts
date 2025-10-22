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

async function updateAllSections() {
  try {
    console.log('🔍 Fetching all problems from database...\n')

    const allProblems = await prisma.problem.findMany({
      select: {
        id: true,
        sourceId: true
      }
    })

    console.log(`📊 Total problems to update: ${allProblems.length}\n`)

    const problemsDir = path.join(process.cwd(), 'data', 'problems')
    let successCount = 0
    let failCount = 0
    let withBoundingBoxCount = 0

    for (let i = 0; i < allProblems.length; i++) {
      const problem = allProblems[i]
      const progress = ((i + 1) / allProblems.length * 100).toFixed(1)

      console.log(`[${i + 1}/${allProblems.length}] (${progress}%) Processing: ${problem.sourceId}`)

      const jsonPath = path.join(problemsDir, `${problem.sourceId}.json`)

      if (!fs.existsSync(jsonPath)) {
        console.log(`  ⚠️  JSON file not found, skipping...`)
        failCount++
        continue
      }

      try {
        const fileContent = fs.readFileSync(jsonPath, 'utf-8')
        const data = JSON.parse(fileContent)
        const learningData = data.learning_data_info

        if (!learningData || !Array.isArray(learningData)) {
          console.log(`  ⚠️  No learning_data_info found, skipping...`)
          failCount++
          continue
        }

        // Extract sections with boundingBox
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

        // Count answer/explanation sections with boundingBox
        const answerSections = sections.filter(s =>
          (s.type === 'answer' || s.type === 'explanation') && s.boundingBox
        )

        // Update only sections field
        await prisma.problem.update({
          where: { id: problem.id },
          data: {
            sections,
            updatedAt: new Date()
          }
        })

        console.log(`  ✅ Updated: ${sections.length} sections, ${answerSections.length} answer/explanation with boundingBox`)

        if (answerSections.length > 0) {
          withBoundingBoxCount++
        }

        successCount++

      } catch (error) {
        console.log(`  ❌ Error processing: ${error instanceof Error ? error.message : 'Unknown error'}`)
        failCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 Update Summary')
    console.log('='.repeat(60))
    console.log(`Total problems: ${allProblems.length}`)
    console.log(`✅ Successfully updated: ${successCount}`)
    console.log(`❌ Failed: ${failCount}`)
    console.log(`🎯 Problems with answer/explanation boundingBox: ${withBoundingBoxCount}`)
    console.log('='.repeat(60))

    // Verification
    console.log('\n🔍 Verification: Checking random samples...\n')

    const sampleProblems = await prisma.problem.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' }
    })

    for (const sample of sampleProblems) {
      const sections = sample.sections as any[]
      const answerSections = sections?.filter(s => s.type === 'answer' || s.type === 'explanation') || []
      const withBbox = answerSections.filter(s => s.boundingBox).length

      console.log(`${sample.sourceId}:`)
      console.log(`  Total sections: ${sections?.length || 0}`)
      console.log(`  Answer/Explanation: ${answerSections.length}`)
      console.log(`  With boundingBox: ${withBbox}`)
    }

  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

console.log('🚀 Starting sections update for all problems...\n')
updateAllSections()
