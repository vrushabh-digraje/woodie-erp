# Woodie ERP

Complete Enterprise Resource Planning (ERP) platform for **Woodie Technical Services Contracting LLC**, built with Node.js, Express, MongoDB, React, Vite, and Tailwind CSS.

## 📁 Repository Structure

This repository is structured as a unified monorepo:

```text
woodie-erp/
├── woodie-erp-backend-main/     # Express REST API, MongoDB models, Puppeteer PDF generators
├── woodie-erp-frontend-main/    # Vite + React + TypeScript frontend SPA
├── .gitignore                   # Root git ignore
└── README.md                    # Project documentation & deployment guide
```

---

## 🚀 Deployment Instructions

### 1. Backend Deployment on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository: `vrushabh-digraje/woodie-erp`.
4. Configure the Web Service settings:
   - **Name:** `woodie-erp-backend` (or your preferred name)
   - **Region:** Frankfurt (EU) or Oregon (US)
   - **Branch:** `main`
   - **Root Directory:** `woodie-erp-backend-main`  *(⚠️ Important: set this root directory)*
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (or `node src/server.js`)
   - **Instance Type:** Free or Starter

5. In the **Environment Variables** section, add:
   | Key | Value / Description |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `MONGODB_URI` | Your MongoDB Atlas connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/woodie_erp?retryWrites=true&w=majority`) |
   | `JWT_SECRET` | A long, secure random secret string for JWT tokens |
   | `CORS_ORIGINS` | Your Vercel frontend URL (e.g. `https://woodie-erp.vercel.app`), comma-separated if multiple |

6. Click **Create Web Service**.
7. Once deployed, copy your Render service URL (e.g. `https://woodie-erp-backend.onrender.com`). You will need this for the frontend!

---

### 2. Frontend Deployment on Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `vrushabh-digraje/woodie-erp`.
4. In the **Configure Project** screen:
   - **Project Name:** `woodie-erp-frontend` (or `woodie-erp`)
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select `woodie-erp-frontend-main` *(⚠️ Important)*
   - **Build Command:** `npm run build` (Default)
   - **Output Directory:** `dist` (Default)
   - **Install Command:** `npm install` (Default)

5. Expand the **Environment Variables** section and add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://your-render-backend-url.onrender.com/api` |

   *(Note: Ensure `/api` is included at the end of the URL).*

6. Click **Deploy**.
7. Once deployment finishes, add your production Vercel domain (e.g. `https://woodie-erp-frontend.vercel.app`) to the `CORS_ORIGINS` environment variable on your Render backend service.

---

## 🛠️ Local Development

### Backend
```bash
cd woodie-erp-backend-main
npm install
npm run dev
```
Backend runs on `http://localhost:5000`.

### Frontend
```bash
cd woodie-erp-frontend-main
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.
