"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./utils/resolve-paths.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const projectDir = path_1.default.resolve();
async function startServer() {
    // Dynamic imports to ensure resolve-paths runs and patches Module._nodeModulePaths first
    const express = (await import("express")).default;
    const cors = (await import("cors")).default;
    const helmet = (await import("helmet")).default;
    const rateLimit = (await import("express-rate-limit")).default;
    const { shiftUploadRoute } = await import("./routes/shift.routes.js");
    const { reviewQueueRoute } = await import("./routes/review.routes.js");
    const { usersRoute } = await import("./routes/users.routes.js");
    const { aiRouter } = await import("./routes/ai.routes.js");
    const accountingRouter = (await import("./routes/accounting.routes.js")).default;
    const accuracyRouter = (await import("./routes/accuracy.routes.js")).default;
    const app = express();
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const isProd = process.env.NODE_ENV === "production";
    // 1. Mount API Routes BEFORE static or catch-all middlewares
    app.use(cors());
    app.use(express.json({ limit: "10mb" }));
    // Disable Helmet in development to prevent HMR socket blocks
    if (isProd) {
        app.use(helmet());
    }
    else {
        app.use(helmet({ contentSecurityPolicy: false }));
    }
    // Rate Limiter for API calls
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        message: "Too many requests, please try again later."
    });
    app.use("/api/", apiLimiter);
    // Mount API paths
    app.use("/api/v1/shifts", shiftUploadRoute);
    app.use("/api/v1/review", reviewQueueRoute);
    app.use("/api/v1/users", usersRoute);
    app.use("/api/v1/ai", aiRouter);
    app.use("/api/v1/accounting", accountingRouter);
    app.use("/api/v1/accuracy", accuracyRouter);
    app.get("/api/health", (req, res) => {
        res.json({ status: "ok", message: "PetroOps Enterprise API active." });
    });
    // 2. DEVELOPMENT HMR & MODULE ROUTING (Vite Middleware in custom mode)
    if (!isProd) {
        console.log("[Server] Running in DEVELOPMENT mode. Mounting Vite Dev middleware...");
        const { createServer } = await eval('import("vite")');
        const vite = await createServer({
            server: { middlewareMode: true },
            appType: "custom"
        });
        // Express prioritizes Vite's native compiler assets (/@vite/client, /src/main.tsx)
        app.use(vite.middlewares);
        // Development catch-all HTML fallback with Vite Hot-Reload injection
        app.get("*", async (req, res, next) => {
            // Bypass static dots and API paths
            if (req.path.startsWith("/api/") || req.path.includes(".")) {
                return next();
            }
            try {
                const url = req.originalUrl;
                const indexHtmlPath = path_1.default.resolve(projectDir, "index.html");
                if (fs_1.default.existsSync(indexHtmlPath)) {
                    let html = fs_1.default.readFileSync(indexHtmlPath, "utf-8");
                    html = await vite.transformIndexHtml(url, html);
                    res.status(200).set({ "Content-Type": "text/html" }).send(html);
                }
                else {
                    res.status(404).send("index.html template not found");
                }
            }
            catch (err) {
                vite.ssrFixStacktrace(err);
                next(err);
            }
        });
    }
    else {
        // 3. PRODUCTION Static Serving & SPA Catch-all
        console.log("[Server] Running in PRODUCTION mode. Serving pre-compiled static assets...");
        const distPath = path_1.default.join(projectDir, "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path_1.default.join(distPath, "index.html"));
        });
    }
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
startServer().catch(err => {
    console.error("Critical server bootstrap error:", err);
});
