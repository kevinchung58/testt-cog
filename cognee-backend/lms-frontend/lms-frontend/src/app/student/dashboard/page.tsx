import { getUserRole } from "@/lib/auth";
import { notFound } from "next/navigation";

export default function StudentDashboardPage() {
  const role = getUserRole();

  // A student should only see their own dashboard.
  // Admins might also have access for support reasons.
  if (role !== "student" && role !== "admin") {
    notFound();
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>
      <p>This is a placeholder for the student-specific dashboard content.</p>
    </div>
  );
}
