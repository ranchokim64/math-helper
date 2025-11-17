/**
 * Script to upload problem images from local storage to Supabase Storage
 *
 * This script:
 * 1. Reads all problem images from public/images/problems directory
 * 2. Uploads them to Supabase Storage 'problems' bucket
 * 3. Updates the Problem table with new Supabase URLs
 *
 * Usage: npx tsx scripts/upload-images-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

console.log('--- .env 변수 값 확인 ---')
console.log('supabaseUrl:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('supabaseServiceRoleKey (앞 5글자):', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 5))
console.log('supabaseServiceRoleKey (Type):', typeof process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('---------------------------')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const prisma = new PrismaClient()

const PROBLEMS_DIR = join(process.cwd(), 'public', 'problems')
const BUCKET_NAME = 'problems'

async function uploadImageToSupabase(filename: string, buffer: Buffer): Promise<{ publicUrl: string; originalFilename: string }> {
  // Supabase Storage doesn't support non-ASCII characters (like Korean) in filenames
  // Use Base64 encoding to create a safe filename, keeping the .png extension
  const nameWithoutExt = filename.replace('.png', '')
  const base64Name = Buffer.from(nameWithoutExt).toString('base64')
    .replace(/\+/g, '-')  // Make URL-safe
    .replace(/\//g, '_')  // Make URL-safe
    .replace(/=/g, '')    // Remove padding
  const safeFilename = `${base64Name}.png`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(safeFilename, buffer, {
      contentType: 'image/png',
      upsert: true, // Overwrite if exists
    })

  if (error) {
    throw error
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  return {
    publicUrl: urlData.publicUrl,
    originalFilename: filename,
  }
}

async function main() {
  console.log('🚀 Starting problem images upload to Supabase...\n')

  try {
    // Check if bucket exists, if not create it
    console.log('📦 Checking if storage bucket exists...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      throw bucketsError
    }

    const bucketExists = buckets.some((b) => b.name === BUCKET_NAME)

    if (!bucketExists) {
      console.log(`📦 Creating '${BUCKET_NAME}' bucket...`)
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Make bucket public so images are accessible
        fileSizeLimit: 10485760, // 10MB limit per file
      })

      if (createError) {
        throw createError
      }
      console.log('✅ Bucket created successfully\n')
    } else {
      console.log('✅ Bucket already exists\n')
    }

    // Read all PNG files from problems directory
    console.log('📂 Reading problem images from local directory...')
    const files = await readdir(PROBLEMS_DIR)
    const imageFiles = files.filter(f => f.endsWith('.png'))
    console.log(`📸 Found ${imageFiles.length} image files\n`)

    // Upload images and track progress
    let successCount = 0
    let errorCount = 0
    const urlMap = new Map<string, string>() // filename -> supabase URL

    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i]
      const progress = `[${i + 1}/${imageFiles.length}]`

      try {
        // Read file
        const filePath = join(PROBLEMS_DIR, filename)
        const buffer = await readFile(filePath)

        // Upload to Supabase
        const result = await uploadImageToSupabase(filename, buffer)
        urlMap.set(result.originalFilename, result.publicUrl)

        successCount++
        if ((i + 1) % 100 === 0 || i === imageFiles.length - 1) {
          console.log(`${progress} ✅ Uploaded ${successCount} images...`)
        }
      } catch (error) {
        errorCount++
        console.error(`${progress} ❌ Failed to upload ${filename}:`, error)
      }
    }

    console.log(`\n📊 Upload Summary:`)
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Failed: ${errorCount}`)
    console.log(`   📦 Total: ${imageFiles.length}\n`)

    // Update database with new URLs
    console.log('🔄 Updating database with new Supabase URLs...')

    const problems = await prisma.problem.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
    })

    let dbUpdateCount = 0
    let dbErrorCount = 0

    for (const problem of problems) {
      if (!problem.imageUrl) continue

      // Extract filename from current URL (e.g., /images/problems/filename.png)
      const filename = problem.imageUrl.split('/').pop()
      if (!filename) continue

      const newUrl = urlMap.get(filename)
      if (!newUrl) {
        console.warn(`⚠️  No Supabase URL found for ${filename}`)
        continue
      }

      try {
        await prisma.problem.update({
          where: { id: problem.id },
          data: { imageUrl: newUrl },
        })
        dbUpdateCount++
      } catch (error) {
        dbErrorCount++
        console.error(`❌ Failed to update problem ${problem.id}:`, error)
      }
    }

    console.log(`\n📊 Database Update Summary:`)
    console.log(`   ✅ Updated: ${dbUpdateCount}`)
    console.log(`   ❌ Failed: ${dbErrorCount}`)
    console.log(`   📦 Total: ${problems.length}\n`)

    console.log('✨ Migration completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('   1. Verify images are accessible from Supabase Storage')
    console.log('   2. Test the application to ensure images load correctly')
    console.log('   3. You can now delete local images from public/images/problems')

  } catch (error) {
    console.error('❌ Error during migration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()