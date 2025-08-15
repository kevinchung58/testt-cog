// This file will contain mock API handlers to be used in development.
// This approach avoids the need for new dependencies, working around the broken npm environment.

// --- Permissions & Roles Mocks ---

// Define a type for the user data we expect, consistent with the component
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

// Mock data for the users endpoint
const mockUsers: ClerkUser[] = [
  {
    id: "user_2fJOPs3Yq4Y8Q9jJ4s5K6r7L8m",
    firstName: "John",
    lastName: "Doe",
    emailAddresses: [{ emailAddress: "john.doe@example.com" }],
    publicMetadata: { role: "admin", permissions: ["admin:full_access"] },
  },
  {
    id: "user_1aB2c3D4e5F6g7H8i9J0k1L2m",
    firstName: "Jane",
    lastName: "Smith",
    emailAddresses: [{ emailAddress: "jane.smith@example.com" }],
    publicMetadata: { role: "teacher", permissions: ["course:create", "course:edit_own"] },
  },
  {
    id: "user_9zY8x7W6v5U4t3S2r1Q0p9O8n",
    firstName: "Sam",
    lastName: "Wilson",
    emailAddresses: [{ emailAddress: "sam.wilson@example.com" }],
    publicMetadata: { role: "student", permissions: ["course:enroll", "course:view_enrolled"] },
  },
];

const availablePermissions = [
    { id: "admin:full_access", description: "Full administrative access to all system features." },
    { id: "user:manage", description: "Can view, edit, and manage user roles and permissions." },
    { id: "course:create", description: "Can create new courses." },
    { id: "course:edit_own", description: "Can edit courses they have created." },
    { id: "course:edit_all", description: "Can edit any course in the system." },
    { id: "course:delete", description: "Can delete courses." },
    { id: "course:enroll", description: "Can enroll in courses." },
    { id: "course:view_enrolled", description: "Can view courses they are enrolled in." },
];

export const getMockPermissions = async (): Promise<typeof availablePermissions> => {
    console.log("--- MOCK API CALLED: GET /api/permissions ---");
    return new Promise(resolve => setTimeout(() => resolve(availablePermissions), 200));
};

export const getMockUserById = async (userId: string): Promise<ClerkUser | null> => {
  console.log(`--- MOCK API CALLED: GET /api/users/${userId} ---`);
  const user = mockUsers.find(u => u.id === userId) || null;
  return new Promise(resolve => setTimeout(() => resolve(user), 150));
};

// Mock handler for GET /api/users
export const getMockUsers = async (): Promise<ClerkUser[]> => {
  console.log("--- MOCK API CALLED: GET /api/users ---");
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockUsers);
    }, 500); // Simulate network delay
  });
};

// --- Student Progress Mocks ---

interface StudentProgress {
  completedLessons: string[];
}

// In-memory store for a user's progress, keyed by userId, then by courseId
const mockStudentProgressData: Record<string, Record<string, StudentProgress>> = {
  "user_student_mock_id": {
    "course_123": {
      completedLessons: ["lesson_abc"],
    },
  },
};

// Mock handler for GET /api/users/:userId/courses/:courseId/progress
export const getMockStudentProgress = async (userId: string, courseId: string): Promise<StudentProgress> => {
  console.log(`--- MOCK API CALLED: GET /api/users/${userId}/courses/${courseId}/progress ---`);
  return new Promise(resolve => {
    setTimeout(() => {
      const progress = mockStudentProgressData[userId]?.[courseId] || { completedLessons: [] };
      resolve(progress);
    }, 300);
  });
};

// --- Enrolled Courses Mock ---

const mockEnrolledCourses = [
  {
    courseId: "course_123",
    title: "Introduction to Mocking",
    description: "A course about how to use mock data effectively.",
  },
  {
    courseId: "course_456",
    title: "Advanced Frontend Strategies",
    description: "Learn about resilient frontend architecture.",
  },
];

export const getMockEnrolledCourses = async (userId: string): Promise<any[]> => {
  console.log(`--- MOCK API CALLED: GET /api/users/${userId}/courses/enrolled ---`);
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockEnrolledCourses);
    }, 500);
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

// Mock handler for POST /api/users/:userId/metadata
export const updateMockUserMetadata = async (userId: string, metadata: { role?: string; permissions?: string[] }): Promise<ClerkUser> => {
  console.log(`--- MOCK API CALLED: POST /api/users/${userId}/metadata with data: ${JSON.stringify(metadata)} ---`);

  const userIndex = mockUsers.findIndex(user => user.id === userId);
  if (userIndex === -1) {
    throw new Error("User not found");
  }

  const updatedUser = {
    ...mockUsers[userIndex],
    publicMetadata: {
        ...mockUsers[userIndex].publicMetadata,
        ...metadata,
    },
  };

  mockUsers[userIndex] = updatedUser;

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(updatedUser);
    }, 300);
  });
};
