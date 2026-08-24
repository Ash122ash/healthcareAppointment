import { z } from 'zod';
export declare const UserRoleSchema: z.ZodEnum<["PATIENT", "DOCTOR", "ADMIN"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const AppointmentStatusSchema: z.ZodEnum<["HELD", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name: string;
    phone?: string | undefined;
}, {
    email: string;
    password: string;
    name: string;
    phone?: string | undefined;
}>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
