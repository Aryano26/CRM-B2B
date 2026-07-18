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
// Validation schema for case submission
const submitCaseSchema = zod_1.z.object({
    applicantName: zod_1.z.string().min(2),
    contactNumber: zod_1.z.string().min(10),
    email: zod_1.z.string().email(),
    fileType: zod_1.z.enum(['HOME_LOAN', 'PERSONAL_LOAN', 'LAP', 'AUTO_LOAN', 'BUSINESS_LOAN']),
    partnerRefId: zod_1.z.string().optional(),
    documentData: zod_1.z.string().optional(), // Base64 representation
    documentName: zod_1.z.string().optional(),
    formData: zod_1.z.string().optional(),
});
// GET /api/cases - List, Filter & Paginate Cases
router.get('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        // Run automated SLA checks
        await (0, slaChecker_1.checkAndCreateAutomatedEscalations)();
        const { status, fileType, partnerId, search, dateFrom, dateTo, page = '1', limit = '10', } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build Prisma query filters
        const where = {};
        // Scope to partner if role is PARTNER
        if (req.user?.role === 'PARTNER') {
            where.partnerId = req.user.partnerId;
        }
        else if (partnerId) {
            // Admins can filter by specific partner
            where.partnerId = partnerId;
        }
        // Status filter
        if (status) {
            where.status = status;
        }
        // File Type filter
        if (fileType) {
            where.fileType = fileType;
        }
        // Search query (File ID or applicant name)
        if (search) {
            where.OR = [
                { id: { contains: search } },
                { applicantName: { contains: search } },
                { partnerRefId: { contains: search } },
            ];
        }
        // Date range filter
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom);
            }
            if (dateTo) {
                // Include full day on the end date
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDate;
            }
        }
        // Fetch cases and count total matching cases
        const [cases, total] = await prisma_1.default.$transaction([
            prisma_1.default.file.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                include: {
                    partner: { select: { name: true, code: true } },
                    createdBy: { select: { name: true, email: true } },
                },
            }),
            prisma_1.default.file.count({ where }),
        ]);
        res.json({
            cases,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Fetch cases error:', error);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});
// GET /api/cases/:id - Get Details of a single Case (with Audit Trail & Escalations)
router.get('/:id', auth_1.authenticateJWT, async (req, res) => {
    try {
        // Run automated SLA checks
        await (0, slaChecker_1.checkAndCreateAutomatedEscalations)();
        const fileId = req.params.id;
        const file = await prisma_1.default.file.findUnique({
            where: { id: fileId },
            include: {
                partner: true,
                createdBy: { select: { id: true, name: true, email: true } },
                statusHistory: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        changedBy: { select: { name: true, role: true } },
                    },
                },
                escalations: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        raisedBy: { select: { name: true, role: true } },
                    },
                },
            },
        });
        if (!file) {
            return res.status(404).json({ error: 'Case file not found' });
        }
        // Check permissions: Partners can only view their own files
        if (req.user?.role === 'PARTNER' && file.partnerId !== req.user.partnerId) {
            return res.status(403).json({ error: 'Access denied: You do not own this case file' });
        }
        res.json(file);
    }
    catch (error) {
        console.error('Fetch case details error:', error);
        res.status(500).json({ error: 'Failed to fetch case details' });
    }
});
// POST /api/cases - Submit a new case (Partners only)
router.post('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        if (req.user?.role !== 'PARTNER' || !req.user.partnerId) {
            return res.status(403).json({ error: 'Only registered partners can submit cases' });
        }
        const data = submitCaseSchema.parse(req.body);
        // Generate readable file ID: FL-2026-XXXXXX (year + random)
        const year = new Date().getFullYear();
        const rand = Math.floor(100000 + Math.random() * 900000);
        const customFileId = `FL-${year}-${rand}`;
        // Create the file and initialize status history in a database transaction
        const newFile = await prisma_1.default.$transaction(async (tx) => {
            const file = await tx.file.create({
                data: {
                    id: customFileId,
                    applicantName: data.applicantName,
                    contactNumber: data.contactNumber,
                    email: data.email,
                    fileType: data.fileType,
                    partnerRefId: data.partnerRefId,
                    documentData: data.documentData,
                    documentName: data.documentName,
                    formData: data.formData,
                    partnerId: req.user.partnerId,
                    createdById: req.user.id,
                    status: 'LOGGED',
                },
            });
            await tx.statusHistory.create({
                data: {
                    fileId: customFileId,
                    fromStatus: 'NONE',
                    toStatus: 'LOGGED',
                    changedById: req.user.id,
                    remarks: 'File submitted and logged successfully.',
                },
            });
            return file;
        });
        res.status(201).json({
            message: 'Case logged successfully',
            file: newFile,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Submit case error:', error);
        res.status(500).json({ error: 'Failed to submit case' });
    }
});
// PATCH /api/cases/:id/status - Update Status (Admins only)
router.patch('/:id/status', auth_1.authenticateJWT, async (req, res) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only Admin/Internal Ops users can update file status' });
        }
        const fileId = req.params.id;
        const { status: newStatus, remarks } = req.body;
        const validStatuses = ['LOGGED', 'ASSIGNED', 'LAN', 'APPROVED', 'REJECTED', 'ON_HOLD', 'DISBURSED'];
        if (!newStatus || !validStatuses.includes(newStatus)) {
            return res.status(400).json({ error: 'Invalid or missing status value' });
        }
        const file = await prisma_1.default.file.findUnique({ where: { id: fileId } });
        if (!file) {
            return res.status(404).json({ error: 'Case file not found' });
        }
        const previousStatus = file.status;
        if (previousStatus === newStatus) {
            return res.json({ message: 'Status is already set to this value', file });
        }
        const updatedFile = await prisma_1.default.$transaction(async (tx) => {
            // Update case status
            const updated = await tx.file.update({
                where: { id: fileId },
                data: { status: newStatus },
            });
            // Write status audit trail log
            await tx.statusHistory.create({
                data: {
                    fileId,
                    fromStatus: previousStatus,
                    toStatus: newStatus,
                    changedById: req.user.id,
                    remarks: remarks || `Status updated from ${previousStatus} to ${newStatus}`,
                },
            });
            // Resolve any active AUTOMATED escalations when status changes
            await tx.escalation.updateMany({
                where: {
                    fileId,
                    type: 'AUTOMATED',
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                },
                data: {
                    status: 'RESOLVED',
                    comments: `Automatically resolved as file status changed to ${newStatus}.`,
                    resolvedAt: new Date(),
                },
            });
            // If status resolves the case, resolve any active escalations on it automatically
            if (['APPROVED', 'DISBURSED', 'REJECTED'].includes(newStatus)) {
                await tx.escalation.updateMany({
                    where: {
                        fileId,
                        status: { in: ['OPEN', 'IN_PROGRESS'] },
                    },
                    data: {
                        status: 'RESOLVED',
                        comments: `Automatically resolved when file status changed to ${newStatus}.`,
                        resolvedAt: new Date(),
                    },
                });
            }
            return updated;
        });
        res.json({
            message: 'Status updated successfully',
            file: updatedFile,
        });
    }
    catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update file status' });
    }
});
exports.default = router;
