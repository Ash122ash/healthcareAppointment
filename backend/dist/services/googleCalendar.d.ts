export declare function getAuthUrl(userId: string): string;
export declare function saveGoogleTokens(code: string, userId: string): Promise<void>;
export declare function createGoogleCalendarEvent(appointmentId: string): Promise<void>;
export declare function deleteGoogleCalendarEvent(appointmentId: string): Promise<void>;
