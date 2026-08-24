export declare class BookingConflictError extends Error {
    constructor(message: string);
}
export declare function holdSlot(doctorId: string, slotStart: Date, slotEnd: Date, patientId: string): Promise<{
    id: string;
    patientId: string;
    doctorId: string;
    slotStart: Date;
    slotEnd: Date;
    expiresAt: Date;
}>;
export declare function confirmBooking(holdId: string, patientId: string, doctorId: string, slotStart: Date, slotEnd: Date, symptomsText: string): Promise<{
    id: string;
    createdAt: Date;
    status: import(".prisma/client").$Enums.AppointmentStatus;
    patientId: string;
    doctorId: string;
    slotStart: Date;
    slotEnd: Date;
    googleCalendarEventIdPatient: string | null;
    googleCalendarEventIdDoctor: string | null;
}>;
