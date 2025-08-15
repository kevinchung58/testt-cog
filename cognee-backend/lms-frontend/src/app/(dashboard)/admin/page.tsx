import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const AdminDashboardPage = () => {
  const { sessionClaims } = auth();

  // This is a server-side check. If the user is not an admin,
  // they will be redirected. This is a secure way to protect routes.
  if (sessionClaims?.metadata.role !== "admin") {
    // Redirect to a more appropriate page, like the main dashboard
    redirect("/dashboard");
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p>
        Welcome, Administrator. This page is protected and only visible to
        users with the &quot;admin&quot; role.
      </p>
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold">Admin-Only Content</h2>
        <p className="mt-2">
          Here you would typically find user management tools, site analytics,
          and other administrative functions.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
