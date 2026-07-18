"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Import routers
const auth_1 = __importDefault(require("./routes/auth"));
const cases_1 = __importDefault(require("./routes/cases"));
const escalations_1 = __importDefault(require("./routes/escalations"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const admin_1 = __importDefault(require("./routes/admin"));
const export_1 = __importDefault(require("./routes/export"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable CORS
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for local dev environment
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Express request JSON body parser with increased limit to support base64 document uploads
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// Log middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Bind routers to API prefix paths
app.use('/api/auth', auth_1.default);
app.use('/api/cases', cases_1.default);
app.use('/api/escalations', escalations_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/export', export_1.default);
// Global 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'An unexpected internal server error occurred',
    });
});
// Start the express server
app.listen(PORT, () => {
    console.log(`🚀 Partner CRM Server running on http://localhost:${PORT}`);
});
