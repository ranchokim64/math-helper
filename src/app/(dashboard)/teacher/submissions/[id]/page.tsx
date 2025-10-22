import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { SubmissionViewer } from "@/components/grading/submission-viewer"

interface SubmissionPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SubmissionPage({ params }: SubmissionPageProps) {
  const session = await auth()
  const { id } = await params

  if (!session || session.user.role !== "TEACHER") {
    redirect("/login")
  }

  return <SubmissionViewer submissionId={id} />
}