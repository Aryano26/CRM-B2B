import { Router } from 'express';
import prisma from '../prisma';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Protect all routes under /admin to ADMIN users only
router.use(authenticateJWT, requireRole(['ADMIN']));

// GET /api/admin/partners - List all partner agencies and user counts
router.get('/partners', async (req: AuthenticatedRequest, res) => {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            files: true,
          },
        },
      },
    });

    res.json(partners);
  } catch (error) {
    console.error('Fetch partners error:', error);
    res.status(500).json({ error: 'Failed to retrieve partner list' });
  }
});

// PATCH /api/admin/partners/:id/status - Toggle a partner's status (ACTIVE vs INACTIVE)
router.patch('/partners/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const partnerId = req.params.id;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid partner status value. Must be ACTIVE or INACTIVE.' });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return res.status(404).json({ error: 'Partner agency not found' });
    }

    const updatedPartner = await prisma.partner.update({
      where: { id: partnerId },
      data: { status },
    });

    res.json({
      message: `Partner agency "${partner.name}" status updated to ${status}.`,
      partner: updatedPartner,
    });
  } catch (error) {
    console.error('Toggle partner status error:', error);
    res.status(500).json({ error: 'Failed to update partner agency status' });
  }
});

export default router;
