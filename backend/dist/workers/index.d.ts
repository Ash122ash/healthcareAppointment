import { Queue } from 'bullmq';
export declare const emailQueue: Queue<any, any, string, any, any, string>;
export declare function queueEmailSend(logId: string): Promise<void>;
export declare function startPeriodicSweepers(): void;
