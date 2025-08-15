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
- [x] **Established Dashboard Structure**: Created placeholder pages for Admin, Teacher, and Student roles.
- [x] **Implemented Role-Based Routing**: The main `/dashboard` route now automatically redirects users to their specific role-based dashboard.

---

## Next Steps & Future Work

The foundation is now stable and correctly implemented. Future development can focus on building out the specific features of the LMS.

- **[ ] Adopt a UI Component Library (shadcn-ui)**:
    -   **Why**: Radically accelerate frontend development by providing a rich set of pre-built, accessible, and customizable components.
    -   **Plan**: Install `shadcn-ui` and its dependencies. Refactor an existing page (e.g., the admin dashboard) to use its components (Button, Table) as a proof-of-concept.
- **[ ] Implement Role Management UI**: Create an admin-only UI where administrators can view and change the roles of other users.
- **[ ] Course Creation & Management**:
    -   Allow Teachers to create and manage courses.
    -   Allow Students to enroll in courses.
- **[ ] Lesson & Content Modules**:
    -   Teachers should be able to add lessons (text, video, quizzes) to courses.
    -   Students should be able to view lesson content.
- **[ ] Connect to Backend**: Integrate the `lms-frontend` with the `cognee-backend` by creating API clients to fetch and mutate data.
- **[ ] Write Frontend Tests**: Add unit and integration tests for the new frontend application using Jest and React Testing Library/Playwright.

---

## Proposed Feature Roadmap (from Research)

Based on analysis of successful open-source LMS projects, the following high-impact features are proposed to build this project into a robust, reusable foundation.

- **[ ] Adopt a UI Component Library (shadcn-ui)**:
    -   **Why**: Radically accelerate frontend development by providing a rich set of pre-built, accessible, and customizable components.
    -   **Plan**: Install `shadcn-ui` and its dependencies. Refactor an existing page (e.g., the admin dashboard) to use its components (Button, Table) as a proof-of-concept.

- **[ ] Rich Content Management (Video & File Uploads)**:
    -   **Why**: A core requirement for any modern LMS. Teachers need to be able to upload video lectures and supplementary materials (e.g., PDFs).
    -   **Plan**:
        1.  **Backend**: Implement a secure API endpoint that generates a pre-signed URL for uploading files to a cloud storage provider (e.g., AWS S3).
        2.  **Frontend**: In the "Create/Edit Course" flow, add a file input component that uses the pre-signed URL to upload files directly to cloud storage.
        3.  **Video Processing**: For video, integrate a service like Mux or Cloudflare Stream to handle transcoding and adaptive bitrate streaming.

- **[ ] Payment Gateway Integration (Stripe)**:
    -   **Why**: Enables monetization of courses, a critical feature for many LMS use cases.
    -   **Plan**:
        1.  **Backend**: Create API endpoints to manage course pricing, create Stripe Checkout sessions, and handle webhooks for successful payments.
        2.  **Frontend**: On the course catalog page, display prices and an "Enroll" button that redirects to the Stripe Checkout page.
        3.  **Data Model**: Update the `(User)-[:ENROLLED_IN]->(Course)` relationship to include payment status.
