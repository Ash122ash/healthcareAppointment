import { Router } from 'express';
import bcrypt from 'bcrypt';
import { RegisterSchema, LoginSchema } from '@medisync/shared';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/jwt';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Endpoint: Register (Patient only)
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A user with this email address already exists.',
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    // Create user with PATIENT role
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        role: Role.PATIENT,
        name: validatedData.name,
        phone: validatedData.phone || null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      status: 'success',
      user: newUser,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid registration input details.',
        details: err.errors,
      });
    }

    console.error('Error in registration route:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during registration. Please try again.',
    });
  }
});

// Endpoint: Login
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const validatedData = LoginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    // Generate tokens
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role as any, // UserRole
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      status: 'success',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid login details.',
        details: err.errors,
      });
    }

    console.error('Error in login route:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during login.',
    });
  }
});

// Endpoint: Refresh Access Token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Refresh token is missing.',
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    // Verify user still active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account is inactive or not found.',
      });
    }

    // Generate a new access token
    const newPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role as any,
    };
    const accessToken = generateAccessToken(newPayload);

    return res.json({
      status: 'success',
      accessToken,
    });
  } catch (err) {
    console.error('Error in refresh token route:', err);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired refresh token.',
    });
  }
});

// Endpoint: Logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res.json({
    status: 'success',
    message: 'Logged out successfully.',
  });
});

// Endpoint: Me (Get profile info)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        doctorProfile: true, // will be null for patients/admins
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found.',
      });
    }

    return res.json({
      status: 'success',
      user,
    });
  } catch (err) {
    console.error('Error in /me route:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred fetching profile.',
    });
  }
});

export default router;
