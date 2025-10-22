const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Checking problem data in database...')

    // Get the specific problem we just imported
    const problem = await prisma.problem.findUnique({
      where: { sourceId: 'S3_초등_3_008540' }
    })

    if (problem) {
      console.log('Sample problem found:')
      console.log('Source ID:', problem.sourceId)
      console.log('Grade:', problem.grade)
      console.log('Difficulty:', problem.difficulty)
      console.log('Problem Type:', problem.problemType)
      console.log('Image URL:', problem.imageUrl)
      console.log('Metadata:', JSON.stringify(problem.metadata, null, 2))
      console.log('Achievement Standards:', JSON.stringify(problem.achievementStandards, null, 2))

      // Check sections for Bounding Box info
      console.log('\n=== SECTIONS ANALYSIS ===')
      const sections = problem.sections
      if (Array.isArray(sections)) {
        sections.forEach((section, idx) => {
          console.log(`Section ${idx}:`)
          console.log('  Type:', section.type)
          console.log('  Content:', section.content?.substring(0, 100) + '...')
          console.log('  Position:', section.position)

          // Check for Bounding Box data
          if (section.Type_value) {
            console.log('  ✅ Bounding Box found:', section.Type_value)
          } else if (section.boundingBox) {
            console.log('  ✅ BoundingBox found:', section.boundingBox)
          } else if (section.coordinates) {
            console.log('  ✅ Coordinates found:', section.coordinates)
          } else {
            console.log('  ❌ No coordinate data found')
          }
          console.log('  Full section keys:', Object.keys(section))
          console.log('')
        })
      } else {
        console.log('Sections is not an array:', typeof sections)
      }
    } else {
      console.log('No problems found in database')
    }

    // Check if we have any assignments
    const assignment = await prisma.assignment.findFirst({
      include: {
        class: true
      }
    })

    if (assignment) {
      console.log('\nSample assignment found:')
      console.log('ID:', assignment.id)
      console.log('Title:', assignment.title)
      console.log('Problems JSON:', JSON.stringify(assignment.problems, null, 2))
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()