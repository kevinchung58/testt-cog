"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { EnrollWithCodeForm } from "@/components/EnrollWithCodeForm";

interface Course {
  courseId: string;
  title: string;
  description: string;
}

const StudentDashboardPage = () => {
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrolledCourses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/users/${userId}/courses/enrolled`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!response.ok) throw new Error("Failed to fetch enrolled courses");

      const data = await response.json();
      setCourses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [fetchEnrolledCourses]);

  const handleGoToCourse = (courseId: string) => {
    router.push(`/student/courses/${courseId}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <Button asChild>
          <Link href="/courses">Browse Public Catalog</Link>
        </Button>
      </div>

      <div className="mb-8">
        <EnrollWithCodeForm onEnrollmentSuccess={fetchEnrolledCourses} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">My Enrolled Courses</h2>
        {loading && <p>Loading your courses...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && (
            <>
                {courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <Card key={course.courseId} className="flex flex-col">
                        <CardHeader>
                            <CardTitle>{course.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-gray-600">{course.description}</p>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => handleGoToCourse(course.courseId)}>Go to Course</Button>
                        </CardFooter>
                        </Card>
                    ))}
                    </div>
                ) : (
                    <div className="text-center p-8 border-dashed border-2 rounded-lg">
                        <p>You are not enrolled in any courses yet.</p>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboardPage;
