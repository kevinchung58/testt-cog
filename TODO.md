# Next.js + Clerk RBAC Starter Template

> [!NOTE]
> **Project Purpose**
>
> This project serves as a robust, production-ready starter template for applications requiring role-based access control (RBAC). It demonstrates a full-stack implementation of user authentication and role management using Next.js for the frontend, an Express backend, and Clerk for user management.

---

## Core Features

This template provides a solid foundation with the following features implemented and verified:

- **Frontend (`lms-frontend`)**:
  - Built with Next.js App Router, TypeScript, and Tailwind CSS.
  - Integration with `shadcn-ui` for a professional and extensible component library.
  - Secure sign-in, sign-up, and profile management pages via Clerk components.
  - Role-based page protection and redirection.
  - A functional dashboard for each role demonstrating its unique capabilities.

- **Backend (`cognee-backend`)**:
  - Built with Express and TypeScript.
  - Secure, role-protected APIs for user and content management.
  - Middleware to protect API routes based on the user's role, verified via Clerk JWTs.

- **Functional Role Examples**:
    -   **Admin**: Can view all users and manage their roles from the `/admin` dashboard.
    -   **Teacher**: Can create new courses and view their created courses from the `/teacher` dashboard.
    -   **Student**: Can view a public course catalog, enroll in courses, and see their enrolled courses on the `/student` dashboard.
    -   **Automated Role Assignment**: A Clerk webhook handler automatically assigns a default "student" role to new users upon creation.

## How to Get Started

1.  **Configure Backend**:
    - Navigate to `cognee-backend/`.
    - Create a `.env` file from `.env.example`.
    - Add your `CLERK_SECRET_KEY` from the Clerk Dashboard.
    - Run `npm install` and then `npm run dev`.

2.  **Configure Frontend**:
    - Navigate to `cognee-backend/lms-frontend/`.
    - Create a `.env.local` file.
    - Add your `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SECRET` from the Clerk Dashboard.
    - Run `npm install` and then `npm run dev`.

3.  **Create an Admin or Teacher User**:
    - Sign up for a new account. By default, you will be a "student".
    - Go to your Clerk Dashboard -> Users, find your user, and in the "Public Metadata" section, set their role:
      - For Admin: `{ "role": "admin" }`
      - For Teacher: `{ "role": "teacher" }`
    - Log in with the user to see their specific dashboard and capabilities.

---

## Future Work & Potential Extensions

This template provides a functional demonstration of RBAC. It can be extended with additional features.

- **[ ] Add More Granular Permissions**: Extend the role system to include permissions (e.g., `course:edit`, `course:delete`) for more fine-grained control.
- **[ ] Build out Lesson Content**: Allow teachers to add rich content (video, text, quizzes) to the lessons.
- **[ ] Track Student Progress**: Implement a system to track which lessons a student has completed.
- **[ ] Write Frontend Tests**: Add a testing framework like Jest and React Testing Library/Playwright to the `lms-frontend` to ensure long-term stability.
