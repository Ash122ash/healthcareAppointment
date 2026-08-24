import { google } from 'googleapis';
import prisma from '../utils/prisma';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy-client-id';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/v1/auth/google/callback';

function getOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(userId: string): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: userId,
    prompt: 'consent',
  });
}

export async function saveGoogleTokens(code: string, userId: string) {
  const isDummy = CLIENT_ID.startsWith('dummy') || CLIENT_SECRET.startsWith('dummy');

  if (isDummy) {
    console.log(`[MOCK GOOGLE OAUTH] Exchanged code for user ${userId}`);
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: 'mock-access-token',
        googleRefreshToken: 'mock-refresh-token',
      },
    });
    return;
  }

  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token || undefined,
    },
  });
}

export async function createGoogleCalendarEvent(appointmentId: string) {
  const isDummy = CLIENT_ID.startsWith('dummy') || CLIENT_SECRET.startsWith('dummy');

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appt) return;

    const patient = appt.patient;
    const doctor = appt.doctor.user;

    const eventTitle = `MediSync Consultation: ${patient.name} & ${doctor.name}`;
    const eventDescription = `MediSync healthcare appointment. Status: CONFIRMED.`;

    if (isDummy) {
      console.log(`[MOCK GOOGLE CALENDAR] Event Created for Appointment ${appointmentId}:`);
      console.log(`- Title: ${eventTitle}`);
      console.log(`- Time: ${appt.slotStart} to ${appt.slotEnd}`);
      
      // Update appt with mock event IDs
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          googleCalendarEventIdPatient: `mock-event-patient-${appointmentId}`,
          googleCalendarEventIdDoctor: `mock-event-doctor-${appointmentId}`,
        },
      });
      return;
    }

    // Sync Patient Calendar
    if (patient.googleRefreshToken) {
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials({
        refresh_token: patient.googleRefreshToken,
      });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: eventTitle,
          description: eventDescription,
          start: { dateTime: appt.slotStart.toISOString() },
          end: { dateTime: appt.slotEnd.toISOString() },
        },
      });
      if (response.data.id) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { googleCalendarEventIdPatient: response.data.id },
        });
      }
    }

    // Sync Doctor Calendar
    if (doctor.googleRefreshToken) {
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials({
        refresh_token: doctor.googleRefreshToken,
      });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: eventTitle,
          description: eventDescription,
          start: { dateTime: appt.slotStart.toISOString() },
          end: { dateTime: appt.slotEnd.toISOString() },
        },
      });
      if (response.data.id) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { googleCalendarEventIdDoctor: response.data.id },
        });
      }
    }
  } catch (err) {
    console.error(`Google Calendar Event Create failed for Appt ${appointmentId}:`, err);
  }
}

export async function deleteGoogleCalendarEvent(appointmentId: string) {
  const isDummy = CLIENT_ID.startsWith('dummy') || CLIENT_SECRET.startsWith('dummy');

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appt) return;

    if (isDummy) {
      console.log(`[MOCK GOOGLE CALENDAR] Event Deleted for Appointment ${appointmentId}`);
      return;
    }

    // Delete Patient Event
    if (appt.patient.googleRefreshToken && appt.googleCalendarEventIdPatient) {
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials({ refresh_token: appt.patient.googleRefreshToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: appt.googleCalendarEventIdPatient,
      });
    }

    // Delete Doctor Event
    if (appt.doctor.user.googleRefreshToken && appt.googleCalendarEventIdDoctor) {
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials({ refresh_token: appt.doctor.user.googleRefreshToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: appt.googleCalendarEventIdDoctor,
      });
    }
  } catch (err) {
    console.error(`Google Calendar Event Delete failed for Appt ${appointmentId}:`, err);
  }
}
