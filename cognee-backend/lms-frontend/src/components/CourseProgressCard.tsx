"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "./ui/button";

interface Course {
  courseId: string;
  title: string;
  description: string;
}

interface Progress {
  totalLessons: number;
  completedLessons: number;
}

interface CourseProgressCardProps {
  course: Course;
  progress: Progress;
  onGoToCourse: (courseId: string) => void;
}

export const CourseProgressCard = ({ course, progress, onGoToCourse }: CourseProgressCardProps) => {
  const completionPercentage = progress.totalLessons > 0
    ? (progress.completedLessons / progress.totalLessons) * 100
    : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{course.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-gray-600 mb-4">{course.description}</p>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-700">
              {progress.completedLessons} / {progress.totalLessons}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => onGoToCourse(course.courseId)}>
          {completionPercentage === 100 ? "Review Course" : "Continue Learning"}
        </Button>
      </CardFooter>
    </Card>
  );
};
