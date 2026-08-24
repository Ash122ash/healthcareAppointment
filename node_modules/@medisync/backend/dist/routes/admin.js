"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_1 = require("../middlewares/auth");
const email_1 = require("../services/email");
const router = (0, express_1.Router)();
// Secure all admin routes with authentication and admin role guard
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(client_1.Role.ADMIN));
// Endpoint: Admin dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const totalPatients = await prisma_1.default.user.count({ where: { role: client_1.Role.PATIENT } });
        const totalDoctors = await prisma_1.default.user.count({ where: { role: client_1.Role.DOCTOR } });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        const todayAppointments = await prisma_1.default.appointment.count({
            where: {
                slotStart: {
                    gte: today,
                    lte: endOfToday,
                },
                status: {
                    not: 'CANCELLED',
                },
            },
        });
        const pendingFailedNotifications = await prisma_1.default.emailLog.count({
            where: {
                status: client_1.EmailStatus.FAILED,
            },
        });
        return res.json({
            status: 'success',
            stats: {
                totalPatients,
                totalDoctors,
                todayAppointments,
                pendingFailedNotifications,
            },
        });
    }
    catch (err) {
        console.error('Error fetching admin stats:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch statistics.' });
    }
});
// Endpoint: Create doctor profile
router.post('/doctors', async (req, res) => {
    const { email, password, name, phone, specialization, bio, workingHours, slotDurationMinutes, consultationFee } = req.body;
    try {
        // Validate inputs
        if (!email || !password || !name || !specialization || !workingHours) {
            return res.status(400).json({ error: 'Bad Request', message: 'Missing required doctor registration fields.' });
        }
        // Check if email already registered
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Bad Request', message: 'Email address already in use.' });
        }
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        // Create user and profile in a transaction
        const newDoctor = await prisma_1.default.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    name,
                    phone: phone || null,
                    role: client_1.Role.DOCTOR,
                },
            });
            const profile = await tx.doctorProfile.create({
                data: {
                    userId: user.id,
                    specialization,
                    bio: bio || '',
                    workingHours: workingHours, // expects array of slots [{ weekday, start, end }]
                    slotDurationMinutes: slotDurationMinutes || 30,
                    consultationFee: parseFloat(consultationFee) || 0,
                },
            });
            return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                profile,
            };
        });
        return res.status(201).json({
            status: 'success',
            doctor: newDoctor,
        });
    }
    catch (err) {
        console.error('Error creating doctor:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create doctor profile.' });
    }
});
// Endpoint: Fetch list of patients
router.get('/patients', async (req, res) => {
    try {
        const patients = await prisma_1.default.user.findMany({
            where: { role: client_1.Role.PATIENT },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ status: 'success', patients });
    }
    catch (err) {
        console.error('Error fetching patients:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patients list.' });
    }
});
// Endpoint: Deactivate/activate user (patient or doctor)
router.patch('/users/:id/toggle-active', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma_1.default.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id },
            data: {
                isActive: !user.isActive,
            },
            select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
            },
        });
        return res.json({
            status: 'success',
            message: `User account has been ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully.`,
            user: updatedUser,
        });
    }
    catch (err) {
        console.error('Error toggling user active status:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to toggle active status.' });
    }
});
// Endpoint: List failed notifications
router.get('/notifications/failed', async (req, res) => {
    try {
        const failedLogs = await prisma_1.default.emailLog.findMany({
            where: {
                status: client_1.EmailStatus.FAILED,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json({ status: 'success', logs: failedLogs });
    }
    catch (err) {
        console.error('Error fetching failed notifications:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch failed logs.' });
    }
});
// Endpoint: Retry failed notification send manually
router.post('/notifications/failed/:id/retry', async (req, res) => {
    const { id } = req.params;
    try {
        const success = await (0, email_1.sendEmailFromLog)(id);
        if (success) {
            return res.json({ status: 'success', message: 'Notification resent successfully.' });
        }
        else {
            return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to send notification. See logs for details.' });
        }
    }
    catch (err) {
        console.error(`Error retrying email log ${id}:`, err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'An error occurred during retry attempt.' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map