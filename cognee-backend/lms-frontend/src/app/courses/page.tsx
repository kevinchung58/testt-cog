import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

// Define the shape of a course object
interface Course {
  courseId: string;
  title: string;
  description: string;
  authorId: string;
  createdAt: string;
}

async function getCourses(): Promise<Course[]> {
  try {
    // This fetch is server-to-server, so we need the full internal URL if running in containers
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/courses`, {
      cache: 'no-store', // Don't cache course list
    });
    if (!response.ok) {
      throw new Error('Failed to fetch courses');
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching courses for catalog:", error);
    return []; // Return empty array on error
  }
}

import { EnrollButton } from "@/components/EnrollButton";


const CoursesPage = async () => {
  const courses = await getCourses();
  const { userId } = auth();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Course Catalog</h1>
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.courseId} className="border rounded-lg p-4 flex flex-col">
              <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
              <p className="text-gray-600 flex-grow">{course.description}</p>
              {userId && <EnrollButton courseId={course.courseId} />}
            </div>
          ))}
        </div>
      ) : (
        <p>No courses available at the moment. Please check back later.</p>
      )}
      <div className="mt-8">
        <Link href="/dashboard" className="text-blue-500 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default CoursesPage;
