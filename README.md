# Next.js + Clerk RBAC Starter Template

This project is a full-stack, production-ready starter template for building applications that require role-based access control (RBAC). It provides a clean, modular foundation for user authentication, role management, and protected routes/APIs.

The goal of this template is to provide a reusable starting point for projects that need to differentiate user capabilities based on assigned roles (e.g., `admin`, `teacher`, `student`).

## Core Technologies

-   **Frontend (`lms-frontend`)**:
    -   [Next.js](https://nextjs.org/) (App Router)
    -   [React](https://react.dev/)
    -   [TypeScript](https://www.typescriptlang.org/)
    -   [Tailwind CSS](https://tailwindcss.com/)
    -   [shadcn-ui](https://ui.shadcn.com/) for a professional and extensible component library.

-   **Backend (`cognee-backend`)**:
    -   [Node.js](https://nodejs.org/)
    -   [Express](https://expressjs.com/)
    -   [TypeScript](https://www.typescriptlang.org/)

-   **Authentication & User Management**:
    -   [Clerk](https://clerk.com/) for user management, authentication, and role metadata.

## Features

-   **Full Authentication Flow**: Secure sign-in, sign-up, and user profile management handled by Clerk components.
-   **Automated Role Assignment**: A backend webhook automatically assigns a default "student" role to every new user.
-   **Role-Based Access Control (RBAC)**:
    -   **Frontend**: Page access is controlled by role. The `/admin` route is protected and only accessible to users with the "admin" role.
    -   **Backend**: API routes under `/api/users` are protected by middleware that verifies the user's JWT and checks for the "admin" role.
-   **Admin User Management UI**: A functional dashboard at `/admin` where administrators can view all users and change their roles (`admin`, `teacher`, `student`).
-   **Role-Based Routing**: A central routing component on the main `/dashboard` page automatically redirects logged-in users to their respective dashboards (`/admin`, `/teacher`, or `/student`).

## Getting Started

This project contains two main parts: the `cognee-backend` and the `lms-frontend`. Both need to be running simultaneously.

### 1. Configure Backend

1.  Navigate to the backend directory:
    ```bash
    cd cognee-backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create an environment file by copying the example:
    ```bash
    cp .env.example .env
    ```
4.  Open the `.env` file and add your **Clerk Secret Key**. You can find this in your Clerk Dashboard under API Keys.
    ```
    CLERK_SECRET_KEY=sk_...
    ```
5.  Start the backend server:
    ```bash
    npm run dev
    ```
    The backend will be running on `http://localhost:3001` by default.

### 2. Configure Frontend

1.  In a **new terminal window**, navigate to the frontend directory:
    ```bash
    cd cognee-backend/lms-frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a local environment file:
    ```bash
    cp .env.example .env.local
    ```
4.  Open the `.env.local` file and add your **Clerk Publishable Key**, **Secret Key**, and **Webhook Secret**.
    -   The Webhook Secret is crucial for the role-assignment automation. You can get this by creating a new webhook in your Clerk Dashboard pointed at `http://localhost:3001/api/webhooks/clerk`.
5.  Start the frontend development server:
    ```bash
    npm run dev
    ```
    The frontend will be running on `http://localhost:3000`.

### 3. Create an Admin User

1.  Open `http://localhost:3000` in your browser and sign up for a new account. By default, you will be assigned the "student" role.
2.  Go to your **Clerk Dashboard** -> Users.
3.  Find the user you just created and click on it.
4.  In the "Metadata" section, add the following to **Public Metadata**:
    ```json
    {
      "role": "admin"
    }
    ```
5.  Save the changes. Now, when you log in with this user, you will be redirected to the `/admin` dashboard and have access to the user management tools.
