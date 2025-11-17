/**
 * Test uploading a single file with Korean filename
 */

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join } from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function test() {
  console.log('🧪 Testing single file upload with Korean filename\n')

  const testFilename = 'S3_초등_3_008540.png'
  const filePath = join(process.cwd(), 'public', 'problems', testFilename)

  console.log(`1️⃣ Reading file: ${testFilename}`)
  const buffer = await readFile(filePath)
  console.log(`   File size: ${buffer.length} bytes\n`)

  // Method 1: Direct upload (will fail)
  console.log('2️⃣ Method 1: Direct upload with Korean filename')
  const { error: directError } = await supabase.storage
    .from('problems')
    .upload(testFilename, buffer, { contentType: 'image/png' })

  if (directError) {
    console.log('   ❌ Failed:', directError.message)
  } else {
    console.log('   ✅ Success!')
  }
  console.log()

  // Method 2: Base64 encoded filename
  console.log('3️⃣ Method 2: Base64 encoded filename')
  const nameWithoutExt = testFilename.replace('.png', '')
  const base64Name = Buffer.from(nameWithoutExt).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const safeFilename = `${base64Name}.png`
  console.log(`   Safe filename: ${safeFilename}`)

  const { data, error: base64Error } = await supabase.storage
    .from('problems')
    .upload(safeFilename, buffer, {
      contentType: 'image/png',
      upsert: true
    })

  if (base64Error) {
    console.log('   ❌ Failed:', base64Error.message)
  } else {
    console.log('   ✅ Success!')
    const { data: urlData } = supabase.storage
      .from('problems')
      .getPublicUrl(data.path)
    console.log('   Public URL:', urlData.publicUrl)
  }
}

test().catch(console.error)