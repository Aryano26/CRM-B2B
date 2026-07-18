import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { checkAndCreateAutomatedEscalations } from '../utils/slaChecker';

const router = Router();

// Validation schema for case submission
const submitCaseSchema = z.object({
  applicantName: z.string().min(2),
  contactNumber: z.string().min(10),
  email: z.string().email(),
  fileType: z.enum(['HOME_LOAN', 'PERSONAL_LOAN', 'LAP', 'AUTO_LOAN', 'BUSINESS_LOAN']),
  partnerRefId: z.string().optional(),
  documentData: z.string().optional(), // Base64 representation
  documentName: z.string().optional(),
  formData: z.string().optional(),
});

// GET /api/cases - List, Filter & Paginate Cases
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    // Run automated SLA checks
    await checkAndCreateAutomatedEscalations();
    const {
      status,
      fileType,
      partnerId,
      search,
      dateFrom,
      dateTo,
      page = '1',
      limit = '10',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build Prisma query filters
    const where: any = {};

    // Scope to partner if role is PARTNER
    if (req.user?.role === 'PARTNER') {
      where.partnerId = req.user.partnerId;
    } else if (partnerId) {
      // Admins can filter by specific partner
      where.partnerId = partnerId as string;
    }

    // Status filter
    if (status) {
      where.status = status as string;
    }

    // File Type filter
    if (fileType) {
      where.fileType = fileType as string;
    }

    // Search query (File ID or applicant name)
    if (search) {
      where.OR = [
        { id: { contains: search as string } },
        { applicantName: { contains: search as string } },
        { partnerRefId: { contains: search as string } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        // Include full day on the end date
        const endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Fetch cases and count total matching cases
    const [cases, total] = await prisma.$transaction([
      prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          partner: { select: { name: true, code: true } },
          createdBy: { select: { name: true, email: true } },
        },
      }),
      prisma.file.count({ where }),
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
  } catch (error) {
    console.error('Fetch cases error:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// GET /api/cases/:id - Get Details of a single Case (with Audit Trail & Escalations)
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    // Run automated SLA checks
    await checkAndCreateAutomatedEscalations();
    const fileId = req.params.id;

    const file = await prisma.file.findUnique({
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
  } catch (error) {
    console.error('Fetch case details error:', error);
    res.status(500).json({ error: 'Failed to fetch case details' });
  }
});

// POST /api/cases - Submit a new case (Partners only)
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res) => {
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
    const newFile = await prisma.$transaction(async (tx) => {
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
          partnerId: req.user!.partnerId!,
          createdById: req.user!.id,
          status: 'LOGGED',
        },
      });

      await tx.statusHistory.create({
        data: {
          fileId: customFileId,
          fromStatus: 'NONE',
          toStatus: 'LOGGED',
          changedById: req.user!.id,
          remarks: 'File submitted and logged successfully.',
        },
      });

      return file;
    });

    res.status(201).json({
      message: 'Case logged successfully',
      file: newFile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Submit case error:', error);
    res.status(500).json({ error: 'Failed to submit case' });
  }
});

// PATCH /api/cases/:id/status - Update Status (Admins only)
router.patch('/:id/status', authenticateJWT, async (req: AuthenticatedRequest, res) => {
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

    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      return res.status(404).json({ error: 'Case file not found' });
    }

    const previousStatus = file.status;

    if (previousStatus === newStatus) {
      return res.json({ message: 'Status is already set to this value', file });
    }

    const updatedFile = await prisma.$transaction(async (tx) => {
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
          changedById: req.user!.id,
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
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update file status' });
  }
});

export default router;
