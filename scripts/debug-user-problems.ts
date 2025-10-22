import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugUserProblems() {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'ranchokim64@gmail.com' }
    })

    if (!user) {
      console.log('❌ User not found: ranchokim64@gmail.com')
      return
    }

    console.log('✅ User found:', user.id, user.name)

    // Find their assignments
    const submissions = await prisma.submission.findMany({
      where: { studentId: user.id },
      include: {
        assignment: true
      }
    })

    console.log(`\n📋 Found ${submissions.length} submissions\n`)

    for (const submission of submissions) {
      console.log(`=== Assignment: ${submission.assignment.title} ===`)
      console.log(`Assignment ID: ${submission.assignment.id}`)

      // Parse problems JSON
      const problemsData = submission.assignment.problems as any[]
      console.log(`Problems count: ${problemsData.length}\n`)

      for (const problemData of problemsData) {
        const problemId = problemData.id

        // Fetch actual problem from database
        const problem = await prisma.problem.findUnique({
          where: { id: problemId }
        })

        if (!problem) {
          console.log(`❌ Problem not found: ${problemId}\n`)
          continue
        }

        console.log(`Problem: ${problem.id}`)
        console.log(`  SourceId: ${problem.sourceId}`)
        console.log(`  Sections count: ${problem.sections ? (problem.sections as any[]).length : 0}`)

        if (problem.sections) {
          const sections = problem.sections as any[]
          const answerSections = sections.filter(s => s.type === 'answer' || s.type === 'explanation')

          console.log(`  Answer/Explanation sections: ${answerSections.length}`)

          if (answerSections.length > 0) {
            answerSections.forEach(section => {
              console.log(`    - Type: ${section.type}`)
              console.log(`      BoundingBox: ${section.boundingBox ? 'YES' : 'NO'}`)
              if (section.boundingBox && Array.isArray(section.boundingBox)) {
                console.log(`      BoundingBox length: ${section.boundingBox.length}`)
                if (section.boundingBox.length > 0) {
                  console.log(`      First bbox: [${section.boundingBox[0].join(', ')}]`)
                }
              }
            })
          } else {
            console.log(`    ⚠️  NO answer/explanation sections found!`)
          }
        } else {
          console.log(`  ⚠️  NO sections data at all!`)
        }
        console.log('')
      }
    }

    // Also check student@test.com for comparison
    console.log('\n\n=== COMPARISON: student@test.com ===\n')

    const studentTest = await prisma.user.findUnique({
      where: { email: 'student@test.com' }
    })

    if (studentTest) {
      const testSubmissions = await prisma.submission.findMany({
        where: { studentId: studentTest.id },
        include: {
          assignment: true
        }
      })

      console.log(`✅ Found ${testSubmissions.length} submissions for student@test.com\n`)

      for (const submission of testSubmissions) {
        console.log(`Assignment: ${submission.assignment.title}`)
        const problemsData = submission.assignment.problems as any[]
        console.log(`Problems count: ${problemsData.length}`)

        for (const problemData of problemsData) {
          const problem = await prisma.problem.findUnique({
            where: { id: problemData.id }
          })

          if (!problem) continue

          const sections = problem.sections as any[] | null
          const answerSections = sections?.filter(s => s.type === 'answer' || s.type === 'explanation') || []

          console.log(`  ${problem.sourceId}: ${answerSections.length} answer/explanation sections`)
        }
        console.log('')
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugUserProblems()
