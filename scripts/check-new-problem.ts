import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkNewProblem() {
  // 새로 추가한 문제 확인
  const problem = await prisma.problem.findUnique({
    where: { sourceId: 'S3_초등_6_010432' }
  })

  if (problem) {
    console.log('✅ Problem found in database')
    console.log('SourceId:', problem.sourceId)
    console.log('ImageUrl:', problem.imageUrl)

    const sections = problem.sections as any[]
    console.log('Total sections:', sections?.length || 0)

    const answerSections = sections?.filter(s => s.type === 'answer' || s.type === 'explanation') || []
    console.log('Answer/Explanation sections:', answerSections.length)

    if (answerSections.length > 0) {
      answerSections.forEach((s, i) => {
        console.log(`\nSection ${i + 1}:`)
        console.log('  Type:', s.type)
        console.log('  Has BoundingBox:', !!s.boundingBox)
        if (s.boundingBox) {
          console.log('  BoundingBox:', JSON.stringify(s.boundingBox))
        }
      })
    }
  } else {
    console.log('❌ Problem NOT found in database: S3_초등_6_010432')
    console.log('This problem needs to be imported.')
  }

  // ranchokim64@gmail.com의 모든 과제 확인
  const user = await prisma.user.findUnique({
    where: { email: 'ranchokim64@gmail.com' }
  })

  if (user) {
    console.log('\n\n=== Assignments for ranchokim64@gmail.com ===')

    const submissions = await prisma.submission.findMany({
      where: { studentId: user.id },
      include: { assignment: true }
    })

    for (const submission of submissions) {
      console.log(`\nAssignment: ${submission.assignment.title}`)
      const problems = submission.assignment.problems as any[]
      console.log('Problem IDs:', problems.map(p => p.id).join(', '))
    }
  }

  await prisma.$disconnect()
}

checkNewProblem()
