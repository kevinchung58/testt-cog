# Cognee RAG Application TODO (React + Node.js/Express + Gemini)

**專案初始化與設定 (Project Initialization & Setup)**

*   [x] **環境建立 (Environment Setup):**
    *   [x] 安裝 Node.js 和 npm/yarn (Install Node.js and npm/yarn)
    *   [ ] ~~安裝 Python 和 pip (Install Python and pip)~~ (Backend is Node.js)
    *   [ ] ~~建立虛擬環境 (venv 或 conda) (Create a virtual environment)~~ (Backend is Node.js)
*   [x] **前端專案建立 (Frontend Project Creation):**
    *   [x] 使用 Vite 建立 React 專案 (Create React project using Vite) - (`cognee-frontend` exists)
    *   [x] 選擇 TypeScript (Choose TypeScript) - (Project uses TypeScript)
    *   [x] 設定基本的資料夾結構 (src, components, services, etc.) (Set up basic folder structure) - (Structure exists)
*   [x] **後端專案建立 (Backend Project Creation):**
    *   [x] Node.js/Express 專案已在 `cognee-backend` 中結構化 (Node.js/Express project already structured in `cognee-backend`)
    *   [x] 檢視 `cognee-backend/package.json` 以了解依賴項 (Review `cognee-backend/package.json` for dependencies)
    *   [x] 主要後端依賴項包括 Express, Langchain.js, Google GenAI SDK, Neo4j Driver, ChromaDB Client, CORS (Key backend dependencies include Express, Langchain.js, Google GenAI SDK, Neo4j driver, ChromaDB client, CORS)
    *   [x] **注意:** `package.json` 包含 `@langchain/openai` 和 `openai` 套件。確認是否需要移除以確保僅使用 Gemini。 - (已移除 OpenAI 相關依賴) (OpenAI dependencies removed)
*   [x] **版本控制 (Version Control):**
    *   [x] 初始化 Git 倉儲 (Initialize Git repository) - (Project is likely under Git)
    *   [x] 建立 `.gitignore` 檔案 (Create `.gitignore` file) - (Files exist)
*   [x] **容器化設定 (Containerization Setup):**
    *   [x] `docker-compose.yml` 已設定，包含 `frontend`, `backend`, `neo4j`, `chroma` 服務 (`docker-compose.yml` set up with `frontend`, `backend`, `neo4j`, `chroma` services)
    *   [x] `Dockerfile` 已為 `cognee-frontend` 和 `cognee-backend` 建立 (`Dockerfile` created for `cognee-frontend` and `cognee-backend`)

**後端開發 (Node.js/Express API)**

*   [x] **LLM 整合 (LLM Integration):**
    *   [x] 選擇並設定使用 Google Gemini (`gemini-2.0-flash` for chat, `text-embedding-004` for embeddings) (Choose and configure Google Gemini)
    *   [x] LLM API 呼叫邏輯已封裝在 `cognee-backend/src/toolkit/` (query-engine, graph-builder, vector-store) (LLM API call logic encapsulated in `cognee-backend/src/toolkit/`)
    *   [x] API 金鑰管理透過 `.env` 檔案和 `src/config.ts` 處理 (API key management via `.env` file and `src/config.ts`)
*   [x] **API 端點設計 (API Endpoint Design):**
    *   [x] `POST /ingest`: 接收檔案，處理並存儲到向量數據庫，可選建立知識圖譜 (Receives file, processes, stores in vector DB, optionally builds knowledge graph)
    *   [x] `POST /query`: 接收問題（可選聊天歷史、知識圖譜使用標誌），與 LLM 互動，串流回傳結果 (Receives question (optional chat history, KG usage flag), interacts with LLM, streams back result using SSE)
    *   [x] `GET /graph-schema`: 獲取 Neo4j 圖譜摘要 (Get Neo4j graph schema summary)
    *   [x] `POST /query-graph`: 使用自然語言查詢知識圖譜 (Query knowledge graph with natural language)
    *   [x] `GET /graph/overview`: (新增) 獲取圖譜概覽數據，可選搜索詞和限制 (New: Get graph overview data, optional search term and limit)
    *   [x] `GET /graph/node/:id/neighbors`: (新增) 獲取特定節點及其鄰居的數據 (New: Get data for a specific node and its neighbors)
*   [x] **請求處理與驗證 (Request Handling & Validation):**
    *   [x] 使用 `express.json()` 和 `multer` 處理請求 (Using `express.json()` and `multer` for request handling)
    *   [x] `/ingest`, `/query`, `/graph/overview` 中有基本的輸入驗證 (Basic input validation in `/ingest`, `/query`, `/graph/overview`)
*   [x] **錯誤處理 (Error Handling):**
    *   [x] 在 `server.ts` 和 toolkit 模組中有 try-catch 錯誤處理 (Try-catch error handling in `server.ts` and toolkit modules)
    *   [x] API 回傳一致的錯誤訊息結構 (APIs return consistent error message structure)
*   [x] **CORS 設定 (CORS Configuration):**
    *   [x] 已在 `server.ts` 中明確使用 `cors` 中間件 (Explicitly using `cors` middleware in `server.ts`)
*   [x] **非同步處理 (Asynchronous Processing):**
    *   [x] 大量使用 `async/await` 處理 I/O 綁定操作 (Extensive use of `async/await` for I/O bound operations)
    *   [x] `/query` 端點使用 Server-Sent Events (SSE) 進行串流回應 (`/query` endpoint uses SSE for streaming responses)

**前端開發 (React + Vite)**

*   [x] **UI/UX 設計 (UI/UX Design):**
    *   [x] 已設計檔案上傳介面 (`FileUpload.tsx`) (File upload interface designed)
    *   [x] 已設計聊天介面 (`ChatInterface.tsx`) (Chat interface designed)
    *   [x] 已設計知識圖譜視覺化介面 (`KnowledgeGraphVisualizer.tsx`) (Knowledge graph visualization interface designed)
    *   [x] 已處理載入狀態、錯誤訊息的顯示 (Loading states, error messages display handled)
*   [x] **元件開發 (Component Development):**
    *   [x] `FileUpload` 元件 (Component for file upload)
    *   [x] `ChatInterface` 元件 (包含輸入和回應顯示) (Component for chat, including input and response display)
    *   [x] `KnowledgeGraphVisualizer` 元件 (Component for graph visualization)
    *   [x] `GraphDetailPanel` 元件 (Component for showing details of graph elements)
*   [x] **狀態管理 (State Management):**
    *   [x] 主要使用 React `useState` 進行局部元件狀態管理 (Primarily using React `useState` for local component state)
*   [x] **API 服務層 (API Service Layer):**
    *   [x] `src/services/apiService.ts` 包含呼叫後端 API 的函式 (Contains functions to call backend APIs)
    *   [x] 使用 `axios` 進行常規請求，使用 `fetch` API 處理 SSE 串流 (Uses `axios` for regular requests, `fetch` API for SSE streams)
    *   [x] 處理 API 回應和錯誤 (Handles API responses and errors)
    *   [x] **API 端點校準 (API Endpoint Alignment):**
        *   [x] `apiService.ts` 中的 `getGraphSchemaSummary` 已更新為呼叫 `/graph-schema`。(Updated `getGraphSchemaSummary` to call `/graph-schema`.)
        *   [x] `apiService.ts` 中的 `getGraphData` 和 `getNodeNeighbors` 已更新為分別呼叫新的 `/graph/overview` 和 `/graph/node/:id/neighbors` 端點。(`getGraphData` and `getNodeNeighbors` in `apiService.ts` updated to call new `/graph/overview` and `/graph/node/:id/neighbors` endpoints respectively.)
*   [x] **表單處理 (Form Handling):**
    *   [x] `FileUpload.tsx` 和 `ChatInterface.tsx` 中擷取使用者輸入並處理提交事件 (User input capture and form submission handled in `FileUpload.tsx` and `ChatInterface.tsx`)
*   [x] **渲染 LLM 回應 (Rendering LLM Response):**
    *   [x] `ChatInterface.tsx` 逐步渲染串流回應 (Incrementally renders streaming response in `ChatInterface.tsx`)
*   [ ] **路由 (Routing) (如果需要多頁面):**
    *   [ ] 目前為單頁應用，未使用 `react-router-dom` (Currently a single-page application, `react-router-dom` not used) - (N/A for now)
*   [x] **樣式 (Styling):**
    *   [x] 使用 CSS Modules (例如 `ChatInterface.module.css`) 和全域 CSS (`index.css`) (Using CSS Modules and global CSS)

**進階功能與改進 (Advanced Features & Improvements)**

*   [x] **對話管理 (Conversation Management):**
    *   [x] 前端 `ChatInterface.tsx` 維護聊天歷史狀態，並使用 Local Storage 進行持久化。(Frontend `ChatInterface.tsx` maintains chat history state and persists it using Local Storage.)
    *   [ ] 後端 `/query` 端點接受 `chat_history`，但未實現伺服器端持久化儲存 (Backend `/query` endpoint accepts `chat_history` but server-side persistence is not implemented)
    *   [x] 允許使用者清除對話 (前端已實現 Local Storage 清除) (Allow users to clear conversations - frontend Local Storage clearing implemented)
*   [ ] **LLM 模型選擇 (LLM Model Selection):**
    *   [ ] 目前固定使用 `gemini-2.0-flash` 和 `text-embedding-004`。未提供模型選擇功能。(Currently fixed to specific Gemini models. Model selection feature not available.)
*   [x] **提示工程 (Prompt Engineering):**
    *   [x] 後端 `query-engine.ts` 和 `graph-builder.ts` 中使用自訂提示模板 (Custom prompt templates used in backend `query-engine.ts` and `graph-builder.ts`)
    *   [ ] (可選) 允許使用者儲存和重複使用 prompts (Optional: Allow users to save and reuse prompts) - (Not implemented)
*   [x] **流式回應 (Streaming Responses):**
    *   [x] 後端 `/query` 使用 Server-Sent Events (SSE) (Backend `/query` uses SSE)
    *   [x] 前端 `ChatInterface.tsx` 和 `apiService.ts` 處理並逐步顯示回應 (Frontend handles and displays incremental response)
*   [ ] **身份驗證與授權 (Authentication & Authorization) (如果需要):**
    *   [ ] 未實現 (Not implemented)
*   [x] **測試 (Testing):**
    *   [x] 前端有 `vitest` 設定和一些元件測試檔案 (`*.test.tsx`) (Frontend has `vitest` setup and some component test files)
    *   [x] 後端有 `jest` 設定和一些 toolkit 測試檔案 (`*.test.ts`) (Backend has `jest` setup and some toolkit test files)
    *   [x] 已為新的後端圖譜端點添加單元測試和整合測試 (Unit and integration tests added for new backend graph endpoints)
    *   [x] 已為後端 `/ingest` 和 `/graph-schema` 端點添加整合測試 (Integration tests added for backend `/ingest` and `/graph-schema` endpoints)
    *   [ ] **前端測試:** 檢查 `KnowledgeGraphVisualizer.tsx` 和 `ChatInterface.tsx` 的測試是否需要更新以反映新功能和改進。(Review if tests for `KnowledgeGraphVisualizer.tsx` and `ChatInterface.tsx` need updates to reflect new features/improvements.)
    *   [ ] 端對端測試 (Cypress, Playwright) (End-to-end tests) - (Not implemented)
*   [ ] **國際化 (i18n) / 本地化 (l10n) (如果需要):**
    *   [ ] 未實現 (Not implemented)

**部署 (Deployment)**

*   [x] **Docker化 (Dockerization):**
    *   [x] `docker-compose.yml` 用於本地開發協調 (`docker-compose.yml` for local development orchestration)
    *   [x] 前後端均有 `Dockerfile` (`Dockerfile`s for both frontend and backend)
*   [ ] **前端部署 (Frontend Deployment):**
    *   [ ] (未指定) Vercel, Netlify, GitHub Pages, AWS S3/CloudFront 等 (Not specified)
*   [ ] **後端部署 (Backend Deployment):**
    *   [ ] (未指定) Heroku, Google Cloud Run, AWS Elastic Beanstalk, Docker + VPS 等 (Not specified)
*   [x] **資料庫部署 (Database Deployment):**
    *   [x] Neo4j 和 ChromaDB 已整合並在 `docker-compose.yml` 中定義 (Neo4j and ChromaDB integrated and defined in `docker-compose.yml`)
*   [ ] **CI/CD 設定 (CI/CD Setup):**
    *   [ ] (未指定) GitHub Actions, GitLab CI, Jenkins 等 (Not specified)
*   [x] **環境變數管理 (Environment Variable Management):**
    *   [x] 後端使用 `.env` 和 `src/config.ts` (Backend uses `.env` and `src/config.ts`)
    *   [x] 前端 Vite 使用 `.env` 檔案 (例如 `VITE_API_BASE_URL`) (Frontend Vite uses `.env` files for `VITE_` prefixed vars)

**文件與維護 (Documentation & Maintenance)**

*   [x] **README.md:** 專案根目錄及前後端子目錄均有 `README.md` (Root and subdirectories for frontend/backend have `README.md`)
*   [ ] **API 文件 (可選):** Swagger/OpenAPI (Optional: API documentation with Swagger/OpenAPI) - (Not implemented)
*   [x] **程式碼註解 (Code Comments):** 程式碼中有一定程度的註解 (Some comments exist in the codebase)

**待辦事項 - 問題修復與改進 (TODO - Bug Fixes & Improvements)**
*   [x] ~~**後端:** 明確 `cors` 中間件的使用。~~ (已完成)
*   [x] ~~**後端:** 移除 `package.json` 中未使用的 OpenAI 依賴 (`@langchain/openai`, `openai`)，或確認其是否有隱藏用途。~~ (已完成)
*   [x] ~~**API 校準:**~~ (已完成)
    *   [x] ~~**(高優先級)** 修改 `frontend/src/services/apiService.ts` 中的 `getGraphSchemaSummary`，使其呼叫後端正確的 `/graph-schema` 端點。~~ (已完成)
    *   [x] ~~**(高優先級)** 解決 `KnowledgeGraphVisualizer.tsx` 對已移除的後端端點 (`/graph-data`, `/node-neighbors/:nodeId`) 的依賴。方案可能包括：~~ (已完成 - 選擇方案B並實施)
        *   [ ] ~~修改 `KnowledgeGraphVisualizer.tsx` 以使用現有的 `/query-graph` 端點（可能需要調整前端邏輯以適應自然語言查詢）。~~
        *   [x] ~~或，在後端重新實現 `/graph-data` (用於一般搜尋/初始視圖) 和 `/node-neighbors/:nodeId` (用於節點擴展) 端點，使其與 `graph-builder.ts` 中的 Neo4j 功能對接。~~ (已完成，新端點為 `/graph/overview` 和 `/graph/node/:id/neighbors`)
*   [x] ~~**前端:** `KnowledgeGraphVisualizer.tsx` - `fetchData` 和 `handleNodeDoubleClick` 中的錯誤處理可以更細緻地向使用者顯示問題所在。~~ (已完成)
*   [x] ~~**對話歷史持久化:** 考慮是否需要在後端或瀏覽器本地儲存中實現對話歷史的持久化。~~ (已完成 - Local Storage)
*   [x] ~~**測試覆蓋率:** 提升前後端的單元測試和整合測試覆蓋率 (除了已為圖譜端點添加的測試外)。~~ (已為 `/ingest` 和 `/graph-schema` 添加後端測試)
*   [x] **(可選) UI/UX 改進:**
    *   [x] ~~`KnowledgeGraphVisualizer`: 篩選器在行動裝置上的可用性。~~ (已評估，現有 CSS 基本可接受)
    *   [x] ~~`ChatInterface`: 允許複製 AI 回應。~~ (已完成)

```
