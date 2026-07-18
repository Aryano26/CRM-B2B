import { Router } from 'express';
import prisma from '../prisma';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { checkAndCreateAutomatedEscalations } from '../utils/slaChecker';

const router = Router();

// GET /api/dashboard/stats - Retrieve dashboard numbers, charts data
router.get('/stats', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    // Run automated SLA checks
    await checkAndCreateAutomatedEscalations();
    const { partnerId, dateFrom, dateTo } = req.query;
    
    // Base filter
    const where: any = {};
    if (req.user?.role === 'PARTNER') {
      where.partnerId = req.user.partnerId;
    } else if (partnerId) {
      where.partnerId = partnerId as string;
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

    // Helper function to extract loan amount from formData
    const getLoanAmount = (file: any): number => {
      if (!file.formData) return 0;
      try {
        const parsed = JSON.parse(file.formData);
        const amt = parsed?.basicLoanDetails?.amountRequested || parsed?.basicLoanDetails?.amount;
        return amt ? Number(amt) : 0;
      } catch (e) {
        return 0;
      }
    };

    // 1. Fetch all cases matching scope
    const cases = await prisma.file.findMany({
      where,
      include: {
        escalations: true,
      },
    });

    const totalLoggedCount = cases.length;
    let totalLoggedAmount = 0;
    
    // Status counters
    const statusCounts = {
      LOGGED: 0,
      ASSIGNED: 0,
      LAN: 0,
      APPROVED: 0,
      REJECTED: 0,
      ON_HOLD: 0,
      DISBURSED: 0,
    };

    const statusAmounts = {
      LOGGED: 0,
      ASSIGNED: 0,
      LAN: 0,
      APPROVED: 0,
      REJECTED: 0,
      ON_HOLD: 0,
      DISBURSED: 0,
    };

    let totalTATMs = 0;
    let completedCount = 0;
    let slaBreachedCount = 0;
    let activeEscalatedCount = 0;
    let activeEscalatedAmount = 0;

    const now = new Date();

    cases.forEach((c) => {
      const amt = getLoanAmount(c);
      totalLoggedAmount += amt;

      // Increment status count & amount
      if (c.status in statusCounts) {
        statusCounts[c.status as keyof typeof statusCounts]++;
        statusAmounts[c.status as keyof typeof statusAmounts] += amt;
      }

      const isCompleted = ['APPROVED', 'REJECTED', 'DISBURSED'].includes(c.status);

      // Average TAT Calculation (for completed cases)
      if (isCompleted) {
        const tatMs = c.updatedAt.getTime() - c.createdAt.getTime();
        totalTATMs += tatMs;
        completedCount++;
      }

      // SLA breach check: count active automated escalations
      const hasActiveAutomatedEscalation = c.escalations.some(
        (e) => e.type === 'AUTOMATED' && ['OPEN', 'IN_PROGRESS'].includes(e.status)
      );
      if (hasActiveAutomatedEscalation) {
        slaBreachedCount++;
      }

      // Check if file currently has an active escalation (either manual or automated)
      const hasActiveEscalation = c.escalations.some(e => ['OPEN', 'IN_PROGRESS'].includes(e.status));
      if (hasActiveEscalation) {
        activeEscalatedCount++;
        activeEscalatedAmount += amt;
      }
    });

    // Average Turnaround Time in hours
    const avgTAT = completedCount > 0 ? parseFloat((totalTATMs / (1000 * 60 * 60) / completedCount).toFixed(1)) : 0;

    // 2. Trend over time (last 6 months logged files count and amount)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trendWhere = { ...where, createdAt: { gte: sixMonthsAgo } };
    const trendCases = await prisma.file.findMany({
      where: trendWhere,
      select: { createdAt: true, formData: true },
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendCountMap = new Map<string, number>();
    const trendAmountMap = new Map<string, number>();

    // Initialize map for the last 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      trendCountMap.set(label, 0);
      trendAmountMap.set(label, 0);
    }

    trendCases.forEach((tc) => {
      const date = tc.createdAt;
      const label = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      const amt = getLoanAmount(tc);
      if (trendCountMap.has(label)) {
        trendCountMap.set(label, trendCountMap.get(label)! + 1);
        trendAmountMap.set(label, trendAmountMap.get(label)! + amt);
      }
    });

    const fileTrendCount = Array.from(trendCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .reverse();

    const fileTrendAmount = Array.from(trendAmountMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .reverse();

    // 3. Escalations Breakdown by Reason
    const escalationsWhere: any = {};
    if (req.user?.role === 'PARTNER') {
      escalationsWhere.file = { partnerId: req.user.partnerId };
    } else if (partnerId) {
      escalationsWhere.file = { partnerId };
    }

    const escalations = await prisma.escalation.findMany({
      where: escalationsWhere,
      include: {
        file: {
          include: {
            partner: true,
          },
        },
      },
    });

    const reasonCountMap: Record<string, number> = {};
    const reasonAmountMap: Record<string, number> = {};
    escalations.forEach((esc) => {
      const reason = esc.reason || 'General Delay';
      const amt = getLoanAmount(esc.file);
      reasonCountMap[reason] = (reasonCountMap[reason] || 0) + 1;
      reasonAmountMap[reason] = (reasonAmountMap[reason] || 0) + amt;
    });

        const escalationReasonCountData = Object.entries(reasonCountMap).map(([name, value]) => ({
      name,
      value,
    }));
    const escalationReasonAmountData = Object.entries(reasonAmountMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Calculate Average Resolution Time by Category
    const reasonResolutionTimeMap: Record<string, { totalMs: number; count: number }> = {};
    escalations.forEach((esc) => {
      const reason = esc.reason || 'General Delay';
      if (!reasonResolutionTimeMap[reason]) {
        reasonResolutionTimeMap[reason] = { totalMs: 0, count: 0 };
      }
    });

    escalations.forEach((esc) => {
      const reason = esc.reason || 'General Delay';
      if (esc.status === 'RESOLVED' && esc.resolvedAt) {
        const durationMs = esc.resolvedAt.getTime() - esc.createdAt.getTime();
        reasonResolutionTimeMap[reason].totalMs += durationMs;
        reasonResolutionTimeMap[reason].count += 1;
      }
    });

    const averageResolutionTimeData = Object.entries(reasonResolutionTimeMap).map(([name, stats]) => {
      const avgHours = stats.count > 0 ? parseFloat((stats.totalMs / (1000 * 60 * 60) / stats.count).toFixed(2)) : null;
      return {
        name,
        avgHours,
      };
    });

    // Status distribution in charts format
    const statusDistributionCount = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
    const statusDistributionAmount = Object.entries(statusAmounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Calculate Oldest Open Escalations (Aging List)
    const openEscalations = escalations
      .filter((esc) => ['OPEN', 'IN_PROGRESS'].includes(esc.status))
      .map((esc) => {
        const daysSinceRaised = Math.floor((now.getTime() - esc.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: esc.id,
          fileId: esc.fileId,
          reason: esc.reason,
          partnerName: esc.file?.partner?.name || 'Unknown',
          partnerCode: esc.file?.partner?.code || 'N/A',
          daysSinceRaised,
          createdAt: esc.createdAt,
        };
      });

    // Sort by age (oldest first, i.e., ascending order of createdAt)
    openEscalations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Top 10 entries
    const escalationAgingList = openEscalations.slice(0, 10);

    res.json({
      metrics: {
        count: {
          totalLogged: totalLoggedCount,
          activeEscalated: activeEscalatedCount,
        },
        amount: {
          totalLogged: totalLoggedAmount,
          activeEscalated: activeEscalatedAmount,
        },
        pendingReview: statusCounts.LOGGED + statusCounts.ASSIGNED + statusCounts.LAN + statusCounts.ON_HOLD,
        approved: statusCounts.APPROVED,
        disbursed: statusCounts.DISBURSED,
        rejected: statusCounts.REJECTED,
        slaBreached: slaBreachedCount,
        avgTAT: avgTAT > 24 ? `${(avgTAT / 24).toFixed(1)} days` : `${avgTAT.toFixed(1)} hours`,
      },
      charts: {
        count: {
          fileTrend: fileTrendCount,
          statusDistribution: statusDistributionCount,
          escalationReasonData: escalationReasonCountData,
          averageResolutionTimeData,
        },
        amount: {
          fileTrend: fileTrendAmount,
          statusDistribution: statusDistributionAmount,
          escalationReasonData: escalationReasonAmountData,
          averageResolutionTimeData,
        },
      },
      escalationAgingList,
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
  }
});

export default router;
