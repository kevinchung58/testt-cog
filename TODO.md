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
  - A fully functional, admin-only dashboard for managing user roles.

- **Backend (`cognee-backend`)**:
  - Built with Express and TypeScript.
  - Secure, admin-only API for user management (listing users, updating roles).
  - Middleware to protect API routes based on the user's role, verified via Clerk JWTs.

- **Automated Role Assignment**:
  - A Clerk webhook handler is implemented (`/api/webhooks/clerk`) to automatically assign a default "student" role to new users upon creation.

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

3.  **Create an Admin User**:
    - Sign up for a new account in the application.
    - Go to your Clerk Dashboard -> Users.
    - Find your user and scroll down to the "Public Metadata" section.
    - Add the following JSON: `{ "role": "admin" }`.
    - You can now access the `/admin` dashboard to manage other users.

---

## Future Work & Potential Extensions

This template provides the core authentication and role management foundation. It can be extended with additional features as needed.

- **[ ] Add More Granular Permissions**: Extend the role system to include permissions (e.g., `course:create`, `user:delete`) for more fine-grained control.
- **[ ] Flesh out Role Dashboards**: Build out the actual content and functionality for the `Admin`, `Teacher`, and `Student` dashboards now that the routing is in place.
- **[ ] Connect to a Primary Database**: Integrate the backend with a primary database (e.g., PostgreSQL, MongoDB) for storing application-specific data that doesn't belong in Clerk user metadata.
- **[ ] Write Frontend Tests**: Add a testing framework like Jest and React Testing Library/Playwright to the `lms-frontend` to ensure long-term stability.
