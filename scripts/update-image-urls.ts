import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const PROBLEMS_TO_UPDATE = [
  'S3_초등_3_012564',
  'S3_초등_3_012465',
  'S3_초등_3_012464'
]

async function updateImageUrls() {
  const publicDir = path.join(process.cwd(), 'public', 'problems')

  for (const sourceId of PROBLEMS_TO_UPDATE) {
    const pngPath = path.join(publicDir, `${sourceId}.png`)

    if (fs.existsSync(pngPath)) {
      await prisma.problem.update({
        where: { sourceId },
        data: {
          imageUrl: `/problems/${sourceId}.png`
        }
      })
      console.log(`✅ Updated imageUrl for ${sourceId}`)
    } else {
      console.log(`⚠️  PNG file not found: ${pngPath}`)
    }
  }

  console.log('\n✅ Update complete!')
}

updateImageUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
