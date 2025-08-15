// This file will contain mock API handlers to be used in development.
// This approach avoids the need for new dependencies, working around the broken npm environment.

// Define a type for the user data we expect, consistent with the component
interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: {
    role?: "admin" | "teacher" | "student";
  };
}

// Mock data for the users endpoint
const mockUsers: ClerkUser[] = [
  {
    id: "user_2fJOPs3Yq4Y8Q9jJ4s5K6r7L8m",
    firstName: "John",
    lastName: "Doe",
    emailAddresses: [{ emailAddress: "john.doe@example.com" }],
    publicMetadata: { role: "admin" },
  },
  {
    id: "user_1aB2c3D4e5F6g7H8i9J0k1L2m",
    firstName: "Jane",
    lastName: "Smith",
    emailAddresses: [{ emailAddress: "jane.smith@example.com" }],
    publicMetadata: { role: "teacher" },
  },
  {
    id: "user_9zY8x7W6v5U4t3S2r1Q0p9O8n",
    firstName: "Sam",
    lastName: "Wilson",
    emailAddresses: [{ emailAddress: "sam.wilson@example.com" }],
    publicMetadata: { role: "student" },
  },
];

// Mock handler for GET /api/users
export const getMockUsers = async (): Promise<ClerkUser[]> => {
  console.log("--- MOCK API CALLED: GET /api/users ---");
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockUsers);
    }, 500); // Simulate network delay
  });
};

// --- Course Management Mocks ---

interface CourseDetails {
  courseId: string;
  title: string;
  description: string;
  courseCode: string;
}

const mockCourseDetails: Record<string, CourseDetails> = {
  "course_123": {
    courseId: "course_123",
    title: "Introduction to Mocking",
    description: "A course about how to use mock data effectively.",
    courseCode: "MOCK101",
  },
};

export const getMockCourseDetails = async (courseId: string): Promise<CourseDetails> => {
  console.log(`--- MOCK API CALLED: GET /api/courses/${courseId} ---`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const course = mockCourseDetails[courseId];
      if (course) {
        resolve(course);
      } else {
        // Simulate a 404 Not Found
        reject(new Error("Course not found"));
      }
    }, 200);
  });
};


// --- Lesson Management Mocks ---

interface Lesson {
  lessonId: string;
  title: string;
  content: string;
  order: number;
}

// In-memory store for lessons, keyed by courseId
const mockLessons: Record<string, Lesson[]> = {
  "course_123": [
    { lessonId: "lesson_abc", title: "Introduction to Calculus", content: "This is the first lesson.", order: 0 },
    { lessonId: "lesson_def", title: "Derivatives", content: "Understanding derivatives.", order: 1 },
  ],
};

// Mock handler for GET /api/courses/:courseId/lessons
export const getMockLessons = async (courseId: string): Promise<Lesson[]> => {
  console.log(`--- MOCK API CALLED: GET /api/courses/${courseId}/lessons ---`);
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockLessons[courseId] || []);
    }, 400);
  });
};

// Mock handler for POST /api/courses/:courseId/lessons
export const createMockLesson = async (courseId: string, lessonData: { title: string; content: string }): Promise<Lesson> => {
  console.log(`--- MOCK API CALLED: POST /api/courses/${courseId}/lessons ---`);

  if (!mockLessons[courseId]) {
    mockLessons[courseId] = [];
  }

  const newLesson: Lesson = {
    lessonId: `lesson_${Math.random().toString(36).substr(2, 9)}`,
    title: lessonData.title,
    content: lessonData.content,
    order: mockLessons[courseId].length,
  };

  mockLessons[courseId].push(newLesson);

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(newLesson);
    }, 500);
  });
};

// Mock handler for POST /api/users/:userId/role
export const updateMockUserRole = async (userId: string, newRole: string): Promise<ClerkUser> => {
  console.log(`--- MOCK API CALLED: POST /api/users/${userId}/role with role: ${newRole} ---`);

  const userIndex = mockUsers.findIndex(user => user.id === userId);
  if (userIndex === -1) {
    throw new Error("User not found");
  }

  const updatedUser = {
    ...mockUsers[userIndex],
    publicMetadata: { role: newRole as "admin" | "teacher" | "student" },
  };

  mockUsers[userIndex] = updatedUser;

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(updatedUser);
    }, 300);
  });
};
