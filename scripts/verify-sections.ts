import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifySections() {
  const sourceIds = [
    'S3_초등_3_012564',
    'S3_초등_3_012465',
    'S3_초등_3_012464'
  ]

  for (const sourceId of sourceIds) {
    const problem = await prisma.problem.findUnique({
      where: { sourceId }
    })

    if (!problem) {
      console.log(`❌ Problem not found: ${sourceId}\n`)
      continue
    }

    console.log(`\n=== ${sourceId} ===`)
    console.log(`Database ID: ${problem.id}`)
    console.log(`Image URL: ${problem.imageUrl}`)

    const sections = problem.sections as any[]
    console.log(`Total sections: ${sections.length}`)

    const answerSections = sections.filter(s => s.type === 'answer' || s.type === 'explanation')
    console.log(`Answer/Explanation sections: ${answerSections.length}\n`)

    answerSections.forEach((section, idx) => {
      console.log(`Section ${idx + 1}:`)
      console.log(`  Type: ${section.type}`)
      console.log(`  Content: ${section.content?.substring(0, 50)}...`)
      console.log(`  BoundingBox exists: ${section.boundingBox ? 'YES' : 'NO'}`)

      if (section.boundingBox && Array.isArray(section.boundingBox)) {
        console.log(`  BoundingBox array length: ${section.boundingBox.length}`)
        if (section.boundingBox.length > 0) {
          const bbox = section.boundingBox[0]
          console.log(`  Coordinates: [${bbox.join(', ')}]`)
        }
      }
      console.log('')
    })
  }

  await prisma.$disconnect()
}

verifySections()
