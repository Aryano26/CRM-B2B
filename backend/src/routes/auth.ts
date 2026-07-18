import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-partner-crm-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-change-in-production';

// Input Validation Schemas
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  role: z.enum(['PARTNER', 'ADMIN']).default('PARTNER'),
  partnerCode: z.string().optional(),
  partnerName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Helper: Generate Tokens
const generateTokens = (user: { id: string; email: string; name: string; role: 'PARTNER' | 'ADMIN'; partnerId: string | null }) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    partnerId: user.partnerId,
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { email, name, password, role, partnerCode, partnerName } = validatedData;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let partnerId: string | null = null;

    // For Partner roles, link or create partner organization
    if (role === 'PARTNER') {
      if (!partnerCode) {
        return res.status(400).json({ error: 'Partner Code is required for Partner registration' });
      }

      // Check if Partner organization exists
      let partner = await prisma.partner.findUnique({ where: { code: partnerCode } });
      if (!partner) {
        // Create new Partner organization
        partner = await prisma.partner.create({
          data: {
            name: partnerName || `${name}'s Agency`,
            code: partnerCode,
            status: 'ACTIVE',
          },
        });
      }

      if (partner.status === 'INACTIVE') {
        return res.status(403).json({ error: 'Partner agency is inactive. Please contact support.' });
      }

      partnerId = partner.id;
    }

    // Create User
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        partnerId,
      },
      include: {
        partner: true,
      },
    });

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'PARTNER' | 'ADMIN',
      partnerId: user.partnerId,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(210).json({
      message: 'Registration successful',
      user: userWithoutPassword,
      ...tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { partner: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If partner user, check if partner status is active
    if (user.role === 'PARTNER' && user.partner) {
      if (user.partner.status === 'INACTIVE') {
        return res.status(403).json({ error: 'Partner agency is suspended or inactive' });
      }
    }

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'PARTNER' | 'ADMIN',
      partnerId: user.partnerId,
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      ...tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      // Generate a new access token
      const payload = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        partnerId: decoded.partnerId,
      };
      
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
      res.json({ accessToken });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during token refresh' });
  }
});

// POST /api/auth/forgot-password (Mocked for premium UX)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Simulate email sending
  res.json({
    message: 'Reset password link sent to registered email. Active for 1 hour.',
  });
});

export default router;
