"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Database seeding started...');
    // 1. Clear database
    await prisma.escalation.deleteMany();
    await prisma.statusHistory.deleteMany();
    await prisma.file.deleteMany();
    await prisma.user.deleteMany();
    await prisma.partner.deleteMany();
    console.log('🧹 Cleaned existing tables.');
    // 2. Hash shared password
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
    // 3. Create Partners
    const apexPartner = await prisma.partner.create({
        data: {
            name: 'Apex Auto Channel',
            code: 'APEX100',
            status: 'ACTIVE',
        },
    });
    const elitePartner = await prisma.partner.create({
        data: {
            name: 'Elite Home Finance',
            code: 'ELITE200',
            status: 'ACTIVE',
        },
    });
    const legacyPartner = await prisma.partner.create({
        data: {
            name: 'Legacy Partners',
            code: 'LEGACY300',
            status: 'INACTIVE', // For testing account suspension
        },
    });
    console.log('🏢 Partners created.');
    // 4. Create Users
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@partnercrm.com',
            password: hashedPassword,
            name: 'Sarah Ops Admin',
            role: 'ADMIN',
        },
    });
    const apexUser = await prisma.user.create({
        data: {
            email: 'apex.user@partnercrm.com',
            password: hashedPassword,
            name: 'John Apex Partner',
            role: 'PARTNER',
            partnerId: apexPartner.id,
        },
    });
    const eliteUser = await prisma.user.create({
        data: {
            email: 'elite.user@partnercrm.com',
            password: hashedPassword,
            name: 'Jane Elite Partner',
            role: 'PARTNER',
            partnerId: elitePartner.id,
        },
    });
    const legacyUser = await prisma.user.create({
        data: {
            email: 'legacy.user@partnercrm.com',
            password: hashedPassword,
            name: 'Robert Suspended Partner',
            role: 'PARTNER',
            partnerId: legacyPartner.id,
        },
    });
    console.log('👤 Users seeded.');
    // 5. Helper for custom file IDs
    let fileIdCounter = 1;
    const genFileId = (year) => {
        const num = String(fileIdCounter++).padStart(4, '0');
        return `FL-${year}-${num}`;
    };
    // Helper to generate past dates
    const getPastDate = (daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date;
    };
    // 6. Create Case Files spanning last 6 months
    const casesData = [
        // --- APEX AUTO CHANNEL (APEX100) ---
        {
            id: genFileId(2026),
            applicantName: 'Robert Dowry',
            email: 'robert.d@gmail.com',
            contactNumber: '9876543210',
            fileType: 'AUTO_LOAN',
            partnerRefId: 'APEX-REF-01',
            status: 'DISBURSED',
            partnerId: apexPartner.id,
            createdById: apexUser.id,
            daysAgo: 120, // 4 months ago
            loanAmount: 850000,
            history: [
                { from: 'NONE', to: 'LOGGED', daysAgo: 120, remarks: 'File logged.' },
                { from: 'LOGGED', to: 'ASSIGNED', daysAgo: 118, remarks: 'Documents assigned.' },
                { from: 'ASSIGNED', to: 'LAN', daysAgo: 116, remarks: 'LAN generated.' },
                { from: 'LAN', to: 'APPROVED', daysAgo: 115, remarks: 'LAN approved.' },
                { from: 'APPROVED', to: 'DISBURSED', daysAgo: 110, remarks: 'LAN disbursed.' },
            ],
        },
        {
            id: genFileId(2026),
            applicantName: 'Sophia Loren',
            email: 'sophia.l@yahoo.com',
            contactNumber: '9123456789',
            fileType: 'AUTO_LOAN',
            partnerRefId: 'APEX-REF-02',
            status: 'REJECTED',
            partnerId: apexPartner.id,
            createdById: apexUser.id,
            daysAgo: 90, // 3 months ago
            loanAmount: 1200000,
            history: [
                { from: 'NONE', to: 'LOGGED', daysAgo: 90, remarks: 'File logged.' },
                { from: 'LOGGED', to: 'ASSIGNED', daysAgo: 89, remarks: 'Documents assigned.' },
                { from: 'ASSIGNED', to: 'REJECTED', daysAgo: 88, remarks: 'LAN rejected.' },
            ],
        },
        {
            id: genFileId(2026),
            applicantName: 'Bruce Wayne',
            email: 'bruce@waynecorp.com',
            contactNumber: '9000000007',
            fileType: 'PERSONAL_LOAN',
            partnerRefId: 'APEX-REF-03',
            status: 'APPROVED',
            partnerId: apexPartner.id,
            createdById: apexUser.id,
            daysAgo: 45, // 1.5 months ago
            loanAmount: 2500000,
            history: [
                { from: 'NONE', to: 'LOGGED', daysAgo: 45, remarks: 'File logged.' },
                { from: 'LOGGED', to: 'ASSIGNED', daysAgo: 44, remarks: 'Documents assigned.' },
                { from: 'ASSIGNED', to: 'LAN', daysAgo: 42, remarks: 'LAN generated.' },
                { from: 'LAN', to: 'APPROVED', daysAgo: 40, remarks: 'LAN approved.' },
            ],
        },
        {
            id: genFileId(2026),
            applicantName: 'Selina Kyle',
            email: 'selina@gmail.com',
            contactNumber: '9111222333',
            fileType: 'BUSINESS_LOAN',
            partnerRefId: 'APEX-REF-04',
            status: 'ASSIGNED',
            partnerId: apexPartner.id,
            createdById: apexUser.id,
            daysAgo: 5, // 5 days ago
            loanAmount: 5000000,
            history: [
                { from: 'NONE', to: 'LOGGED', daysAgo: 5, remarks: 'File logged.' },
                { from: 'LOGGED', to: 'ASSIGNED', daysAgo: 4, remarks: 'Documents assigned.' },
            ],
        },
        // SLA breached file (Pending for 5 days, status LOGGED)
        {
            id: genFileId(2026),
            applicantName: 'Clark Kent',
            email: 'clark@dailyplanet.com',
            contactNumber: '9998887776',
            fileType: 'LAP',
            partnerRefId: 'APEX-REF-05',
            status: 'LOGGED',
            partnerId: apexPartner.id,
            createdById: apexUser.id,
            daysAgo: 5, // 5 days ago (SLA breached! > 48h)
            loanAmount: 7500000,
            history: [
                { from: 'NONE', to: 'LOGGED', daysAgo: 5, remarks: 'Case logged, pending assignment.' },
            ],
        },
        // --- ELITE HOME FINANCE (ELITE200) ---
        {
            id: genFileId(2026),
            applicantName: 'Diana Prince',
            email: 'diana@amazon.com',
            contactNumber: '9900112233',
            fileType: 'HOME_LOAN',
            partnerRefId: 'ELITE-H-01',
            status: 'DISBURSED',
            partnerId: elitePartner.id,
            createdById: eliteUser.id,
            daysAgo: 150, // 5 months ago
            loanAmount: 9500000,
            history: [
                { from: 'NONE', to: 'LOGGED', daysAgo: 150, remarks: 'File logged.' },
                { from: 'LOGGED', to: 'ASSIGNED', daysAgo: 148, remarks: 'Documents assigned.' },
                { from: 'ASSIGNED', to: 'LAN', daysAgo: 144, remarks: 'LAN generated.' },
                { from: 'LAN', to: 'APPROVED', daysAgo: 140, remarks: 'LAN approved.' },
                { from: 'APPROVED', to: 'DISBURSED', daysAgo: 135, remarks: 'LAN disbursed.' },
            ],
        },
        {
            id: genFileId(2026),
            applicantName: 'Barry Allen',
            email: 'barry@startech.com',
            contactNumber: '9955443322',
            fileType: 'HOME_LOAN',
            partnerRefId: 'ELITE-H-02',
            status: 'LAN',
            partnerId: elitePartner.id,
            createdById: eliteUser.id,
            daysAgo: 15, // 15 days ago
            loanAmount: 6000000,
            history: [
                { from: 'NONE', to: 'LOGGED', daysAgo: 15, remarks: 'File logged.' },
                { from: 'LOGGED', to: 'ASSIGNED', daysAgo: 14, remarks: 'Documents assigned.' },
                { from: 'ASSIGNED', to: 'LAN', daysAgo: 12, remarks: 'LAN generated.' },
            ],
        },
        {
            id: genFileId(2026),
            applicantName: 'Arthur Curry',
            email: 'arthur@atlantis.org',
            contactNumber: '9898989898',
            fileType: 'LAP',
            partnerRefId: 'ELITE-H-03',
            status: 'ON_HOLD',
            partnerId: elitePartner.id,
            createdById: eliteUser.id,
            daysAgo: 8, // 8 days ago (SLA breached & Escalated!)
            loanAmount: 4000000,
            history: [
                { from: 'NONE', to: 'LOGGED', daysAgo: 8, remarks: 'File logged.' },
                { from: 'LOGGED', to: 'ASSIGNED', daysAgo: 7, remarks: 'Documents assigned.' },
                { from: 'ASSIGNED', to: 'ON_HOLD', daysAgo: 5, remarks: 'Case on hold.' },
            ],
        },
        {
            id: genFileId(2026),
            applicantName: 'Hal Jordan',
            email: 'hal@greenlantern.com',
            contactNumber: '9777666555',
            fileType: 'PERSONAL_LOAN',
            partnerRefId: 'ELITE-H-04',
            status: 'LOGGED',
            partnerId: elitePartner.id,
            createdById: eliteUser.id,
            daysAgo: 1, // 1 day ago (Not breached SLA yet)
            loanAmount: 1500000,
            history: [
                { from: 'NONE', to: 'LOGGED', daysAgo: 1, remarks: 'Case logged, document vetting pending.' },
            ],
        },
    ];
    // Insert case files and status histories
    for (const c of casesData) {
        const createdDate = getPastDate(c.daysAgo);
        const defaultFormData = JSON.stringify({
            basicLoanDetails: {
                appCode: c.partnerRefId || 'REF-000',
                branchLocation: 'Mumbai Corporate Office',
                loanType: 'New',
                purposeOfLoan: 'B2B Asset Purchase',
                amountRequested: c.loanAmount,
                tenureRequested: 36,
                rateOfInterest: 10.5,
                preferredEmi: Math.round(c.loanAmount * 0.03),
                scheme: 'Standard Scheme',
                sourceDetails: 'Channel Referral'
            },
            customers: [
                {
                    id: 'Customer 1',
                    personal: {
                        firstName: c.applicantName.split(' ')[0],
                        lastName: c.applicantName.split(' ')[1] || 'Kumar',
                        customerType: 'Applicant',
                        dob: '1990-01-01',
                        age: 36,
                        gender: 'Male'
                    }
                }
            ]
        });
        // Create File
        await prisma.file.create({
            data: {
                id: c.id,
                applicantName: c.applicantName,
                email: c.email,
                contactNumber: c.contactNumber,
                fileType: c.fileType,
                partnerRefId: c.partnerRefId,
                status: c.status,
                partnerId: c.partnerId,
                createdById: c.createdById,
                formData: defaultFormData,
                createdAt: createdDate,
                updatedAt: getPastDate(Math.max(0, c.daysAgo - 4)), // Last updated 4 days after creation or today
            },
        });
        // Create history logs
        for (const h of c.history) {
            await prisma.statusHistory.create({
                data: {
                    fileId: c.id,
                    fromStatus: h.from,
                    toStatus: h.to,
                    changedById: h.from === 'NONE' ? c.createdById : adminUser.id,
                    remarks: h.remarks,
                    createdAt: getPastDate(h.daysAgo),
                },
            });
        }
    }
    console.log('📁 Case files and audit history seeded.');
    // 7. Seed Escalations
    // A manual escalation raised by Elite Partner (Jane) on Arthur Curry (ON_HOLD file)
    await prisma.escalation.create({
        data: {
            fileId: 'FL-2026-0008', // Arthur Curry
            type: 'MANUAL',
            reason: 'Documents Vetting Delay',
            comments: 'Title certificates submitted, but case is still on hold for over 3 days.',
            status: 'OPEN',
            raisedById: eliteUser.id,
            createdAt: getPastDate(3),
            updatedAt: getPastDate(3),
        },
    });
    // A manual escalation resolved by Sarah Admin on Robert Dowry in the past
    await prisma.escalation.create({
        data: {
            fileId: 'FL-2026-0001', // Robert Dowry
            type: 'MANUAL',
            reason: 'Disbursal Issues',
            comments: 'Dealership disbursement status not updated on dashboard.',
            status: 'RESOLVED',
            raisedById: apexUser.id,
            resolvedAt: getPastDate(110),
            createdAt: getPastDate(112),
            updatedAt: getPastDate(110),
        },
    });
    // An automated escalation for Clark Kent (SLA breach)
    await prisma.escalation.create({
        data: {
            fileId: 'FL-2026-0005', // Clark Kent
            type: 'AUTOMATED',
            reason: 'SLA Breach: Logged to Assigned > 3 days',
            comments: 'Case logged, pending assignment.',
            status: 'OPEN',
            createdAt: getPastDate(3),
            updatedAt: getPastDate(3),
        },
    });
    console.log('⚠️ Escalations seeded.');
    console.log('🏁 Database seeding completed successfully! Ready for launch.');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
