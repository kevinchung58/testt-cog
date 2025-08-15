# Cognee LMS & RAG Platform - Development Blueprint

> [!IMPORTANT]
> **Architect's Mandate (As of 2025-08-15)**
>
> The project's backend environment is currently unstable, preventing dependency installation (`npm install`). All development will proceed using a **backend-decoupled** strategy. The `lms-frontend` will utilize a dependency-free, in-house mock API layer (`src/mocks/`) to enable continued progress on UI/UX features and testing. This document reflects that new reality.

---

## Known Blockers & Strategic Workarounds

- **[BLOCKER] Backend Environment Unstable**:
  - **Issue**: The `npm install` command fails consistently in the `cognee-backend` workspace due to a suspected deep-seated `npm` or environment configuration issue.
  - **Status**: **Unresolved.** This is a critical infrastructure problem that must be fixed externally.
  - **Workaround**: All backend-dependent development is on hold. Frontend development will proceed in a decoupled manner.

- **[WORKAROUND] Dependency-Free API Mocking**:
  - **Strategy**: To unblock frontend work, we have implemented a simple, dependency-free mock API layer within the `lms-frontend` at `src/mocks/handlers.ts`.
  - **Implementation**: Components will be refactored to use these mock handlers when `process.env.NODE_ENV === 'development'`. This allows for UI development and testing without a live backend.

---

## Active & Upcoming Tasks

### P0: Foundational Stability & Security

- **[DONE] Implement Dependency-Free Mock Layer**: Created a mock API for the `lms-frontend` to enable decoupled development. Integrated with the Admin Dashboard as a proof-of-concept.
- **[TODO] Secure Public Endpoints**: The `/ingest` and `/query` endpoints in `cognee-backend` are currently public. Once the environment is restored, they must be protected with authentication and role-based authorization (e.g., Admin-only).
- **[TODO] Write Frontend Tests**: Add a testing framework (e.g., Jest/RTL or Playwright) to the `lms-frontend`.
  - **First Task**: Write tests for the `UserManagementTable` component, leveraging the new mock API handlers. This will validate the mocking strategy and improve frontend robustness.

### P1: Core Feature Extensions

- **[TODO] Add More Granular Permissions**: Extend the RBAC system to include specific permissions (e.g., `course:edit`, `course:delete`, `user:manage_roles`) for more fine-grained control. This will require changes on both the backend and frontend.
- **[TODO] Build out Lesson Content Management**: Allow teachers to add rich content (e.g., Markdown text, video embeds, simple quizzes) to lessons.
- **[TODO] Track Student Progress**: Implement a system to track which lessons a student has completed, and display this progress on their dashboard.

### P2: Original RAG Project Tasks (On Hold)

> [!NOTE]
> The original `cognee-frontend` and its associated RAG features are currently on hold pending the resolution of the backend environment issues. The focus is on the LMS functionality for now.

---

## Original Getting Started Guide (For Reference)

> [!WARNING]
> The following instructions are for a stable environment and will likely fail until the `npm install` issue in `cognee-backend` is resolved.

1.  **Configure Backend**:
    - Navigate to `cognee-backend/`.
    - Create a `.env` file from `.env.example`.
    - Add your `CLERK_SECRET_KEY`.
    - Run `npm install` (Currently Failing) and then `npm run dev`.

2.  **Configure Frontend**:
    - Navigate to `cognee-backend/lms-frontend/`.
    - Create a `.env.local` file.
    - Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, etc.
    - Run `npm install` and then `npm run dev`.
