import { Router } from 'express';
import { getAuthUrl, saveGoogleTokens } from '../services/googleCalendar';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Endpoint: Generate Google Calendar Auth Redirect URL
router.get('/google', authenticateToken, (req, res) => {
  try {
    const userId = req.user!.id;
    const url = getAuthUrl(userId);
    return res.json({ status: 'success', url });
  } catch (err) {
    console.error('Error generating Google Calendar OAuth URL:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to generate connection URL.' });
  }
});

// Endpoint: Google Calendar OAuth Callback
router.get('/google/callback', async (req, res) => {
  const { code, state: userId } = req.query;

  try {
    if (!code || !userId) {
      return res.status(400).send('OAuth callback parameters missing.');
    }

    await saveGoogleTokens(String(code), String(userId));

    // Redirect user back to frontend profile/dashboard
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/patient/dashboard?google_sync=success`);
  } catch (err) {
    console.error('Error handling Google Calendar OAuth callback:', err);
    return res.status(500).send('OAuth sync failed. Please try again.');
  }
});

// Endpoint: Generate and download an .ics file for an appointment
router.get('/ics/:appointmentId', authenticateToken, async (req, res) => {
  const { appointmentId } = req.params;
  const { prisma } = require('../utils/prisma.js') as any; // Dynamic require or import

  try {
    const appt = await (prisma || (await import('../utils/prisma.js')).default).appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appt) {
      return res.status(404).send('Appointment not found.');
    }

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const dtStart = formatDate(new Date(appt.slotStart));
    const dtEnd = formatDate(new Date(appt.slotEnd));
    const now = formatDate(new Date());

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MediSync//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${appt.id}@medisync.com
DTSTAMP:${now}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:MediSync Consultation: ${appt.patient.name} & Dr. ${appt.doctor.user.name}
DESCRIPTION:Healthcare appointment booked via MediSync.
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`.trim();

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="appointment-${appt.id}.ics"`);
    return res.send(icsContent);

  } catch (err) {
    console.error('Error generating ICS file:', err);
    return res.status(500).send('Failed to generate calendar file.');
  }
});

export default router;
