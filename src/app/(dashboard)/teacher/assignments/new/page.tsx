import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { CreateAssignment } from "@/components/assignment/create-assignment"

export default async function NewAssignmentPage() {
  const session = await auth()

  if (!session || session.user.role !== "TEACHER") {
    redirect("/login")
  }

  return <CreateAssignment />
}