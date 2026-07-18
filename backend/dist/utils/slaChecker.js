"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndCreateAutomatedEscalations = checkAndCreateAutomatedEscalations;
const prisma_1 = __importDefault(require("../prisma"));
async function checkAndCreateAutomatedEscalations() {
    const now = new Date();
    // Fetch all files that are not DISBURSED and not REJECTED
    const files = await prisma_1.default.file.findMany({
        where: {
            status: {
                notIn: ['DISBURSED', 'REJECTED'],
            },
        },
        include: {
            statusHistory: {
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    });
    for (const file of files) {
        let expectedReason = '';
        let thresholdDays = 0;
        if (file.status === 'LOGGED') {
            thresholdDays = 3;
            expectedReason = 'SLA Breach: Logged to Assigned > 3 days';
        }
        else if (file.status === 'ASSIGNED') {
            thresholdDays = 7;
            expectedReason = 'SLA Breach: Assigned to LAN > 7 days';
        }
        else if (file.status === 'LAN') {
            thresholdDays = 10;
            expectedReason = 'SLA Breach: LAN to Approved > 10 days';
        }
        else if (file.status === 'APPROVED') {
            thresholdDays = 7;
            expectedReason = 'SLA Breach: Approved to Disbursed > 7 days';
        }
        else {
            // For ON_HOLD or any other status not specified, resolve any active automated escalations
            await resolveActiveAutomatedEscalations(file.id, `File status ${file.status} is not subject to automated SLA.`);
            continue;
        }
        // Find the latest history entry transitioning to the current status
        const transitionLog = file.statusHistory.find((log) => log.toStatus === file.status);
        const transitionDate = transitionLog ? transitionLog.createdAt : file.createdAt;
        const diffTime = now.getTime() - transitionDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays > thresholdDays) {
            // Resolve any active automated escalations for this file that have a DIFFERENT reason
            await prisma_1.default.escalation.updateMany({
                where: {
                    fileId: file.id,
                    type: 'AUTOMATED',
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                    reason: { not: expectedReason },
                },
                data: {
                    status: 'RESOLVED',
                    comments: `Automatically resolved as file status is now ${file.status}.`,
                    resolvedAt: now,
                },
            });
            // Check if an active automated escalation for the expected reason already exists
            const existing = await prisma_1.default.escalation.findFirst({
                where: {
                    fileId: file.id,
                    type: 'AUTOMATED',
                    reason: expectedReason,
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                },
            });
            if (!existing) {
                let comments = '';
                if (file.status === 'LOGGED') {
                    comments = 'Case logged, pending assignment.';
                }
                else if (file.status === 'ASSIGNED') {
                    comments = 'Documents assigned, pending LAN generation.';
                }
                else if (file.status === 'LAN') {
                    comments = 'LAN generated, pending approval.';
                }
                else if (file.status === 'APPROVED') {
                    comments = 'LAN approved, pending disbursal.';
                }
                else {
                    comments = `File has been in ${file.status} status for ${Math.floor(diffDays)} days without transitioning.`;
                }
                await prisma_1.default.escalation.create({
                    data: {
                        fileId: file.id,
                        type: 'AUTOMATED',
                        reason: expectedReason,
                        comments,
                        status: 'OPEN',
                        createdAt: now,
                        updatedAt: now,
                    },
                });
            }
        }
        else {
            // Within SLA - resolve any active automated escalations on this file
            await resolveActiveAutomatedEscalations(file.id, `File status ${file.status} is within SLA limit of ${thresholdDays} days (${diffDays.toFixed(1)} days elapsed).`);
        }
    }
}
async function resolveActiveAutomatedEscalations(fileId, comments) {
    await prisma_1.default.escalation.updateMany({
        where: {
            fileId,
            type: 'AUTOMATED',
            status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        data: {
            status: 'RESOLVED',
            comments,
            resolvedAt: new Date(),
        },
    });
}
