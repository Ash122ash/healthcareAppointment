import { z } from 'zod';

export const UserRoleSchema = z.enum(['PATIENT', 'DOCTOR', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AppointmentStatusSchema = z.enum([
  'HELD',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

// Login Validation Schema
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// Register Validation Schema
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

