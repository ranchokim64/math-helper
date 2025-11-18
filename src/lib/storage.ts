import { supabaseAdmin, STORAGE_BUCKETS } from './supabase'

/**
 * Save a recording file to Supabase Storage
 * @param buffer - File buffer (from file.arrayBuffer())
 * @param filename - Desired filename (will be sanitized)
 * @returns Public URL to access the saved file
 */
export async function saveRecordingFile(
  buffer: ArrayBuffer,
  filename: string
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not initialized')
  }

  try {
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.RECORDINGS)
      .upload(sanitizedFilename, buffer, {
        contentType: 'video/webm',
        upsert: false, // Prevent overwriting existing files
      })

    if (error) {
      throw error
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKETS.RECORDINGS)
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error saving recording file:', error)
    throw new Error(`Failed to save recording file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a unique filename for a recording
 * @param studentId - Student ID
 * @param assignmentId - Assignment ID
 * @param problemIndex - Problem index (0-based)
 * @returns Unique filename with timestamp
 */
export function generateRecordingFilename(
  studentId: string,
  assignmentId: string,
  problemIndex: number
): string {
  const timestamp = Date.now()
  return `${studentId}-${assignmentId}-problem_${problemIndex}-${timestamp}.webm`
}

/**
 * Save a submission image file to Supabase Storage
 * @param buffer - Image buffer (from blob.arrayBuffer())
 * @param filename - Desired filename (will be sanitized)
 * @returns Public URL to access the saved image
 */
export async function saveSubmissionImage(
  buffer: ArrayBuffer,
  filename: string
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not initialized')
  }

  try {
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.SUBMISSIONS)
      .upload(sanitizedFilename, buffer, {
        contentType: 'image/png', // PNG 형식으로 투명도 지원
        upsert: false, // Prevent overwriting existing files
      })

    if (error) {
      throw error
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKETS.SUBMISSIONS)
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error saving submission image:', error)
    throw new Error(`Failed to save submission image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a unique filename for a submission image
 * @param studentId - Student ID
 * @param assignmentId - Assignment ID
 * @param problemIndex - Problem index (0-based)
 * @returns Unique filename with timestamp
 */
export function generateSubmissionImageFilename(
  studentId: string,
  assignmentId: string,
  problemIndex: number
): string {
  const timestamp = Date.now()
  return `${studentId}-${assignmentId}-problem_${problemIndex}-${timestamp}.png`
}
