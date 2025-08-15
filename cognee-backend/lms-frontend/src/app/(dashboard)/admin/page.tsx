"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";

// Define types for the user data we expect from the backend
interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: {
    role?: "admin" | "teacher" | "student";
  };
}

const UserManagementTable = () => {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }

        const data = await response.json();
        setUsers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [getToken]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      // Update the user's role in the local state to reflect the change immediately
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, publicMetadata: { ...user.publicMetadata, role: newRole as any } }
            : user
        )
      );
      alert("Role updated successfully!");
    } catch (err: any) {
      alert(`Error updating role: ${err.message}`);
    }
  };

  if (loading) return <p>Loading users...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="w-full bg-gray-100 text-left">
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b">
              <td className="p-3">{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A"}</td>
              <td className="p-3">{user.emailAddresses[0]?.emailAddress || "No email"}</td>
              <td className="p-3">
                <select
                  defaultValue={user.publicMetadata.role || "student"}
                  id={`role-select-${user.id}`}
                  className="p-2 border rounded"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="p-3">
                <button
                  onClick={() => {
                    const select = document.getElementById(`role-select-${user.id}`) as HTMLSelectElement;
                    handleRoleChange(user.id, select.value);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Update
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


const AdminDashboardPage = () => {
  // Note: A server-side check could also be implemented here using the same
  // `auth()` helper from '@clerk/nextjs/server' for defense-in-depth,
  // but the primary protection for the API routes is what matters most for security.
  // The middleware already protects the page itself.

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p className="mb-6">
        Welcome, Administrator. Here you can manage user roles.
      </p>
      <UserManagementTable />
    </div>
  );
};

export default AdminDashboardPage;
