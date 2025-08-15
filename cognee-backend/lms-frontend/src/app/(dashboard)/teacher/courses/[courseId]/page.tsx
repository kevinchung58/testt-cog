"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

const CourseManagementPage = ({ params }: PageProps) => {
  const { courseId } = params;
  const { getToken, userId } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the "Add Lesson" form
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonContent, setNewLessonContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchLessons = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`/api/courses/${courseId}/lessons`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch lessons");

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

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);

    try {
        const token = await getToken();
        const response = await fetch(`/api/courses/${courseId}/lessons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title: newLessonTitle, content: newLessonContent }),
        });

        if (!response.ok) {
            throw new Error('Failed to create lesson');
        }

        const newLesson = await response.json();
        setLessons(prevLessons => [...prevLessons, newLesson].sort((a, b) => a.order - b.order));
        setNewLessonTitle('');
        setNewLessonContent('');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsAdding(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Course</h1>
      <p className="text-sm text-gray-500 mb-6">Course ID: {courseId}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Lessons</h2>
          {loading && <p>Loading lessons...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!loading && !error && (
            <ul className="space-y-2">
              {lessons.map(lesson => (
                <li key={lesson.lessonId} className="p-3 border rounded-lg flex justify-between items-center">
                  <span>{lesson.title}</span>
                  <Button variant="outline" size="sm">Edit</Button>
                </li>
              ))}
              {lessons.length === 0 && <p>No lessons yet. Add one to get started!</p>}
            </ul>
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Add New Lesson</h2>
          <form onSubmit={handleAddLesson} className="p-4 border rounded-lg bg-gray-50 space-y-4">
            <div>
              <label htmlFor="lesson-title" className="block text-sm font-medium mb-1">Title</label>
              <Input
                id="lesson-title"
                value={newLessonTitle}
                onChange={e => setNewLessonTitle(e.target.value)}
                placeholder="e.g., Introduction to..."
                required
              />
            </div>
            <div>
              <label htmlFor="lesson-content" className="block text-sm font-medium mb-1">Content</label>
              <Textarea
                id="lesson-content"
                value={newLessonContent}
                onChange={e => setNewLessonContent(e.target.value)}
                placeholder="Write the lesson content here..."
                rows={5}
              />
            </div>
            <Button type="submit" disabled={isAdding} className="w-full">
              {isAdding ? "Adding..." : "Add Lesson"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CourseManagementPage;
