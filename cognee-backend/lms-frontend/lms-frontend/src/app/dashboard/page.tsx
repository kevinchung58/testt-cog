import { UserButton } from "@clerk/nextjs";
import { getUserRole } from "@/lib/auth";
import Link from "next/link";

export default function DashboardPage() {
  const role = getUserRole();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <UserButton afterSignOutUrl="/" />
      </div>

      <p className="mb-4">Welcome to your dashboard. Your role is: <strong>{role}</strong>.</p>

      {/* Conditionally render a link to the admin page */}
      {role === "admin" && (
        <div className="mt-6 p-4 border border-red-500 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600">Admin Area</h2>
          <p className="mb-2">You have access to the admin dashboard.</p>
          <Link href="/admin" className="text-blue-500 hover:underline">
            Go to Admin Dashboard
          </Link>
        </div>
      )}

      {role === "teacher" && (
        <div className="mt-6 p-4 border border-blue-500 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-600">Teacher Area</h2>
          <p>Teacher-specific content would go here.</p>
        </div>
      )}

      {role === "student" && (
        <div className="mt-6 p-4 border border-green-500 rounded-lg">
          <h2 className="text-xl font-semibold text-green-600">Student Area</h2>
          <p>Student-specific content would go here.</p>
        </div>
      )}
    </div>
  );
}
