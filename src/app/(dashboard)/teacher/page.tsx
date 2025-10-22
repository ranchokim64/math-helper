import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard"

export default async function TeacherPage() {
  const session = await auth()

  if (!session || session.user.role !== "TEACHER") {
    redirect("/login")
  }

  return <TeacherDashboard />
}