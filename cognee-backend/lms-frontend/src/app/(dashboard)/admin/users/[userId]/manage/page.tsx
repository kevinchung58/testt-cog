"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMockUserById, getMockPermissions, updateMockUserMetadata } from "@/mocks/handlers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

// Types to match the mock handlers
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

const ManageUserPage = () => {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<ClerkUser | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [userData, permissionsData] = await Promise.all([
          getMockUserById(userId),
          getMockPermissions(),
        ]);

        if (!userData) {
          throw new Error("User not found");
        }

        setUser(userData);
        setAvailablePermissions(permissionsData);
        // Initialize form state
        setSelectedRole(userData.publicMetadata.role || "student");
        setSelectedPermissions(new Set(userData.publicMetadata.permissions || []));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setSelectedPermissions(prev => {
      const newPermissions = new Set(prev);
      if (checked) {
        newPermissions.add(permissionId);
      } else {
        newPermissions.delete(permissionId);
      }
      return newPermissions;
    });
  };

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateMockUserMetadata(user.id, {
        role: selectedRole,
        permissions: Array.from(selectedPermissions),
      });
      alert("User updated successfully!");
      router.push("/admin"); // Navigate back to the user list
    } catch (err: any) {
      alert(`Error updating user: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading user data...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!user) return <div className="p-6">User not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="outline" asChild>
            <Link href="/admin">← Back to User List</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage User: {user.firstName} {user.lastName}</CardTitle>
          <CardDescription>{user.emailAddresses[0]?.emailAddress}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Role</h3>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permissions Selection */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
              {availablePermissions.map(permission => (
                <div key={permission.id} className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id={permission.id}
                    checked={selectedPermissions.has(permission.id)}
                    onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex flex-col">
                    <label htmlFor={permission.id} className="font-medium">{permission.id}</label>
                    <p className="text-sm text-gray-500">{permission.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveChanges} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageUserPage;
