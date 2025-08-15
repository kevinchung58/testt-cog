"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";

interface Course {
  courseId: string;
  title: string;
  description: string;
  createdAt: string;
}

const TeacherDashboardPage = () => {
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchCreatedCourses = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`/api/users/${userId}/courses/created`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch created courses");

        const data = await response.json();
        setCourses(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatedCourses();
  }, [userId, getToken]);

  const handleManageCourse = (courseId: string) => {
    router.push(`/teacher/courses/${courseId}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <Button asChild>
          <Link href="/teacher/create">Create New Course</Link>
        </Button>
      </div>
      <p className="mb-6">
        Welcome, Teacher. Here you can manage the courses you have created.
      </p>

      {loading && <p>Loading your courses...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!loading && !error && (
        <Table>
          <TableCaption>A list of your created courses.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Title</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length > 0 ? (
              courses.map((course) => (
                <TableRow key={course.courseId}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>{new Date(course.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleManageCourse(course.courseId)}>Manage</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  You have not created any courses yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default TeacherDashboardPage;
