import { Router } from 'express';
import bcrypt from 'bcrypt';
import { Role, EmailStatus, EmailType } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { sendEmailFromLog } from '../services/email';

const router = Router();

// Secure all admin routes with authentication and admin role guard
router.use(authenticateToken);
router.use(requireRole(Role.ADMIN));

// Endpoint: Admin dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalPatients = await prisma.user.count({ where: { role: Role.PATIENT } });
    const totalDoctors = await prisma.user.count({ where: { role: Role.DOCTOR } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const todayAppointments = await prisma.appointment.count({
      where: {
        slotStart: {
          gte: today,
          lte: endOfToday,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    });

    const pendingFailedNotifications = await prisma.emailLog.count({
      where: {
        status: EmailStatus.FAILED,
      },
    });

    return res.json({
      status: 'success',
      stats: {
        totalPatients,
        totalDoctors,
        todayAppointments,
        pendingFailedNotifications,
      },
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch statistics.' });
  }
});

// Endpoint: List all doctor profiles (admin view)
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        user: {
          createdAt: 'desc',
        },
      },
    });
    return res.json({ status: 'success', doctors });
  } catch (err) {
    console.error('Error fetching doctor list:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch doctor list.' });
  }
});

// Endpoint: Create doctor profile
router.post('/doctors', async (req, res) => {
  const { email, password, name, phone, specialization, bio, workingHours, slotDurationMinutes, consultationFee } = req.body;

  try {
    // Validate inputs
    if (!email || !password || !name || !specialization || !workingHours) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing required doctor registration fields.' });
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Bad Request', message: 'Email address already in use.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user and profile in a transaction
    const newDoctor = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: phone || null,
          role: Role.DOCTOR,
        },
      });

      const profile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          specialization,
          bio: bio || '',
          workingHours: workingHours, // expects array of slots [{ weekday, start, end }]
          slotDurationMinutes: parseInt(slotDurationMinutes) || 30,
          consultationFee: parseFloat(consultationFee) || 0,
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile,
      };
    });

    return res.status(201).json({
      status: 'success',
      doctor: newDoctor,
    });
  } catch (err) {
    console.error('Error creating doctor:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create doctor profile.' });
  }
});

// Endpoint: Fetch list of patients
router.get('/patients', async (req, res) => {
  try {
    const patients = await prisma.user.findMany({
      where: { role: Role.PATIENT },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ status: 'success', patients });
  } catch (err) {
    console.error('Error fetching patients:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patients list.' });
  }
});

// Endpoint: Deactivate/activate user (patient or doctor)
router.patch('/users/:id/toggle-active', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    return res.json({
      status: 'success',
      message: `User account has been ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully.`,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Error toggling user active status:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to toggle active status.' });
  }
});

// Endpoint: Delete a user (patient or doctor)
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    }

    await prisma.user.delete({ where: { id } });

    return res.json({
      status: 'success',
      message: `${user.role === Role.DOCTOR ? 'Doctor' : 'Patient'} account and all associated records have been permanently deleted.`,
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete user.' });
  }
});


// Endpoint: List failed notifications
router.get('/notifications/failed', async (req, res) => {
  try {
    const failedLogs = await prisma.emailLog.findMany({
      where: {
        status: EmailStatus.FAILED,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return res.json({ status: 'success', logs: failedLogs });
  } catch (err) {
    console.error('Error fetching failed notifications:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch failed logs.' });
  }
});

// Endpoint: Retry failed notification send manually
router.post('/notifications/failed/:id/retry', async (req, res) => {
  const { id } = req.params;

  try {
    const success = await sendEmailFromLog(id);
    if (success) {
      return res.json({ status: 'success', message: 'Notification resent successfully.' });
    } else {
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to send notification. See logs for details.' });
    }
  } catch (err) {
    console.error(`Error retrying email log ${id}:`, err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'An error occurred during retry attempt.' });
  }
});

// Endpoint: Fetch list of appointments
router.get('/appointments', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: { select: { name: true, email: true } },
        doctor: { include: { user: { select: { name: true } } } }
      },
      orderBy: { slotStart: 'desc' },
    });
    return res.json({ status: 'success', appointments });
  } catch (err) {
    console.error('Error fetching appointments:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch appointments list.' });
  }
});

export default router;
