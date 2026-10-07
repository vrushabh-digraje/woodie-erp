const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { connectDb } = require("./config/db");
const { seedUsers } = require("./config/seedUsers");
const inquiryRoutes = require("./routes/inquiryRoutes");
const teamRoutes = require("./routes/teamRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const boqRoutes = require("./routes/boqRoutes");
const workOrderRoutes = require("./routes/workOrderRoutes");
const materialRoutes = require("./routes/materialRoutes");
const materialRequestRoutes = require("./routes/materialRequestRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const { startInvoiceFollowUpScheduler } = require("./scheduler/invoiceFollowUp");

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT) || 5000;

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://192.168.0.55:5173",
  "https://woodie-erp-frontend.vercel.app",
];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : defaultOrigins;

function requireProductionEnv() {
  const missing = [];
  if (!process.env.MONGODB_URI) missing.push("MONGODB_URI");
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (missing.length === 0) return;

  // eslint-disable-next-line no-console
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}\n` +
      "On Render: open your Web Service → Environment → add them (do not rely on .env; it is not deployed).",
  );
  process.exit(1);
}

if (isProduction) {
  requireProductionEnv();
}

const app = express();

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

app.use(express.json());

app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/boq/quotations", boqRoutes);
app.use("/api/workorders", workOrderRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/material-requests", materialRequestRoutes);
app.use("/api/invoices", invoiceRoutes);

// Serve uploaded site-visit media.
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use((error, _req, res, _next) => {
  // Keep errors clean for API clients.
  res.status(500).json({ message: error.message || "Server error" });
});

connectDb()
  .then(() => seedUsers())
  .then(() => {
    startInvoiceFollowUpScheduler();

    app.listen(port, "0.0.0.0", () => {
      // eslint-disable-next-line no-console
      console.log(`Backend server running on port ${port}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Startup failed:", error.message);
    if (!process.env.MONGODB_URI) {
      // eslint-disable-next-line no-console
      console.error("Hint: set MONGODB_URI (e.g. MongoDB Atlas connection string) in Render Environment.");
    } else if (isProduction) {
      // eslint-disable-next-line no-console
      console.error(
        "Hint: in MongoDB Atlas → Network Access, allow 0.0.0.0/0 (or Render egress IPs) for cloud deploys.",
      );
    }
    process.exit(1);
  });
