"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const slaChecker_1 = require("../utils/slaChecker");
const router = (0, express_1.Router)();
const raiseEscalationSchema = zod_1.z.object({
    fileId: zod_1.z.string(),
    reason: zod_1.z.string().min(5, 'Reason must be at least 5 characters long'),
    comments: zod_1.z.string().optional(),
});
// GET /api/escalations - List escalations (Scoped for partners, global for admins)
router.get('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        // Run automated SLA checks
        await (0, slaChecker_1.checkAndCreateAutomatedEscalations)();
        const { status, type } = req.query;
        const where = {};
        if (req.user?.role === 'PARTNER') {
            where.file = { partnerId: req.user.partnerId };
        }
        if (status) {
            where.status = status;
        }
        if (type) {
            where.type = type;
        }
        const escalations = await prisma_1.default.escalation.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                file: {
                    select: {
                        id: true,
                        applicantName: true,
                        status: true,
                        createdAt: true,
                        partner: { select: { name: true, code: true } },
                    },
                },
                raisedBy: { select: { name: true, role: true } },
            },
        });
        res.json(escalations);
    }
    catch (error) {
        console.error('Fetch escalations error:', error);
        res.status(500).json({ error: 'Failed to retrieve escalations' });
    }
});
// POST /api/escalations - Raise a manual escalation
router.post('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { fileId, reason, comments } = raiseEscalationSchema.parse(req.body);
        // Validate that the file exists
        const file = await prisma_1.default.file.findUnique({
            where: { id: fileId },
        });
        if (!file) {
            return res.status(404).json({ error: 'Case file not found' });
        }
        // Partner users can only raise escalations on their own files
        if (req.user?.role === 'PARTNER' && file.partnerId !== req.user.partnerId) {
            return res.status(403).json({ error: 'Access forbidden: You cannot escalate another partner\'s files' });
        }
        // Check if there is already an unresolved manual/automated escalation of the same type on the file
        const existingEscalation = await prisma_1.default.escalation.findFirst({
            where: {
                fileId,
                status: { in: ['OPEN', 'IN_PROGRESS'] },
            },
        });
        if (existingEscalation) {
            return res.status(400).json({
                error: 'There is already an active (unresolved) escalation on this file. Please wait for operations to resolve it.',
            });
        }
        const newEscalation = await prisma_1.default.escalation.create({
            data: {
                fileId,
                type: 'MANUAL',
                reason,
                comments,
                status: 'OPEN',
                raisedById: req.user.id,
            },
        });
        res.status(201).json({
            message: 'Escalation raised successfully',
            escalation: newEscalation,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Raise escalation error:', error);
        res.status(500).json({ error: 'Failed to raise escalation' });
    }
});
// PATCH /api/escalations/:id/resolve - Resolve or update escalation status (Admin only)
router.patch('/:id/resolve', auth_1.authenticateJWT, async (req, res) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only Admins/Internal Ops can update escalation status' });
        }
        const escalationId = req.params.id;
        const { status, comments } = req.body;
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid escalation status' });
        }
        const escalation = await prisma_1.default.escalation.findUnique({
            where: { id: escalationId },
        });
        if (!escalation) {
            return res.status(404).json({ error: 'Escalation record not found' });
        }
        const updatedData = {
            status,
            comments: comments || escalation.comments,
        };
        if (status === 'RESOLVED') {
            updatedData.resolvedAt = new Date();
        }
        const updatedEscalation = await prisma_1.default.escalation.update({
            where: { id: escalationId },
            data: updatedData,
        });
        res.json({
            message: `Escalation status updated to ${status}`,
            escalation: updatedEscalation,
        });
    }
    catch (error) {
        console.error('Resolve escalation error:', error);
        res.status(500).json({ error: 'Failed to update escalation' });
    }
});
exports.default = router;
