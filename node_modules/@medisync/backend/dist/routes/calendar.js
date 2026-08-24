"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const googleCalendar_1 = require("../services/googleCalendar");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Endpoint: Generate Google Calendar Auth Redirect URL
router.get('/google', auth_1.authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const url = (0, googleCalendar_1.getAuthUrl)(userId);
        return res.json({ status: 'success', url });
    }
    catch (err) {
        console.error('Error generating Google Calendar OAuth URL:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to generate connection URL.' });
    }
});
// Endpoint: Google Calendar OAuth Callback
router.get('/google/callback', async (req, res) => {
    const { code, state: userId } = req.query;
    try {
        if (!code || !userId) {
            return res.status(400).send('OAuth callback parameters missing.');
        }
        await (0, googleCalendar_1.saveGoogleTokens)(String(code), String(userId));
        // Redirect user back to frontend profile/dashboard
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/patient/dashboard?google_sync=success`);
    }
    catch (err) {
        console.error('Error handling Google Calendar OAuth callback:', err);
        return res.status(500).send('OAuth sync failed. Please try again.');
    }
});
exports.default = router;
//# sourceMappingURL=calendar.js.map