'use client'

import { CreateAssignment } from '@/components/assignment/create-assignment'
import { useParams } from 'next/navigation'

export default function EditAssignmentPage() {
  const params = useParams()
  const assignmentId = params?.id as string

  return (
    <CreateAssignment
      assignmentId={assignmentId}
      mode="edit"
    />
  )
}