import { Router } from 'express';
import prisma from '../prisma';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper: Escape CSV fields containing quotes, commas, or newlines
const escapeCSV = (val: any): string => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // If there are double quotes, escape them by doubling them
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// GET /api/export/csv - Stream cases as CSV file download
router.get('/csv', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { dateFrom, dateTo, status, partnerId } = req.query;

    const where: any = {};
    if (req.user?.role === 'PARTNER') {
      where.partnerId = req.user.partnerId;
    } else if (partnerId) {
      where.partnerId = partnerId as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const cases = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        partner: { select: { name: true, code: true } },
        createdBy: { select: { name: true } },
        escalations: true,
      },
    });

    // Define CSV Headers
    const headers = [
      'File ID',
      'Applicant Name',
      'Email',
      'Contact Number',
      'File Type',
      'Status',
      'Partner Agency',
      'Partner Code',
      'Submitted By',
      'Date Logged',
      'Last Updated',
      'Escalation Count',
      'Active Escalation',
      'TAT (Hours)',
    ];

    let csvContent = headers.join(',') + '\r\n';

    const now = new Date();
    cases.forEach((c) => {
      const isCompleted = ['APPROVED', 'REJECTED', 'DISBURSED'].includes(c.status);
      let tatHours = 'N/A';
      if (isCompleted) {
        const tat = (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60);
        tatHours = tat.toFixed(1);
      }

      const activeEsc = c.escalations.some((e) => ['OPEN', 'IN_PROGRESS'].includes(e.status)) ? 'Yes' : 'No';

      const row = [
        c.id,
        c.applicantName,
        c.email,
        c.contactNumber,
        c.fileType,
        c.status,
        c.partner.name,
        c.partner.code,
        c.createdBy.name,
        c.createdAt.toISOString(),
        c.updatedAt.toISOString(),
        c.escalations.length,
        activeEsc,
        tatHours,
      ];

      csvContent += row.map(escapeCSV).join(',') + '\r\n';
    });

    const filename = `PartnerCRM_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('CSV Export error:', error);
    res.status(500).json({ error: 'Failed to generate CSV export file' });
  }
});

export default router;
