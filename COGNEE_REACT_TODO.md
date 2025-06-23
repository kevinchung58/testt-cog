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
    *   [x] 主要後端依賴項包括 Express, Langchain.js, Google GenAI SDK, Neo4j Driver, ChromaDB Client, CORS, uuid (Key backend dependencies include Express, Langchain.js, Google GenAI SDK, Neo4j driver, ChromaDB client, CORS, uuid)
    *   [x] **注意:** `package.json` 包含 `@langchain/openai` 和 `openai` 套件。確認是否需要移除以確保僅使用 Gemini。 - (已移除 OpenAI 相關依賴) (OpenAI dependencies removed)
*   [x] **版本控制 (Version Control):**
    *   [x] 初始化 Git 倉儲 (Initialize Git repository) - (Project is likely under Git)
    *   [x] 建立 `.gitignore` 檔案 (Create `.gitignore` file) - (Files exist)
*   [x] **容器化設定 (Containerization Setup):**
    *   [x] `docker-compose.yml` 已設定，包含 `frontend`, `backend`, `neo4j`, `chroma` 服務 (`docker-compose.yml` set up with `frontend`, `backend`, `neo4j`, `chroma` services)
    *   [x] `Dockerfile` 已為 `cognee-frontend` 和 `cognee-backend` 建立 (`Dockerfile` created for `cognee-frontend` and `cognee-backend`)

**後端開發 (Node.js/Express API)**

*   [x] **LLM 整合 (LLM Integration):**
    *   [x] 選擇並設定使用 Google Gemini (模型名稱可通過環境變數配置，預設為 `gemini-pro` 和 `text-embedding-004`) (Choose and configure Google Gemini - model names configurable via env vars, defaulting to `gemini-pro` and `text-embedding-004`)
    *   [x] LLM API 呼叫邏輯已封裝在 `cognee-backend/src/toolkit/` (query-engine, graph-builder, vector-store) (LLM API call logic encapsulated in `cognee-backend/src/toolkit/`)
    *   [x] API 金鑰管理透過 `.env` 檔案和 `src/config.ts` 處理 (API key management via `.env` file and `src/config.ts`)
*   [x] **API 端點設計 (API Endpoint Design):**
    *   [x] `POST /ingest`: 接收檔案，處理並存儲到向量數據庫，可選建立知識圖譜 (Receives file, processes, stores in vector DB, optionally builds knowledge graph)
    *   [x] `POST /query`: 接收問題（可選聊天歷史、知識圖譜使用標誌、會話ID、聊天模型名稱），與 LLM 互動，串流回傳結果，並保存聊天訊息至Neo4j。(Receives question (optional chat history, KG usage flag, session ID, chat model name), interacts with LLM, streams back result using SSE, and saves chat messages to Neo4j.)
    *   [x] `GET /graph-schema`: 獲取 Neo4j 圖譜摘要 (Get Neo4j graph schema summary)
    *   [x] `POST /query-graph`: 使用自然語言查詢知識圖譜 (Query knowledge graph with natural language)
    *   [x] `GET /graph/overview`: (新增) 獲取圖譜概覽數據，可選搜索詞和限制 (New: Get graph overview data, optional search term and limit)
    *   [x] `GET /graph/node/:id/neighbors`: (新增) 獲取特定節點及其鄰居的數據 (New: Get data for a specific node and its neighbors)
    *   [x] `GET /chat/history/:sessionId`: (新增) 獲取特定會話的聊天歷史 (New: Get chat history for a specific session)
    *   [x] `DELETE /chat/history/:sessionId`: (新增) 刪除特定會話的聊天歷史 (New: Delete chat history for a specific session)
    *   [x] `POST /prompts`: (新增) 保存新的用戶自定義提示 (New: Save a new user-defined prompt)
    *   [x] `GET /prompts`: (新增) 檢索所有已保存的用戶自定義提示 (New: Retrieve all saved user-defined prompts)
    *   [x] `DELETE /prompts/:promptId`: (新增) 刪除指定的已保存提示 (New: Delete a specific saved prompt)
*   [x] **請求處理與驗證 (Request Handling & Validation):**
    *   [x] 使用 `express.json()` 和 `multer` 處理請求 (Using `express.json()` and `multer` for request handling)
    *   [x] `/ingest`, `/query`, `/graph/overview`, `/chat/history/:sessionId`, `/prompts` 中有基本的輸入驗證 (Basic input validation in routes)
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
    *   [x] `KnowledgeGraphVisualizer.tsx` 中的錯誤訊息已增強，更具用戶友好性。(Error messages in `KnowledgeGraphVisualizer.tsx` enhanced for user-friendliness.)
*   [x] **元件開發 (Component Development):**
    *   [x] `FileUpload` 元件 (Component for file upload)
    *   [x] `ChatInterface` 元件 (包含輸入和回應顯示、複製按鈕、清除歷史按鈕、保存/使用提示功能 - 後端持久化、模型選擇下拉框) (Component for chat, including input, response display, copy button, clear history button, save/reuse prompts feature - backend persisted, model selection dropdown)
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
        *   [x] `apiService.ts` 中新增 `fetchChatHistory` 和 `apiDeleteChatHistory` 函式，並修改 `askQuery` 以處理 `sessionId`。(Added `fetchChatHistory`, `apiDeleteChatHistory` and modified `askQuery` in `apiService.ts` to handle `sessionId`.)
        *   [x] `apiService.ts` 中新增用於保存/獲取/刪除提示的函式 (`apiSaveUserPrompt`, `apiGetSavedPrompts`, `apiDeleteSavedPrompt`)。(Added functions for saving/getting/deleting prompts in `apiService.ts`.)
        *   [x] `apiService.ts` 中 `askQuery` 函式已更新以接受 `chatModelName` 參數。(Updated `askQuery` in `apiService.ts` to accept `chatModelName` parameter.)
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
    *   [x] 前端 `ChatInterface.tsx` 管理 `sessionId` (存於 Local Storage)，並從後端加載/顯示歷史記錄。(Frontend `ChatInterface.tsx` manages `sessionId` (stored in Local Storage) and loads/displays history from backend.)
    *   [x] 後端 `/query` 端點接受 `sessionId`，並使用 Neo4j 持久化聊天歷史。 (Backend `/query` endpoint accepts `sessionId` and persists chat history using Neo4j.)
    *   [x] 允許使用者清除對話 (前端清除本地 `sessionId` 並開始新會話，同時調用後端API刪除歷史)。 (Allow users to clear conversations - frontend clears local `sessionId`, starts a new session, and calls backend API to delete history.)
*   [x] **LLM 模型選擇 (LLM Model Selection):**
    *   [x] 目前固定使用 `gemini-pro` 和 `text-embedding-004`。已在前端頁腳顯示此資訊，並通過後端配置使其可配置。(Currently fixed to `gemini-pro` and `text-embedding-004`. This information is displayed in the frontend footer, and made configurable via backend config.)
    *   [x] 後端LLM服務初始化已重構為使用 `config.ts` 中的可配置模型名稱。`/query` 端點現在接受 `chatModelName`。(Backend LLM service initialization refactored to use configurable model names from `config.ts`. `/query` endpoint now accepts `chatModelName`.)
    *   [x] 前端 `ChatInterface.tsx` 已添加模型選擇下拉框，並將所選模型傳遞給後端 `/query` API。(Frontend `ChatInterface.tsx` now has a model selection dropdown and passes the selected model to the backend `/query` API.)
    *   [ ] (下一步) 實際模型切換邏輯 (例如，如果後端支持更多模型，確保它們按預期工作)。(Next step: Actual model switching logic if backend supports more models and ensuring they work as expected).
*   [x] **提示工程 (Prompt Engineering):**
    *   [x] 後端 `query-engine.ts` 和 `graph-builder.ts` 中使用自訂提示模板 (Custom prompt templates used in backend `query-engine.ts` and `graph-builder.ts`)
    *   [x] (可選) 允許使用者儲存和重複使用 prompts (已使用 Neo4j 實現後端持久化，並更新前端以使用此功能) (Optional: Allow users to save and reuse prompts - backend persistence with Neo4j implemented and frontend updated.)
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
    *   [x] 已為前端 `ChatInterface.tsx` (包括保存提示功能 - 後端集成、清除歷史記錄、模型選擇UI) 和 `KnowledgeGraphVisualizer.tsx` (錯誤處理) 添加/更新測試。(Tests added/updated for new features/error handling in `ChatInterface.tsx` (including saved prompts with backend integration, clear history, model selection UI) and `KnowledgeGraphVisualizer.tsx` (error handling).)
    *   [x] 已為後端保存提示端點 (`/prompts`) 和刪除聊天歷史端點 (`/chat/history/:sessionId`) 添加整合測試。(Integration tests added for backend saved prompt and delete chat history endpoints.)
    *   [x] 後端整合測試已重構為多個文件以提高組織性。 (Backend integration tests refactored into multiple files for better organization.)
    *   [x] 後端單元測試已更新以反映對LLM/嵌入模型名稱的可配置性。(Backend unit tests updated for configurable LLM/embedding model names.)
    *   [x] 後端 `/query` 整合測試已更新以測試 `chatModelName` 參數。(Backend `/query` integration tests updated for `chatModelName` parameter.)
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
*   [x] **API 文件 (可選):** `cognee-backend/API_DOCUMENTATION.md` 已創建並增強，包含所有端點的詳細信息和cURL示例，並提及模型配置。(API documentation created and enhanced, includes details for all endpoints, cURL examples, and model configuration notes.)
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
*   [x] ~~**對話歷史持久化:** 使用 Neo4j 實現後端聊天歷史持久化，並更新前端以使用此功能。~~ (已完成)
*   [x] ~~**測試覆蓋率:** 為後端 `/ingest`、`/graph-schema` 端點以及前端 `ChatInterface` 和 `KnowledgeGraphVisualizer` 的新功能/錯誤處理添加測試。~~ (已完成)
*   [x] **(可選) UI/UX 改進:**
    *   [x] ~~`KnowledgeGraphVisualizer`: 篩選器在行動裝置上的可用性。~~ (已評估，現有 CSS 基本可接受)
    *   [x] ~~`ChatInterface`: 允許複製 AI 回應。~~ (已完成)
*   [x] ~~**提示工程:** (可選) 允許使用者儲存和重複使用 prompts (已使用 Neo4j 實現後端持久化，並更新前端以使用此功能)~~ (已完成)
*   [x] ~~**API 文件:** `cognee-backend/API_DOCUMENTATION.md` 已創建並包含現有端點的初始文檔，包括刪除聊天歷史端點。~~ (已完成 - 已進一步增強並添加模型配置說明)
*   [x] ~~**對話管理:** 清除歷史記錄功能現在也調用後端API刪除歷史記錄。~~ (已完成)
*   [x] ~~**測試:** 為後端刪除聊天歷史端點添加測試，並更新前端清除歷史測試。~~ (已完成)
*   [x] ~~**測試:** 後端整合測試已重構為多個文件以提高組織性。~~ (已完成)
*   [x] ~~**LLM整合:** 後端LLM服務初始化已重構為使用 `config.ts` 中的可配置模型名稱。(/query 端點現在接受 `chatModelName`)~~ (已完成)
*   [x] ~~**測試:** 後端單元測試和整合測試已更新以反映對LLM模型名稱的可配置性/參數化。~~ (已完成)
*   [x] ~~**前端開發:** `ChatInterface.tsx` 已添加模型選擇下拉框，並將所選模型傳遞給後端 `/query` API。相關測試已更新。~~ (已完成)

```
