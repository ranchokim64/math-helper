import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { AssignmentSolver } from "@/components/assignment/assignment-solver"

interface AssignmentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const session = await auth()
  const { id } = await params

  if (!session || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  return <AssignmentSolver assignmentId={id} studentId={session.user.id} />
}