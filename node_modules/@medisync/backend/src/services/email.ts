import nodemailer from 'nodemailer';
import { EmailType, EmailStatus } from '@prisma/client';
import prisma from '../utils/prisma';

const SENDGRID_KEY = process.env.SENDGRID_API_KEY || 'dummy-key-for-now';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@medisync.com';

// Configure transporter
let transporter: nodemailer.Transporter;

if (SENDGRID_KEY.startsWith('dummy')) {
  console.log('Nodemailer using mock/console transport (no valid SendGrid API key).');
  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows',
    buffer: true,
  });
} else {
  // Use SendGrid SMTP details
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: SENDGRID_KEY,
    },
  });
}

export async function logEmail(toEmail: string, type: EmailType, payload: any) {
  return prisma.emailLog.create({
    data: {
      toEmail,
      type,
      payload,
      status: EmailStatus.QUEUED,
    },
  });
}

export async function sendEmailFromLog(logId: string): Promise<boolean> {
  const log = await prisma.emailLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    console.error(`Email log not found: ${logId}`);
    return false;
  }

  // Update last attempt time
  await prisma.emailLog.update({
    where: { id: logId },
    data: {
      lastAttemptAt: new Date(),
    },
  });

  try {
    let subject = 'MediSync Notification';
    let html = '';

    const payload = log.payload as any;

    if (log.type === EmailType.BOOKING_CONFIRM) {
      subject = 'MediSync Appointment Booking Confirmed';
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Appointment Confirmed</h2>
          <p>Hello ${payload.patientName || 'Patient'},</p>
          <p>Your appointment with <strong>${payload.doctorName || 'Doctor'}</strong> has been booked successfully.</p>
          <p><strong>Time:</strong> ${new Date(payload.slotStart).toLocaleString()}</p>
          <p>Thank you for choosing MediSync!</p>
        </div>
      `;
    } else if (log.type === EmailType.REMINDER) {
      subject = 'MediSync Appointment Reminder';
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Upcoming Appointment Reminder</h2>
          <p>Hello ${payload.patientName || 'Patient'},</p>
          <p>This is a reminder for your upcoming appointment with <strong>${payload.doctorName || 'Doctor'}</strong>.</p>
          <p><strong>Time:</strong> ${new Date(payload.slotStart).toLocaleString()}</p>
        </div>
      `;
    } else if (log.type === EmailType.CANCELLATION) {
      subject = 'MediSync Appointment Cancelled';
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Appointment Cancelled</h2>
          <p>Hello ${payload.patientName || 'Patient'},</p>
          <p>We regret to inform you that your appointment with <strong>${payload.doctorName || 'Doctor'}</strong> scheduled for ${new Date(payload.slotStart).toLocaleString()} has been cancelled.</p>
          <p>Reason: ${payload.reason || 'Not specified.'}</p>
          <p>Please log in to your portal to reschedule or choose another slot.</p>
        </div>
      `;
    } else if (log.type === EmailType.LEAVE_NOTICE) {
      subject = 'MediSync Schedule Update';
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Doctor Leave Update</h2>
          <p>Hello ${payload.patientName || 'Patient'},</p>
          <p>Your doctor <strong>${payload.doctorName || 'Doctor'}</strong> has requested leave on ${new Date(payload.leaveDate).toLocaleDateString()}.</p>
          <p>Your appointment has been cancelled and is marked for reschedule. Please log in to choose another slot.</p>
        </div>
      `;
    }

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: log.toEmail,
      subject,
      html,
    });

    if (SENDGRID_KEY.startsWith('dummy')) {
      // In console transport, log to console for debugging
      console.log(`[MOCK EMAIL SENT to ${log.toEmail}] Subject: ${subject}`);
      console.log(info.message.toString());
    }

    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: EmailStatus.SENT,
      },
    });

    return true;
  } catch (err: any) {
    console.error(`Failed to send email log ${logId}:`, err);
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: EmailStatus.FAILED,
        retryCount: {
          increment: 1,
        },
      },
    });
    return false;
  }
}
