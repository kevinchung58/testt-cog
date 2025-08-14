import { getUserRole } from "@/lib/auth";
import { notFound } from "next/navigation";

export default function TeacherDashboardPage() {
  const role = getUserRole();

  // This page could be restricted to teachers and admins
  if (role !== "teacher" && role !== "admin") {
    notFound();
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teacher Dashboard</h1>
      <p>This is a placeholder for the teacher-specific dashboard content.</p>
    </div>
  );
}
