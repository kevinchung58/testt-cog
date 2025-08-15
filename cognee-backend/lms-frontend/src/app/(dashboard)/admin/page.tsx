"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { getMockUsers, updateMockUserRole } from "@/mocks/handlers";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
      // Use mock data in development to avoid dependency on the broken backend
      if (process.env.NODE_ENV === 'development') {
        try {
          const mockData = await getMockUsers();
          setUsers(mockData);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Original production logic
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
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      try {
        await updateMockUserRole(userId, newRole);
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId
              ? { ...user, publicMetadata: { ...user.publicMetadata, role: newRole as any } }
              : user
          )
        );
        alert("Mock role updated successfully!");
      } catch (err: any) {
        alert(`Error updating mock role: ${err.message}`);
      }
      return;
    }

    // Original production logic
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A"}</TableCell>
            <TableCell>{user.emailAddresses[0]?.emailAddress || "No email"}</TableCell>
            <TableCell>
              <Select
                defaultValue={user.publicMetadata.role || "student"}
                onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell className="text-right">
              {/* The Select component now handles the update on change, so a button is less necessary */}
              <span className="text-sm text-gray-500">Role updates automatically</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};


const AdminDashboardPage = () => {
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
