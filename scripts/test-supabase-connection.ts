/**
 * Test Supabase connection and Storage API
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

console.log('🔍 Supabase Connection Test\n')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('1️⃣ Environment Variables Check:')
console.log('   URL:', supabaseUrl)
console.log('   URL Length:', supabaseUrl?.length)
console.log('   Key (first 20 chars):', supabaseServiceRoleKey?.substring(0, 20))
console.log('   Key Length:', supabaseServiceRoleKey?.length)
console.log('   Key Type:', typeof supabaseServiceRoleKey)
console.log()

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

// Check for whitespace or quotes
if (supabaseUrl.includes(' ')) {
  console.error('❌ URL contains whitespace!')
}
if (supabaseServiceRoleKey.includes(' ')) {
  console.error('❌ Key contains whitespace!')
}
if (supabaseUrl.includes('"') || supabaseUrl.includes("'")) {
  console.error('❌ URL contains quotes!')
}
if (supabaseServiceRoleKey.includes('"') || supabaseServiceRoleKey.includes("'")) {
  console.error('❌ Key contains quotes!')
}

console.log('2️⃣ Creating Supabase Client...')
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
console.log('   ✅ Client created\n')

async function testConnection() {
  try {
    console.log('3️⃣ Testing Storage API - List Buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('   ❌ Error listing buckets:')
      console.error('   Error name:', bucketsError.name)
      console.error('   Error message:', bucketsError.message)
      console.error('   Full error:', JSON.stringify(bucketsError, null, 2))
      return
    }

    console.log('   ✅ Successfully listed buckets')
    console.log('   Found buckets:', buckets?.map(b => b.name).join(', ') || 'none')
    console.log()

    console.log('4️⃣ Testing Bucket Creation...')
    const testBucketName = 'test-bucket-' + Date.now()
    const { data: createData, error: createError } = await supabase.storage.createBucket(testBucketName, {
      public: true,
      fileSizeLimit: 10485760,
    })

    if (createError) {
      console.error('   ❌ Error creating bucket:')
      console.error('   Error message:', createError.message)
      console.error('   Full error:', JSON.stringify(createError, null, 2))
      return
    }

    console.log('   ✅ Successfully created test bucket:', testBucketName)
    console.log()

    console.log('5️⃣ Testing File Upload...')
    const testContent = Buffer.from('Hello, Supabase!')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(testBucketName)
      .upload('test.txt', testContent, {
        contentType: 'text/plain',
      })

    if (uploadError) {
      console.error('   ❌ Error uploading file:')
      console.error('   Error message:', uploadError.message)
      console.error('   Full error:', JSON.stringify(uploadError, null, 2))
      return
    }

    console.log('   ✅ Successfully uploaded test file')
    console.log()

    console.log('6️⃣ Cleaning up - Deleting test bucket...')
    const { error: deleteError } = await supabase.storage.deleteBucket(testBucketName)

    if (deleteError) {
      console.warn('   ⚠️  Could not delete test bucket (this is okay)')
    } else {
      console.log('   ✅ Test bucket deleted')
    }

    console.log()
    console.log('✨ All tests passed! Supabase Storage is working correctly.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testConnection()