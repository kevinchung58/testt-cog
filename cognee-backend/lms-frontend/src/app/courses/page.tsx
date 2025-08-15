import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { EnrollButton } from '@/components/EnrollButton';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { Button } from '@/components/ui/button';

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
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/courses`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch courses');
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching courses for catalog:", error);
    return [];
  }
}

const CoursesPage = async () => {
  const courses = await getCourses();
  const { userId } = auth();

  return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Course Catalog</h1>
            <Button asChild>
                <Link href="/dashboard">
                    Back to Dashboard
                </Link>
            </Button>
        </div>

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
                    {userId ? (
                        <EnrollButton courseId={course.courseId} />
                    ) : (
                        <Button asChild className="w-full mt-4">
                            <Link href="/sign-in">Sign in to Enroll</Link>
                        </Button>
                    )}
                </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <p>No courses available at the moment. Please check back later.</p>
      )}
    </div>
  );
};

export default CoursesPage;
