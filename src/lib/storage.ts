import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Save a recording file to the public/recordings directory
 * @param buffer - File buffer (from file.arrayBuffer())
 * @param filename - Desired filename (will be sanitized)
 * @returns URL path to access the saved file
 */
export async function saveRecordingFile(
  buffer: ArrayBuffer,
  filename: string
): Promise<string> {
  try {
    // Define the recordings directory path
    const recordingsDir = join(process.cwd(), 'public', 'recordings')

    // Create directory if it doesn't exist
    if (!existsSync(recordingsDir)) {
      await mkdir(recordingsDir, { recursive: true })
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')

    // Full file path
    const filePath = join(recordingsDir, sanitizedFilename)

    // Convert ArrayBuffer to Buffer and write to disk
    const nodeBuffer = Buffer.from(buffer)
    await writeFile(filePath, nodeBuffer)

    // Return the public URL path
    return `/recordings/${sanitizedFilename}`
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
 * Save a submission image file to the public/submissions directory
 * @param buffer - Image buffer (from blob.arrayBuffer())
 * @param filename - Desired filename (will be sanitized)
 * @returns URL path to access the saved image
 */
export async function saveSubmissionImage(
  buffer: ArrayBuffer,
  filename: string
): Promise<string> {
  try {
    // Define the submissions directory path
    const submissionsDir = join(process.cwd(), 'public', 'submissions')

    // Create directory if it doesn't exist
    if (!existsSync(submissionsDir)) {
      await mkdir(submissionsDir, { recursive: true })
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')

    // Full file path
    const filePath = join(submissionsDir, sanitizedFilename)

    // Convert ArrayBuffer to Buffer and write to disk
    const nodeBuffer = Buffer.from(buffer)
    await writeFile(filePath, nodeBuffer)

    // Return the public URL path
    return `/submissions/${sanitizedFilename}`
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
  return `${studentId}-${assignmentId}-problem_${problemIndex}-${timestamp}.jpg`
}
