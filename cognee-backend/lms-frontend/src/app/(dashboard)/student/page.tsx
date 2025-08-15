"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import { getMockEnrolledCourses, getMockLessons, getMockStudentProgress } from "@/mocks/handlers";
import { Button } from "@/components/ui/button";
import { CourseProgressCard } from "@/components/CourseProgressCard";
import { useRouter } from "next/navigation";
import { EnrollWithCodeForm } from "@/components/EnrollWithCodeForm";

interface Course {
  courseId: string;
  title: string;
  description: string;
}

interface CourseWithProgress extends Course {
  progress: {
    totalLessons: number;
    completedLessons: number;
  };
}

const StudentDashboardPage = () => {
  const { userId } = useAuth();
  const router = useRouter();
  const [coursesWithProgress, setCoursesWithProgress] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Fetch enrolled courses
      const enrolledCourses = await getMockEnrolledCourses(userId);

      // 2. For each course, fetch its lessons and the student's progress
      const coursesData = await Promise.all(
        enrolledCourses.map(async (course) => {
          const [lessons, progress] = await Promise.all([
            getMockLessons(course.courseId),
            getMockStudentProgress(userId, course.courseId),
          ]);
          return {
            ...course,
            progress: {
              totalLessons: lessons.length,
              completedLessons: progress.completedLessons.length,
            },
          };
        })
      );

      setCoursesWithProgress(coursesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleGoToCourse = (courseId: string) => {
    // This could navigate to a specific course page for the student
    // For now, it's just a placeholder.
    router.push(`/courses/${courseId}`);
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
        <EnrollWithCodeForm onEnrollmentSuccess={fetchDashboardData} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">My Enrolled Courses</h2>
        {loading && <p>Loading your courses...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && (
            <>
                {coursesWithProgress.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coursesWithProgress.map((course) => (
                        <CourseProgressCard
                            key={course.courseId}
                            course={course}
                            progress={course.progress}
                            onGoToCourse={handleGoToCourse}
                        />
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
