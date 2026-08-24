"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const doctor_1 = __importDefault(require("./routes/doctor"));
const patient_1 = __importDefault(require("./routes/patient"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const workers_1 = require("./workers");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Enable CORS with credentials support for HTTP-only cookies
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// API Routes
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/auth', calendar_1.default);
app.use('/api/v1/admin', admin_1.default);
app.use('/api/v1/doctor', doctor_1.default);
app.use('/api/v1/patient', patient_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'MediSync Backend' });
});
// Centralized error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.name || 'InternalServerError',
        message: err.message || 'An unexpected error occurred.',
    });
});
// Start background sweepers
(0, workers_1.startPeriodicSweepers)();
app.listen(port, () => {
    console.log(`MediSync Backend running on port ${port}`);
});
//# sourceMappingURL=server.js.map