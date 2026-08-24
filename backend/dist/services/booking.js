"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingConflictError = void 0;
exports.holdSlot = holdSlot;
exports.confirmBooking = confirmBooking;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../utils/prisma"));
const ai_1 = require("./ai");
class BookingConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BookingConflictError';
    }
}
exports.BookingConflictError = BookingConflictError;
async function holdSlot(doctorId, slotStart, slotEnd, patientId) {
    // Check if doctor profile exists
    const doctor = await prisma_1.default.doctorProfile.findUnique({
        where: { userId: doctorId },
    });
    if (!doctor) {
        throw new BookingConflictError('Doctor profile not found.');
    }
    // Check if slot is already occupied by a confirmed appointment
    const existingAppt = await prisma_1.default.appointment.findFirst({
        where: {
            doctorId,
            slotStart,
            status: {
                in: ['CONFIRMED', 'HELD', 'COMPLETED'],
            },
        },
    });
    if (existingAppt) {
        throw new BookingConflictError('This slot is already booked.');
    }
    // Check for any active, unexpired holds on this slot
    const now = new Date();
    const existingHold = await prisma_1.default.slotHold.findFirst({
        where: {
            doctorId,
            slotStart,
            expiresAt: {
                gt: now,
            },
        },
    });
    if (existingHold) {
        if (existingHold.patientId === patientId) {
            // Patient already holds this slot, extend it
            return prisma_1.default.slotHold.update({
                where: { id: existingHold.id },
                data: {
                    expiresAt: new Date(Date.now() + 90 * 1000), // 90 seconds expiry
                },
            });
        }
        throw new BookingConflictError('This slot is temporarily locked by another patient.');
    }
    // Create new hold
    return prisma_1.default.slotHold.create({
        data: {
            doctorId,
            patientId,
            slotStart,
            slotEnd,
            expiresAt: new Date(Date.now() + 90 * 1000),
        },
    });
}
async function confirmBooking(holdId, patientId, doctorId, slotStart, slotEnd, symptomsText) {
    // Execute database transaction at Serializable isolation level
    const appointment = await prisma_1.default.$transaction(async (tx) => {
        const now = new Date();
        // 1. Verify hold exists and has not expired
        const hold = await tx.slotHold.findUnique({
            where: { id: holdId },
        });
        if (!hold || hold.expiresAt < now || hold.patientId !== patientId) {
            throw new BookingConflictError('Your session lock on this slot has expired. Please select the slot again.');
        }
        // 2. Double check that no concurrent transaction has booked this slot
        const existingAppt = await tx.appointment.findFirst({
            where: {
                doctorId,
                slotStart,
                status: {
                    in: ['CONFIRMED', 'HELD', 'COMPLETED'],
                },
            },
        });
        if (existingAppt) {
            throw new BookingConflictError('This slot has just been booked by another patient. Please select another slot.');
        }
        // 3. Create the appointment (mark HELD or CONFIRMED)
        const appt = await tx.appointment.create({
            data: {
                patientId,
                doctorId,
                slotStart,
                slotEnd,
                status: 'CONFIRMED', // Confirm booking
            },
        });
        // 4. Create symptom form entry
        await tx.symptomForm.create({
            data: {
                appointmentId: appt.id,
                symptomsText,
            },
        });
        // 5. Delete the hold
        await tx.slotHold.delete({
            where: { id: holdId },
        });
        return appt;
    }, {
        isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
    });
    // Asynchronously trigger AI pre-visit pipeline and email notifications
    // (Failures will degrade gracefully inside the AI services and not affect checkout success)
    triggerPreVisitPipeline(appointment.id, symptomsText).catch((err) => {
        console.error(`AI Pipeline trigger error for appointment ${appointment.id}:`, err);
    });
    return appointment;
}
async function triggerPreVisitPipeline(appointmentId, symptomsText) {
    const result = await (0, ai_1.generatePreVisitSummary)(symptomsText);
    await prisma_1.default.preVisitSummary.create({
        data: {
            appointmentId,
            urgencyLevel: result.urgencyLevel,
            chiefComplaint: result.chiefComplaint,
            suggestedQuestions: result.suggestedQuestions,
            rawLLMResponse: result.rawLLMResponse,
            status: result.status,
        },
    });
    console.log(`Pre-visit AI pipeline completed for appointment ${appointmentId}`);
}
//# sourceMappingURL=booking.js.map