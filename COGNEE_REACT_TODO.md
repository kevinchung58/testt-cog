# Cognee Project Blueprint & TODO

This document outlines the strategic blueprint and actionable tasks for the Cognee project.
**Lead Architect:** Jules
**Last Updated:** 2025-08-13

## Phase 1: Stabilize & Unblock (Current Focus)

*This phase is about eliminating critical risks and unblocking our primary business objective.*

### ✅ P0: Unblock Strategic Research (COMPLETE)
- **Task:** Implement the `google_search` tool.
- **Status:** **COMPLETE.** A new `GoogleSearchTool` has been created using the `@browserbasehq/sdk`. This unblocks the primary business goal of researching open-source LMSs.
- **Owner:** Jules

### P1: Remediate Critical Test Environment Failure
- **Task:** Resolve the "heap out of memory" error in the `graph-builder.ts` test suite.
- **Why:** While we have paused work on this, it remains a critical piece of technical debt. A fully verifiable system is essential for long-term quality and reliable feature development. This should be revisited after the strategic research is unblocked.
- **Owner:** Human Developer (requires advanced memory profiling tools)

### P2: Reinstate Containerized Development Environment
- **Task:** Create a new, working `docker-compose.yml` file.
- **Services to include:** `cognee-backend`, `cognee-frontend`, `neo4j`, `chroma`.
- **Why:** A one-command setup (`docker-compose up`) is standard for modern development. It will drastically reduce onboarding time for new developers and eliminate environment inconsistencies, directly improving development velocity.
- **Owner:** Jules

## Phase 2: Strategic Integration (The LMS Pivot)

*This phase begins once the LMS research is complete and a target system has been selected.*

### P0: Proof-of-Concept (POC) - Integrate Cognee with Target LMS
- **Task:** Develop a minimal, functional integration of the Cognee RAG service into the chosen open-source LMS.
- **Goals:**
    - Ingest a sample course curriculum into Cognee.
    - Expose a "Smart Search" or "Ask the Course" feature within the LMS UI.
    - Verify that the core value proposition (intelligent, conversational learning support) is viable.
- **Owner:** TBD

### P1: Full Feature Integration
- **Task:** Plan and execute the full integration of Cognee features into the LMS.
- **Details:** This will involve mapping out user stories, designing the user experience, and adapting the Cognee backend API as needed to support the LMS's data models and user roles (Student, Teacher, Admin).
- **Owner:** TBD

## Phase 3: Future Enhancements & Maintenance

*This phase includes ongoing improvements and new features.*

- **Task:** Proactive technical debt repayment, performance optimization, and new feature development based on user feedback from the LMS integration.
- **Examples:**
    - Advanced graph visualization features.
    - User analytics on query patterns.
    - Support for more document types.
