"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = void 0;
exports.queueEmailSend = queueEmailSend;
exports.startPeriodicSweepers = startPeriodicSweepers;
const bullmq_1 = require("bullmq");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../utils/prisma"));
const email_1 = require("../services/email");
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
// Parse Redis connection details
let redisHost = '127.0.0.1';
let redisPort = 6379;
try {
    const parsed = new URL(REDIS_URL);
    redisHost = parsed.hostname;
    redisPort = parseInt(parsed.port) || 6379;
}
catch (e) {
    console.warn('Invalid REDIS_URL format, using default localhost connection.');
}
const connection = {
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
};
// 1. Initialize BullMQ Queue for sending emails
exports.emailQueue = new bullmq_1.Queue('email-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000, // retry after 5s, 10s, 20s
        },
    },
});
// Helper: safe enqueue function
async function queueEmailSend(logId) {
    try {
        await exports.emailQueue.add('send-email', { logId });
    }
    catch (err) {
        console.warn(`Redis connection failed. Falling back to immediate email dispatch for log ${logId}`);
        // If Redis is offline, send immediately to avoid blocking notifications
        (0, email_1.sendEmailFromLog)(logId).catch((e) => {
            console.error(`Immediate dispatch backup failed for email log ${logId}:`, e);
        });
    }
}
// 2. Initialize Worker to process email sending
let emailWorker = null;
try {
    emailWorker = new bullmq_1.Worker('email-queue', async (job) => {
        const { logId } = job.data;
        console.log(`Processing email job for log ID: ${logId}`);
        const success = await (0, email_1.sendEmailFromLog)(logId);
        if (!success) {
            throw new Error(`Email dispatch failed for log ID: ${logId}`);
        }
    }, { connection });
    emailWorker.on('failed', (job, err) => {
        console.error(`Job failed for email log ID ${job?.data.logId}:`, err.message);
    });
}
catch (err) {
    console.warn('BullMQ Worker could not connect to Redis. Email queue processing disabled. Immediate dispatch active.');
}
// 3. Periodic Database Sweepers (Fail-Safe using Interval timers to work offline)
function startPeriodicSweepers() {
    console.log('Starting MediSync Background Database Sweepers...');
    // Sweep 1: Clean up expired SlotHolds (Every 1 minute)
    setInterval(async () => {
        try {
            const now = new Date();
            const deleted = await prisma_1.default.slotHold.deleteMany({
                where: {
                    expiresAt: {
                        lt: now,
                    },
                },
            });
            if (deleted.count > 0) {
                console.log(`[SWEEPER] Pruned ${deleted.count} expired slot holds.`);
            }
        }
        catch (err) {
            console.error('[SWEEPER] Expired hold cleanup failed:', err.message);
        }
    }, 60 * 1000);
    // Sweep 2: Dispatch scheduled Medication Reminders (Every 1 minute)
    setInterval(async () => {
        try {
            const now = new Date();
            const reminders = await prisma_1.default.medicationReminder.findMany({
                where: {
                    scheduledTime: {
                        lte: now,
                    },
                    sent: false,
                },
                include: {
                    patient: true,
                },
            });
            for (const rem of reminders) {
                // Send email and mark completed
                const emailBody = `Friendly reminder to take your medicine: <strong>${rem.medicine}</strong>.`;
                // Log email log
                const log = await prisma_1.default.emailLog.create({
                    data: {
                        toEmail: rem.patient.email,
                        type: client_1.EmailType.REMINDER,
                        payload: {
                            patientName: rem.patient.name,
                            medicine: rem.medicine,
                        },
                    },
                });
                // Queue send
                await queueEmailSend(log.id);
                // Mark sent
                await prisma_1.default.medicationReminder.update({
                    where: { id: rem.id },
                    data: {
                        sent: true,
                        sentAt: now,
                    },
                });
            }
            if (reminders.length > 0) {
                console.log(`[SWEEPER] Enqueued ${reminders.length} medication reminders.`);
            }
        }
        catch (err) {
            console.error('[SWEEPER] Medication reminders dispatch failed:', err.message);
        }
    }, 60 * 1000);
    // Sweep 3: Queue 24h and 1h Appointment Reminders (Every 10 minutes)
    setInterval(async () => {
        try {
            const now = new Date();
            const oneHourLimit = new Date(now.getTime() + 60 * 60 * 1000);
            const twentyFourHourLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            // Find appointments in 24h range that haven't received reminder
            // We can query appointments where slotStart is in range
            // To prevent duplicate reminders, we'll store a flag or check if email log already exists in payloads.
            // For simplicity, let's look up CONFIRMED appointments starting in the next 24 hours.
            const upcoming = await prisma_1.default.appointment.findMany({
                where: {
                    status: 'CONFIRMED',
                    slotStart: {
                        gt: now,
                        lte: twentyFourHourLimit,
                    },
                },
                include: {
                    patient: true,
                    doctor: { include: { user: true } },
                },
            });
            for (const appt of upcoming) {
                const timeDiff = appt.slotStart.getTime() - now.getTime();
                const hoursLeft = timeDiff / (60 * 60 * 1000);
                // If around 24 hours (23h to 24h) or around 1 hour (0.9h to 1h)
                const is24hWindow = hoursLeft >= 23 && hoursLeft <= 24.1;
                const is1hWindow = hoursLeft >= 0.9 && hoursLeft <= 1.1;
                if (is24hWindow || is1hWindow) {
                    // Check if we logged this type of reminder already to avoid spam
                    const typeName = is24hWindow ? '24h-reminder' : '1h-reminder';
                    const existing = await prisma_1.default.emailLog.findFirst({
                        where: {
                            toEmail: appt.patient.email,
                            type: client_1.EmailType.REMINDER,
                            payload: {
                                path: ['appointmentId'],
                                equals: appt.id,
                            },
                        },
                    });
                    // Wait: query by json payload fields can be tricky depending on prisma versions.
                    // Let's check via local comparison if database JSON payload search is complex.
                    // We can fetch recent email logs for this user to check duplicates.
                    const userLogs = await prisma_1.default.emailLog.findMany({
                        where: { toEmail: appt.patient.email, type: client_1.EmailType.REMINDER },
                        take: 10,
                    });
                    const alreadySent = userLogs.some((l) => {
                        const p = l.payload;
                        return p && p.appointmentId === appt.id && p.window === typeName;
                    });
                    if (!alreadySent) {
                        const log = await prisma_1.default.emailLog.create({
                            data: {
                                toEmail: appt.patient.email,
                                type: client_1.EmailType.REMINDER,
                                payload: {
                                    appointmentId: appt.id,
                                    patientName: appt.patient.name,
                                    doctorName: appt.doctor.user.name,
                                    slotStart: appt.slotStart,
                                    window: typeName,
                                },
                            },
                        });
                        await queueEmailSend(log.id);
                        console.log(`[SWEEPER] Queued ${typeName} for appointment ${appt.id}`);
                    }
                }
            }
        }
        catch (err) {
            console.error('[SWEEPER] Appointment reminders check failed:', err.message);
        }
    }, 10 * 60 * 1000);
}
//# sourceMappingURL=index.js.map