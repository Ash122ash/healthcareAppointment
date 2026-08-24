import { EmailType } from '@prisma/client';
export declare function logEmail(toEmail: string, type: EmailType, payload: any): Promise<{
    id: string;
    createdAt: Date;
    toEmail: string;
    type: import(".prisma/client").$Enums.EmailType;
    status: import(".prisma/client").$Enums.EmailStatus;
    retryCount: number;
    lastAttemptAt: Date | null;
    payload: import("@prisma/client/runtime/library").JsonValue;
}>;
export declare function sendEmailFromLog(logId: string): Promise<boolean>;
