import { UrgencyLevel, LLMStatus } from '@prisma/client';
export interface PreVisitResult {
    urgencyLevel: UrgencyLevel;
    chiefComplaint: string;
    suggestedQuestions: string[];
    rawLLMResponse: string;
    status: LLMStatus;
}
export interface PostVisitResult {
    patientFriendlyText: string;
    medicationSchedule: {
        medicine: string;
        dosage: string;
        frequency: string;
        durationDays: number;
        instructions?: string;
    }[];
    followUpSteps: string[];
    status: LLMStatus;
}
export declare function generatePreVisitSummary(symptoms: string): Promise<PreVisitResult>;
export declare function generatePostVisitSummary(notes: string): Promise<PostVisitResult>;
