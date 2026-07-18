"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-partner-crm-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-change-in-production';
// Input Validation Schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(2),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['PARTNER', 'ADMIN']).default('PARTNER'),
    partnerCode: zod_1.z.string().optional(),
    partnerName: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
// Helper: Generate Tokens
const generateTokens = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        partnerId: user.partnerId,
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const { email, name, password, role, partnerCode, partnerName } = validatedData;
        // Check if email already exists
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        let partnerId = null;
        // For Partner roles, link or create partner organization
        if (role === 'PARTNER') {
            if (!partnerCode) {
                return res.status(400).json({ error: 'Partner Code is required for Partner registration' });
            }
            // Check if Partner organization exists
            let partner = await prisma_1.default.partner.findUnique({ where: { code: partnerCode } });
            if (!partner) {
                // Create new Partner organization
                partner = await prisma_1.default.partner.create({
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
        const user = await prisma_1.default.user.create({
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
            role: user.role,
            partnerId: user.partnerId,
        });
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.status(210).json({
            message: 'Registration successful',
            user: userWithoutPassword,
            ...tokens,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
        const user = await prisma_1.default.user.findUnique({
            where: { email },
            include: { partner: true },
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
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
            role: user.role,
            partnerId: user.partnerId,
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            message: 'Login successful',
            user: userWithoutPassword,
            ...tokens,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
        jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
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
            const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '15m' });
            res.json({ accessToken });
        });
    }
    catch (error) {
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
exports.default = router;
