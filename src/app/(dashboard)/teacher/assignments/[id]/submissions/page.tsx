import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { AssignmentSubmissionsView } from "@/components/teacher/assignment-submissions-view"

interface AssignmentSubmissionsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AssignmentSubmissionsPage({ params }: AssignmentSubmissionsPageProps) {
  const session = await auth()
  const { id } = await params

  if (!session || session.user.role !== "TEACHER") {
    redirect("/login")
  }

  return <AssignmentSubmissionsView assignmentId={id} />
}
