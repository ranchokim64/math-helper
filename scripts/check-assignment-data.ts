import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAssignment() {
  const assignment = await prisma.assignment.findUnique({
    where: { id: 'cmfw4hzfc0003uefk66dv9hyf' } // 구구단 assignment
  })

  if (assignment) {
    console.log('Assignment:', assignment.title)
    console.log('Problems JSON:', JSON.stringify(assignment.problems, null, 2))
  }

  // Also check if problems exist in database
  const problem1 = await prisma.problem.findUnique({
    where: { sourceId: 'S3_초등_3_012564' }
  })

  console.log('\nProblem S3_초등_3_012564 in database:', problem1 ? 'YES' : 'NO')
  if (problem1) {
    console.log('  ID:', problem1.id)
    console.log('  SourceId:', problem1.sourceId)
    console.log('  ImageUrl:', problem1.imageUrl)
    const sections = problem1.sections as any[]
    console.log('  Sections:', sections.length)
    const answerSections = sections.filter(s => s.type === 'answer' || s.type === 'explanation')
    console.log('  Answer/Explanation sections:', answerSections.length)
  }

  await prisma.$disconnect()
}

checkAssignment()
