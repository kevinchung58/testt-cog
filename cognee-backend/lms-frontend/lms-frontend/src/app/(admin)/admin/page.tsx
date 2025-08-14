import { getUserRole } from "@/lib/auth";
import { notFound } from "next/navigation";

export default function AdminDashboardPage() {
  const role = getUserRole();

  // Protect this route by checking for the 'admin' role
  if (role !== "admin") {
    // If the user is not an admin, render a 404 page.
    // This is a simple way to prevent access.
    // In a real app, you might redirect to a specific "unauthorized" page.
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p>Welcome, Admin! You have special privileges.</p>
      {/* Admin-specific components and data would go here */}
    </div>
  );
}
