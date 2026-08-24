import { z } from 'zod';
export const UserRoleSchema = z.enum(['PATIENT', 'DOCTOR', 'ADMIN']);
export const AppointmentStatusSchema = z.enum([
    'HELD',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED',
    'NO_SHOW',
]);
// Login Validation Schema
export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
// Register Validation Schema
export const RegisterSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
});
//# sourceMappingURL=index.js.map