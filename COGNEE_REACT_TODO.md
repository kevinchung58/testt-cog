# Cognee RAG Application TODO (React + Node.js/Express + Gemini)

**本地開發環境設定 (無 Docker) (Local Development Setup - No Docker)**

*   [ ] **1. 安裝資料庫 (Install Databases):**
    *   [ ] **Neo4j:**
        *   從 [https://neo4j.com/download/](https://neo4j.com/download/) 下載並安裝 Neo4j Desktop。
        *   打開 Neo4j Desktop，建立一個新專案和一個新的本地資料庫。
        *   啟動資料庫。記下您的密碼。
        *   預設的 Bolt URI 是 `neo4j://localhost:7687`，使用者名稱是 `neo4j`。
    *   [ ] **ChromaDB:**
        *   確保您已安裝 Python 3.8+ 和 pip。
        *   在您的終端機中運行: `pip install chromadb`
        *   在一個單獨的終端機視窗中，運行: `chroma run --path /path/for/your/db` (將 `/path/for/your/db` 替換為您希望儲存資料庫檔案的實際路徑)。
        *   這將在 `http://localhost:8000` 啟動 ChromaDB 伺服器。
*   [ ] **2. 設定環境變數 (Setup Environment Variables):**
    *   [ ] 在 `cognee-backend` 資料夾中，將 `.env.example` 複製為 `.env`。
    *   [ ] 填寫 `.env` 檔案中的必要變數：
        *   `NEO4J_URI=neo4j://localhost:7687`
        *   `NEO4J_USER=neo4j`
        *   `NEO4J_PASSWORD=` (您在 Neo4j Desktop 中設定的密碼)
        *   `GEMINI_API_KEY=` (您的 Google Gemini API 金鑰)
        *   `CHROMA_URL=http://localhost:8000`
*   [ ] **3. 運行後端 (Run Backend):**
    *   [ ] `cd cognee-backend`
    *   [ ] `npm install`
    *   [ ] `npm run dev`
    *   [ ] 後端伺服器現在應運行在 `http://localhost:3001`。
*   [ ] **4. 運行前端 (Run Frontend):**
    *   [ ] 在另一個終端機中，`cd cognee-frontend`
    *   [ ] `npm install`
    *   [ ] `npm run dev`
    *   [ ] 前端應用現在應運行在 `http://localhost:5173`。

---

**專案初始化與設定 (Project Initialization & Setup)**

*   [x] **環境建立 (Environment Setup):**
    *   [x] 安裝 Node.js 和 npm/yarn (Install Node.js and npm/yarn)
    *   [x] 安裝 Python 和 pip (Install Python and pip) - (Required for ChromaDB local setup)
*   [x] **前端專案建立 (Frontend Project Creation):**
    *   [x] 使用 Vite 建立 React 專案 (Create React project using Vite) - (`cognee-frontend` exists)
    *   [x] 選擇 TypeScript (Choose TypeScript) - (Project uses TypeScript)
    *   [x] 設定基本的資料夾結構 (src, components, services, etc.) (Set up basic folder structure) - (Structure exists)
*   [x] **後端專案建立 (Backend Project Creation):**
    *   [x] Node.js/Express 專案已在 `cognee-backend` 中結構化 (Node.js/Express project already structured in `cognee-backend`)
*   [x] **版本控制 (Version Control):**
    *   [x] 初始化 Git 倉儲 (Initialize Git repository) - (Project is likely under Git)
    *   [x] 建立 `.gitignore` 檔案 (Create `.gitignore` file) - (Files exist)
*   [ ] ~~**容器化設定 (Containerization Setup):**~~ (已棄用)
    *   [ ] ~~`docker-compose.yml` 已設定，包含 `frontend`, `backend`, `neo4j`, `chroma` 服務~~
    *   [ ] ~~`Dockerfile` 已為 `cognee-frontend` 和 `cognee-backend` 建立~~

**後端開發 (Node.js/Express API)**

*   [x] **LLM 整合 (LLM Integration):**
    *   [x] 選擇並設定使用 Google Gemini（chat 預設 `gemini-pro`，embedding 預設 `text-embedding-004`，可由環境變數設定）
*   [x] **API 端點設計 (API Endpoint Design):**
    *   [x] `POST /ingest`: 接收檔案，處理並存入向量資料庫，可選擇建立知識圖譜
    *   [x] `POST /query`: 接收問題，與 LLM 互動，串流回傳結果
    *   [x] `GET /graph-schema`: 取得 Neo4j 圖譜摘要
    *   [x] `POST /query-graph`: 使用自然語言查詢知識圖譜
    *   [x] `GET /graph/overview`: 取得圖譜概覽數據
    *   [x] `GET /graph/node/:id/neighbors`: 取得特定節點及其鄰居的數據
    *   [x] `GET /chat/history/:sessionId`: 取得特定會話的聊天歷史
    *   [x] `DELETE /chat/history/:sessionId`: 刪除特定會話的聊天歷史
    *   [x] `POST /prompts`: 儲存新的用戶自定義提示
    *   [x] `GET /prompts`: 查詢所有已儲存的用戶自定義提示
    *   [x] `DELETE /prompts/:promptId`: 刪除指定的已儲存提示

... (其他部分保持不變) ...

**部署 (Deployment)**

*   [ ] ~~**Docker化 (Dockerization):**~~ (已棄用)
*   [ ] **前端部署 (Frontend Deployment):**
    *   [ ] (未指定) Vercel, Netlify, GitHub Pages, AWS S3/CloudFront 等
*   [ ] **後端部署 (Backend Deployment):**
    *   [ ] (未指定) Heroku, Google Cloud Run, AWS Elastic Beanstalk, Docker + VPS 等
*   [ ] ~~**資料庫部署 (Database Deployment):**~~
    *   [ ] ~~Neo4j 和 ChromaDB 已整合並在 `docker-compose.yml` 中定義~~ (需手動部署)
*   [ ] **CI/CD 設定 (CI/CD Setup):**
    *   [ ] (未指定) GitHub Actions, GitLab CI, Jenkins 等

... (其他部分保持不變) ...

---
**已知問題與技術債 (Known Issues & Technical Debt)**

*   [ ] **後端測試套件損壞 (Broken Backend Test Suite):**
    *   **問題 (Problem):** 後端測試套件 (`cognee-backend`) 目前完全無法運行。Jest 測試環境存在一個根本性的問題，導致對原始碼檔案 (`*.ts`) 的修改無法在測試執行時被正確加載。
    *   **現象 (Symptom):** 當使用 `overwrite_file_with_block` 等工具修改了 `src` 目錄下的檔案後，運行對應的測試時，測試執行器似乎仍在針對一個舊的、被緩存的檔案版本運行。這導致了所有修復嘗試（無論是修正原始碼邏輯還是測試邏輯）都完全無效。這個問題在 `llmService.test.ts` 和 `textSplitter.test.ts` 的調試過程中被反覆驗證。
    *   **結論 (Conclusion):** 這是一個阻塞性的環境問題，可能源於 Jest 緩存、`ts-jest` 的轉換管道或檔案監視器的配置。在解決這個問題之前，無法進行任何有效的後端測試。**這是最高優先級的技術債。**

---

**學習管理系統（LMS）技術調研 (Learning Management System (LMS) Research)**

*   [ ] **(高優先級) 調研開源學習管理系統 (High Priority - Research Open-Source LMS):**
    *   **目標 (Goal):** 尋找一個合適的開源 LMS 專案作為基礎，以便快速開發包含智慧教育功能的系統。
    *   **環境依賴 (Environment Dependency):**
        *   [ ] **修復調研工具 (Fix Research Tool):** 需要一個可正常運作的 `google_search` 工具來執行 GitHub 專案搜尋。**此為執行本計畫的阻塞性問題。**
    *   **關鍵需求 (Key Requirements):**
        *   **後端 (Backend):** 最好原生使用 Supabase，或後端架構清晰、易於替換為 Supabase。
        *   **角色系統 (Role System):** 必須支持至少三種角色：管理員 (Administrator)、老師 (Teacher)、學生 (Student)，並有對應的登入和權限系統。
        *   **前端 (Frontend):** 現代技術棧，優先考慮 React 或 Next.js。
        *   **架構 (Architecture):** 模組化、易於擴展，以方便未來疊加智慧化功能。
    *   **調研步驟 (Research Steps):**
        *   [ ] **執行關鍵字搜尋 (Perform Keyword Searches)**
        *   [ ] **分析搜尋結果 (Analyze Search Results)**
        *   [ ] **產出建議報告 (Produce Recommendation Report)**
