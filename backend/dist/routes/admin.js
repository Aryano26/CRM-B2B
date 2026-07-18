"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect all routes under /admin to ADMIN users only
router.use(auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']));
// GET /api/admin/partners - List all partner agencies and user counts
router.get('/partners', async (req, res) => {
    try {
        const partners = await prisma_1.default.partner.findMany({
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
    }
    catch (error) {
        console.error('Fetch partners error:', error);
        res.status(500).json({ error: 'Failed to retrieve partner list' });
    }
});
// PATCH /api/admin/partners/:id/status - Toggle a partner's status (ACTIVE vs INACTIVE)
router.patch('/partners/:id/status', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const { status } = req.body;
        if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
            return res.status(400).json({ error: 'Invalid partner status value. Must be ACTIVE or INACTIVE.' });
        }
        const partner = await prisma_1.default.partner.findUnique({
            where: { id: partnerId },
        });
        if (!partner) {
            return res.status(404).json({ error: 'Partner agency not found' });
        }
        const updatedPartner = await prisma_1.default.partner.update({
            where: { id: partnerId },
            data: { status },
        });
        res.json({
            message: `Partner agency "${partner.name}" status updated to ${status}.`,
            partner: updatedPartner,
        });
    }
    catch (error) {
        console.error('Toggle partner status error:', error);
        res.status(500).json({ error: 'Failed to update partner agency status' });
    }
});
exports.default = router;
