import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { StudentDashboard } from "@/components/dashboard/student-dashboard"

export default async function StudentPage() {
  const session = await auth()

  if (!session || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  return <StudentDashboard />
}