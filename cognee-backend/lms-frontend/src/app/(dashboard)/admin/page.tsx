"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { getMockUsers, getMockPermissions, updateMockUserMetadata } from "@/mocks/handlers";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Updated type to include permissions
interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: {
    role?: "admin" | "teacher" | "student";
    permissions?: string[];
  };
}

interface Permission {
    id: string;
    description: string;
}

const UserManagementTable = () => {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the (future) modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClerkUser | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // We are forcing mock data usage for this exercise
      try {
        const [usersData, permissionsData] = await Promise.all([
            getMockUsers(),
            getMockPermissions()
        ]);
        setUsers(usersData);
        setPermissions(permissionsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleOpenManageModal = (user: ClerkUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    // In a real app, the modal component would handle its own visibility.
    // For now, we'll just log it.
    console.log("Opening modal for user:", user.id);
    alert(`Imagine a modal opening for ${user.firstName} with ${user.publicMetadata.permissions?.length || 0} permissions.`);
  };

  // This function would be passed to the modal
  const handleUpdateUser = async (userId: string, data: { role?: string, permissions?: string[] }) => {
    try {
      const updatedUser = await updateMockUserMetadata(userId, data);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? updatedUser : user
        )
      );
      // In a real app, you'd show a toast notification
      alert("User updated successfully!");
    } catch (err: any) {
      alert(`Error updating user: ${err.message}`);
    }
  };

  if (loading) return <p>Loading users...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <>
      {/* The modal is being replaced by a dedicated page. This placeholder can be removed. */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A"}</TableCell>
              <TableCell>{user.emailAddresses[0]?.emailAddress || "No email"}</TableCell>
              <TableCell>
                <span className="font-semibold capitalize">{user.publicMetadata.role || "N/A"}</span>
              </TableCell>
              <TableCell>{user.publicMetadata.permissions?.length || 0} assigned</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline">
                    <Link href={`/admin/users/${user.id}/manage`}>Manage</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
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
