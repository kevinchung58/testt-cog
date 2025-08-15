"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Lesson {
  lessonId: string;
  title: string;
  order: number;
}

interface PageProps {
  params: {
    courseId: string;
  };
}

const StudentCoursePage = ({ params }: PageProps) => {
  const { courseId } = params;
  const { getToken, userId } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchLessons = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`/api/courses/${courseId}/lessons`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch lessons for this course.");

        const data = await response.json();
        setLessons(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [userId, getToken, courseId]);

  return (
    <div className="p-6">
      <Link href="/student" className="text-blue-500 hover:underline mb-6 block">&larr; Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-4">Course Lessons</h1>

      {loading && <p>Loading lessons...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!loading && !error && (
        <div className="space-y-4">
          {lessons.length > 0 ? (
            lessons.map((lesson, index) => (
              <Card key={lesson.lessonId}>
                <CardHeader>
                  <CardTitle className="text-lg">Lesson {index + 1}: {lesson.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Lesson content will be displayed here.</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p>This course does not have any lessons yet. Please check back later.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentCoursePage;
