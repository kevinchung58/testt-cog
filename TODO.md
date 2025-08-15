# Project TODO & Architectural Overview

> [!NOTE]
> **Project Status Update (As of August 2025)**
>
> This project has undergone a significant stabilization effort. The `cognee-backend` test suite was repaired from a non-functional state to 100% passing. Foundational features for the `lms-frontend` (Role-Based Access Control) were discovered to be missing and have now been implemented. The documentation, including this `TODO.md`, has been updated to reflect the current, accurate state of the project.

---

This document outlines the current status, architecture, and next steps for the project, focusing on the new Learning Management System (LMS) foundation.

## Architecture

The primary frontend application is located in the `cognee-backend/lms-frontend/` directory. This serves as the foundation for a modern, role-based Learning Management System.

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Authentication & Roles**: [Clerk](https://clerk.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: TypeScript

This setup was chosen for its modern features, rapid development capabilities, and robust, built-in solutions for authentication and user management.

## How to Run

1.  Navigate to the correct frontend directory: `cd cognee-backend/lms-frontend`
2.  Install dependencies: `npm install`
3.  Set up your environment variables by creating a `.env.local` file. You will need the following keys from your Clerk dashboard:
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
    - `CLERK_SECRET_KEY`
    - `CLERK_WEBHOOK_SECRET` (for automatic role assignment)
4.  Run the development server: `npm run dev`
5.  The application will be available at `http://localhost:3000`.

---

## Completed Tasks (LMS Foundation)

- [x] **Initialized New Next.js Project**: Created the `lms-frontend` application.
- [x] **Integrated Clerk for Authentication**: Installed and configured the Clerk SDK for sign-in, sign-up, and route protection.
- [x] **Implemented Webhook for Role Assignment**: Created an API endpoint (`/api/webhooks/clerk`) that automatically assigns a default "student" role to new users.
- [x] **Implemented Foundational RBAC**: Created a protected `/admin` route that is only accessible to users with the "admin" role.
- [x] **Established Dashboard Structure**: Created placeholder pages for different user experiences within the `(dashboard)` route group.

---

## Next Steps & Future Work

The foundation is now stable and correctly implemented. Future development can focus on building out the specific features of the LMS.

- **[ ] Flesh out Role Dashboards**: Add actual content and functionality to the Admin, Teacher, and Student dashboards. A placeholder for a student dashboard should be created.
- **[ ] Implement Role Management UI**: Create an admin-only UI where administrators can view and change the roles of other users.
- **[ ] Course Creation & Management**:
    -   Allow Teachers to create and manage courses.
    -   Allow Students to enroll in courses.
- **[ ] Lesson & Content Modules**:
    -   Teachers should be able to add lessons (text, video, quizzes) to courses.
    -   Students should be able to view lesson content.
- **[ ] Connect to Backend**: Integrate the `lms-frontend` with the `cognee-backend` by creating API clients to fetch and mutate data.
- **[ ] Refine Permissions**: Add more granular permissions beyond the three basic roles if needed.
- **[ ] Write Frontend Tests**: Add unit and integration tests for the new frontend application using Jest and React Testing Library/Playwright.
