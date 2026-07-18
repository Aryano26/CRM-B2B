import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Search, Calendar, RefreshCw, X, FileDown, 
  User, Mail, Phone, CalendarDays, History, AlertTriangle
} from 'lucide-react';

interface Case {
  id: string;
  applicantName: string;
  contactNumber: string;
  email: string;
  fileType: string;
  partnerRefId: string | null;
  documentData: string | null;
  documentName: string | null;
  formData?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  partner: { name: string; code: string };
  createdBy: { name: string; email: string };
}

interface StatusHistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  remarks: string | null;
  createdAt: string;
  changedBy: { name: string; role: string };
}

interface EscalationItem {
  id: string;
  type: string;
  reason: string;
  comments: string | null;
  status: string;
  createdAt: string;
  raisedBy: { name: string; role: string } | null;
}

const statusBadges: Record<string, string> = {
  LOGGED: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  ASSIGNED: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
  LAN: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  DISBURSED: 'bg-green-500/10 text-green-500 border border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-500 border border-red-500/20',
  ON_HOLD: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
};

const defaultRemarksMapping: Record<string, string> = {
  LOGGED: 'File logged.',
  ASSIGNED: 'Documents assigned.',
  LAN: 'LAN generated.',
  APPROVED: 'LAN approved.',
  DISBURSED: 'LAN disbursed.',
  ON_HOLD: 'Case on hold.',
  REJECTED: 'LAN rejected.',
};

const Cases: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get('caseId');

  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fileType, setFileType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [partners, setPartners] = useState<{ id: string; name: string; code: string }[]>([]);

  // Selected case for Drawer
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<(Case & { statusHistory: StatusHistoryItem[]; escalations: EscalationItem[] }) | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Drawer status update states
  const [newStatus, setNewStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    setRemarks(defaultRemarksMapping[status] || '');
  };

  // Drawer manual escalation state
  const [escalationReason, setEscalationReason] = useState('General Delay');
  const [escalationComments, setEscalationComments] = useState('');
  const [raisingEscalation, setRaisingEscalation] = useState(false);

  // Form details expand states
  const [isLoanDetailsExpanded, setIsLoanDetailsExpanded] = useState(false);
  const [expandedCustomerIndex, setExpandedCustomerIndex] = useState<number | null>(null);

  // Load partners if admin
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/admin/partners')
        .then(res => setPartners(res.data))
        .catch(() => showToast('Failed to fetch partner list', 'error'));
    }
  }, [user]);

  // Fetch case list
  const fetchCases = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
        search: search || undefined,
        status: status || undefined,
        fileType: fileType || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        partnerId: selectedPartnerId || undefined,
      };

      const response = await api.get('/cases', { params });
      setCases(response.data.cases);
      setTotal(response.data.pagination.total);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      showToast('Error loading case list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, search, status, fileType, dateFrom, dateTo, selectedPartnerId]);

  // Fetch case details for Drawer
  const fetchCaseDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/cases/${id}`);
      setCaseDetails(response.data);
      setNewStatus(response.data.status);
      setRemarks('');
    } catch (error) {
      showToast('Error fetching case audit log', 'error');
      setSelectedCaseId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (caseIdFromUrl) {
      setSelectedCaseId(caseIdFromUrl);
    }
  }, [caseIdFromUrl]);

  useEffect(() => {
    if (selectedCaseId) {
      fetchCaseDetails(selectedCaseId);
    } else {
      setCaseDetails(null);
    }
    setIsLoanDetailsExpanded(false);
    setExpandedCustomerIndex(null);
  }, [selectedCaseId]);

  // Handle Admin Status update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !newStatus) return;

    setUpdatingStatus(true);
    try {
      await api.patch(`/cases/${selectedCaseId}/status`, {
        status: newStatus,
        remarks: remarks || undefined,
      });
      showToast(`Case status updated to ${newStatus}`, 'success');
      // Refresh case list & details
      fetchCases();
      fetchCaseDetails(selectedCaseId);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Partner raising escalation
  const handleRaiseEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !escalationReason) return;

    setRaisingEscalation(true);
    try {
      await api.post('/escalations', {
        fileId: selectedCaseId,
        reason: escalationReason,
        comments: escalationComments || undefined,
      });
      showToast('Escalation raised successfully', 'success');
      setEscalationComments('');
      // Refresh case details
      fetchCaseDetails(selectedCaseId);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to raise escalation', 'error');
    } finally {
      setRaisingEscalation(false);
    }
  };

  // Trigger base64 download
  const downloadDocument = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setFileType('');
    setDateFrom('');
    setDateTo('');
    setSelectedPartnerId('');
  };

  return (
    <div className="relative">
      
      {/* Search & Filter Header */}
      <div className="glass-panel p-4 rounded-xl space-y-4 mb-6 shadow-sm">
        
        {/* Row 1: Search & Base filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Applicant Name / File ID / Ref..."
              className="w-full bg-background border border-border focus:border-primary rounded-lg py-2 pl-10 pr-4 text-xs outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-background border border-border rounded-lg text-xs py-1.5 px-3 outline-none focus:border-primary text-foreground"
            >
              <option value="">All Statuses</option>
              <option value="LOGGED">Logged</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="LAN">LAN</option>
              <option value="APPROVED">Approved</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="REJECTED">Rejected</option>
              <option value="DISBURSED">Disbursed</option>
            </select>

            {/* File Type Filter */}
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="bg-background border border-border rounded-lg text-xs py-1.5 px-3 outline-none focus:border-primary text-foreground"
            >
              <option value="">All File Types</option>
              <option value="HOME_LOAN">Home Loan</option>
              <option value="PERSONAL_LOAN">Personal Loan</option>
              <option value="LAP">Loan Against Property (LAP)</option>
              <option value="AUTO_LOAN">Auto Loan</option>
              <option value="BUSINESS_LOAN">Business Loan</option>
            </select>

            {/* Admin specific partner filter */}
            {user?.role === 'ADMIN' && (
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="bg-background border border-border rounded-lg text-xs py-1.5 px-3 outline-none focus:border-primary text-foreground"
              >
                <option value="">All Partner Agencies</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            )}

            <button
              onClick={fetchCases}
              className="bg-muted hover:bg-muted/80 text-foreground p-2 rounded-lg border transition-all text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Row 2: Date Filters & Clear */}
        <div className="flex flex-wrap items-center justify-between border-t pt-3 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded border">
              <Calendar size={14} /> Date Logged
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-background border border-border rounded-lg text-xs py-1 px-2.5 outline-none focus:border-primary text-foreground"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-background border border-border rounded-lg text-xs py-1 px-2.5 outline-none focus:border-primary text-foreground"
            />
          </div>

          {(search || status || fileType || dateFrom || dateTo || selectedPartnerId) && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-red-500 font-semibold underline underline-offset-2"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Case Table / Grid */}
      <div className="glass-card rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">File ID</th>
                <th className="px-6 py-4">Applicant Name</th>
                <th className="px-6 py-4">Date Logged</th>
                <th className="px-6 py-4">Product Category</th>
                <th className="px-6 py-4">Partner Agency</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse bg-card">
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-muted rounded w-16 mx-auto" /></td>
                  </tr>
                ))
              ) : cases.length > 0 ? (
                cases.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedCaseId(c.id)}
                    className="hover:bg-muted/30 transition-all cursor-pointer group bg-card"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-xs text-primary">{c.id}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{c.applicantName}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {c.fileType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="font-semibold">{c.partner.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{c.partner.code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadges[c.status] || ''}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <p className="font-bold text-sm">No Case Files Found</p>
                    <p className="text-xs mt-1">Try adjusting the filter dates, status, or search terms.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
            <p className="text-xs text-muted-foreground">Showing page {page} of {totalPages} ({total} cases total)</p>
            <div className="flex gap-2">
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-muted hover:bg-muted/80 text-foreground border rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-muted hover:bg-muted/80 text-foreground border rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sliding Case Details Right Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-xl bg-card border-l border-border shadow-2xl z-40 transform transition-transform duration-300 flex flex-col ${
          selectedCaseId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-muted/20">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              Case Review <span className="font-mono text-primary font-bold">{selectedCaseId}</span>
            </h3>
            <p className="text-[10px] text-muted-foreground">Detailed status timeline and operations logs.</p>
          </div>
          <button 
            onClick={() => {
              setSelectedCaseId(null);
              if (searchParams.has('caseId')) {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('caseId');
                setSearchParams(newParams);
              }
            }}
            className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingDetails ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-24 bg-muted rounded-xl" />
              <div className="h-40 bg-muted rounded-xl" />
              <div className="h-40 bg-muted rounded-xl" />
            </div>
          ) : caseDetails ? (
            <>
              {/* Case Stats Panel */}
              <div className="bg-muted/30 p-4 rounded-xl border flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1.5 ${statusBadges[caseDetails.status]}`}>
                    {caseDetails.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Product Type</p>
                  <span className="text-xs font-bold text-foreground mt-1.5 block">
                    {caseDetails.fileType.replace('_', ' ')}
                  </span>
                </div>
                {caseDetails.partnerRefId && (
                  <div>
                    <p className="text-xs text-muted-foreground">Partner Ref</p>
                    <span className="text-xs font-semibold text-foreground font-mono block mt-1.5">
                      {caseDetails.partnerRefId}
                    </span>
                  </div>
                )}
              </div>

              {/* Applicant Info Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                  <User size={14} /> Applicant Particulars
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/10 p-3 rounded-lg border">
                    <p className="text-muted-foreground font-semibold">Applicant Name</p>
                    <p className="font-bold mt-1 text-foreground">{caseDetails.applicantName}</p>
                  </div>
                  <div className="bg-muted/10 p-3 rounded-lg border">
                    <p className="text-muted-foreground font-semibold">Contact Phone</p>
                    <p className="font-semibold mt-1 text-foreground flex items-center gap-1">
                      <Phone size={12} /> {caseDetails.contactNumber}
                    </p>
                  </div>
                  <div className="bg-muted/10 p-3 rounded-lg border">
                    <p className="text-muted-foreground font-semibold">Email Address</p>
                    <p className="font-semibold mt-1 text-foreground truncate flex items-center gap-1">
                      <Mail size={12} /> {caseDetails.email}
                    </p>
                  </div>
                  <div className="bg-muted/10 p-3 rounded-lg border">
                    <p className="text-muted-foreground font-semibold">Logged Date</p>
                    <p className="font-semibold mt-1 text-foreground flex items-center gap-1">
                      <CalendarDays size={12} /> {new Date(caseDetails.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Document Download */}
                {caseDetails.documentData && caseDetails.documentName && (
                  <button
                    onClick={() => downloadDocument(caseDetails.documentData!, caseDetails.documentName!)}
                    className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <FileDown size={14} /> Download Submitted Document ({caseDetails.documentName})
                  </button>
                )}
              </div>

              {/* Sales Application Details (Parsed from formData) */}
              {caseDetails.formData && (
                (() => {
                  let appData: any = null;
                  try {
                    appData = JSON.parse(caseDetails.formData);
                  } catch (e) {
                    return null;
                  }
                  if (!appData) return null;

                  return (
                    <div className="space-y-4 pt-2 border-t">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                        📋 Sales Application Details
                      </h4>

                      {/* Accordion 1: Basic Loan Details */}
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div 
                          onClick={() => setIsLoanDetailsExpanded(!isLoanDetailsExpanded)}
                          className="flex items-center justify-between px-4 py-2.5 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                        >
                          <span className="text-xs font-bold text-foreground">Basic Loan Details</span>
                          <span className="text-muted-foreground text-xs font-mono">
                            {isLoanDetailsExpanded ? '▼' : '▶'}
                          </span>
                        </div>

                        {isLoanDetailsExpanded && appData.basicLoanDetails && (
                          <div className="p-4 bg-card grid grid-cols-2 gap-3 text-[11px] border-t">
                            <div>
                              <span className="text-muted-foreground font-semibold">Application Code:</span>
                              <span className="block font-bold text-foreground font-mono">{appData.basicLoanDetails.appCode}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Branch Location:</span>
                              <span className="block font-bold text-foreground">{appData.basicLoanDetails.branchLocation || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Loan Type:</span>
                              <span className="block font-bold text-foreground">{appData.basicLoanDetails.loanType || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Purpose of Loan:</span>
                              <span className="block font-bold text-foreground">{appData.basicLoanDetails.purposeOfLoan || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Amount Requested:</span>
                              <span className="block font-bold text-primary">₹{Number(appData.basicLoanDetails.amountRequested || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Tenure Requested:</span>
                              <span className="block font-bold text-foreground">{appData.basicLoanDetails.tenureRequested} months</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Rate of Interest:</span>
                              <span className="block font-bold text-foreground">{appData.basicLoanDetails.rateOfInterest}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Preferred EMI:</span>
                              <span className="block font-bold text-foreground">₹{Number(appData.basicLoanDetails.preferredEmi || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Scheme:</span>
                              <span className="block font-bold text-foreground">{appData.basicLoanDetails.scheme || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Source Details:</span>
                              <span className="block font-bold text-foreground">{appData.basicLoanDetails.sourceDetails || '-'}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accordion 2: Customer Details */}
                      {appData.customers && appData.customers.map((cust: any, idx: number) => {
                        const isExpanded = expandedCustomerIndex === idx;
                        return (
                          <div key={idx} className="border border-border rounded-xl overflow-hidden">
                            <div 
                              onClick={() => setExpandedCustomerIndex(isExpanded ? null : idx)}
                              className="flex items-center justify-between px-4 py-2.5 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                            >
                              <span className="text-xs font-bold text-foreground">
                                {cust.id} ({cust.personal?.customerType || 'Applicant'}) - {cust.personal?.firstName} {cust.personal?.lastName}
                              </span>
                              <span className="text-muted-foreground text-xs font-mono">
                                {isExpanded ? '▼' : '▶'}
                              </span>
                            </div>

                            {isExpanded && (
                              <div className="p-4 bg-card space-y-4 border-t text-[11px] divide-y divide-border/60">
                                
                                {/* Personal & KYC details */}
                                <div className="space-y-1.5 pb-2">
                                  <h5 className="font-bold text-primary text-[10px] uppercase tracking-wider">Personal & KYC</h5>
                                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                    <div>DOB: <span className="text-foreground font-semibold">{cust.personal?.dob || '-'}</span></div>
                                    <div>Age: <span className="text-foreground font-semibold">{cust.personal?.age || '-'}</span></div>
                                    <div>Gender: <span className="text-foreground font-semibold">{cust.personal?.gender || '-'}</span></div>
                                    <div>Relation with Applicant: <span className="text-foreground font-semibold">{cust.personal?.relationWithApplicant || '-'}</span></div>
                                  </div>
                                  {cust.personal?.kycs && cust.personal.kycs.length > 0 && (
                                    <div className="mt-2 pt-1.5 border-t border-dashed space-y-1">
                                      <span className="text-[10px] text-muted-foreground font-semibold">Verified Documents:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {cust.personal.kycs.map((k: any) => (
                                          <span key={k.id} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold text-[9px]">
                                            ✓ {k.verificationType}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Address Details */}
                                {cust.address && (
                                  <div className="space-y-1.5 pt-2 pb-2">
                                    <h5 className="font-bold text-primary text-[10px] uppercase tracking-wider">Address Details</h5>
                                    <p className="text-foreground font-semibold">Type: {cust.address.addressType} ({cust.address.currentAddressType})</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                      {cust.address.addressLine1}, {cust.address.addressLine2 && `${cust.address.addressLine2}, `}
                                      {cust.address.city}, {cust.address.state} - {cust.address.pincode}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                      <div>Landmark: <span className="text-foreground font-semibold">{cust.address.landmark || '-'}</span></div>
                                      <div>Years in Address: <span className="text-foreground font-semibold">{cust.address.yearsInPresentAddress || '-'} years</span></div>
                                    </div>
                                  </div>
                                )}

                                {/* Employment Details */}
                                {cust.employment && (
                                  <div className="space-y-1.5 pt-2 pb-2">
                                    <h5 className="font-bold text-primary text-[10px] uppercase tracking-wider">Employment Details</h5>
                                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                      <div>Type: <span className="text-foreground font-semibold">{cust.employment.employmentType} ({cust.employment.employmentNature})</span></div>
                                      <div>Organisation: <span className="text-foreground font-semibold">{cust.employment.nameOfOrganisation}</span></div>
                                      <div>Monthly Net Pay: <span className="text-foreground font-semibold">₹{Number(cust.employment.netIncomeMonthly || 0).toLocaleString()}</span></div>
                                      <div>Total Exp: <span className="text-foreground font-semibold">{cust.employment.totalExperience}</span></div>
                                    </div>
                                    {cust.employment.documents && (
                                      <div className="mt-2 pt-1.5 border-t border-dashed text-[10px] text-muted-foreground">
                                        <p className="font-semibold">Documents checked:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {cust.employment.documents.natureOfBusiness && <span className="bg-muted px-1.5 py-0.5 rounded">Nature of Business</span>}
                                          {cust.employment.documents.employmentDocument && <span className="bg-muted px-1.5 py-0.5 rounded">Employment Document</span>}
                                          {cust.employment.documents.addressProof && <span className="bg-muted px-1.5 py-0.5 rounded">Address Proof</span>}
                                          {cust.employment.documents.occupation && <span className="bg-muted px-1.5 py-0.5 rounded">Occupation ID</span>}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Bank details */}
                                {cust.bank?.accounts && cust.bank.accounts.length > 0 && (
                                  <div className="space-y-1.5 pt-2 pb-2">
                                    <h5 className="font-bold text-primary text-[10px] uppercase tracking-wider">Bank Accounts</h5>
                                    <div className="space-y-1.5">
                                      {cust.bank.accounts.map((acc: any) => (
                                        <div key={acc.id} className="border p-2 rounded-lg bg-muted/20 text-xs">
                                          <p className="font-bold text-foreground">{acc.bankName} ({acc.typeOfAccount})</p>
                                          <p className="text-muted-foreground mt-0.5">Acc Holder: <span className="text-foreground font-semibold">{acc.accountHolderName}</span></p>
                                          <p className="text-muted-foreground font-mono">No: <span className="text-foreground font-bold">{acc.accountNo}</span> | IFSC: <span className="text-primary font-bold">{acc.ifscCode}</span></p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* References */}
                                {cust.references && cust.references.length > 0 && (
                                  <div className="space-y-1.5 pt-2 pb-2">
                                    <h5 className="font-bold text-primary text-[10px] uppercase tracking-wider font-sans">References</h5>
                                    <div className="space-y-1.5">
                                      {cust.references.map((ref: any) => (
                                        <div key={ref.id} className="border p-2 rounded-lg bg-muted/20 text-xs space-y-1">
                                          <p className="font-bold text-foreground flex items-center justify-between">
                                            <span>{`${ref.firstName} ${ref.middleName || ''} ${ref.lastName}`.trim().replace(/\s+/g, ' ')}</span>
                                            <span className="text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full uppercase">
                                              {ref.referenceType} ({ref.relationship})
                                            </span>
                                          </p>
                                          <div className="grid grid-cols-2 gap-1 text-muted-foreground text-[10px]">
                                            <div>Phone: <span className="text-foreground font-bold">{ref.phoneNumber}</span></div>
                                            <div>Years Known: <span className="text-foreground font-bold">{ref.yearsKnown} years</span></div>
                                            <div className="col-span-2">Email: <span className="text-foreground font-bold font-mono">{ref.email}</span></div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Existing Loans */}
                                {cust.existingLoans && cust.existingLoans.length > 0 && (
                                  <div className="space-y-1.5 pt-2">
                                    <h5 className="font-bold text-primary text-[10px] uppercase tracking-wider">Existing Loans</h5>
                                    <div className="space-y-1.5">
                                      {cust.existingLoans.map((loan: any) => (
                                        <div key={loan.id} className="border p-2 rounded-lg bg-muted/20 text-xs">
                                          <p className="font-bold text-foreground">{loan.bankName} ({loan.loanType})</p>
                                          <div className="grid grid-cols-3 gap-1 mt-0.5 text-muted-foreground text-[10px]">
                                            <div>Sanctioned: <span className="text-foreground font-semibold">₹{Number(loan.loanAmount || 0).toLocaleString()}</span></div>
                                            <div>EMI: <span className="text-red-500 font-semibold">₹{Number(loan.emiAmount || 0).toLocaleString()}</span></div>
                                            <div>Outstanding: <span className="text-foreground font-semibold">₹{Number(loan.outstandingAmount || 0).toLocaleString()}</span></div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}

              {/* Timeline Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                  <History size={14} /> Case History & Audit Trail
                </h4>
                <div className="relative pl-6 border-l border-border space-y-5">
                  {caseDetails.statusHistory.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Circle indicator */}
                      <span className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </span>

                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded border">
                            {log.toStatus}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs mt-1 text-foreground font-medium">{log.remarks}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          By: {log.changedBy.name} ({log.changedBy.role === 'ADMIN' ? 'Ops Admin' : 'Partner'})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Escalations List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                  <AlertTriangle size={14} /> Escalation Logs
                </h4>
                {caseDetails.escalations.length > 0 ? (
                  <div className="space-y-2.5">
                    {caseDetails.escalations.map((esc) => (
                      <div 
                        key={esc.id} 
                        className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          esc.status === 'RESOLVED' 
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-red-500/5 border-red-500/10 text-red-600 dark:text-red-400 animate-pulse-soft'
                        }`}
                      >
                        <div className="flex justify-between font-bold">
                          <span>{esc.type} Escalation</span>
                          <span className="px-1.5 py-0.5 bg-card border rounded uppercase text-[9px]">{esc.status}</span>
                        </div>
                        <p className="font-semibold text-foreground">Reason: {esc.reason}</p>
                        {esc.comments && <p className="opacity-95">Comments: {esc.comments}</p>}
                        <p className="text-[9px] opacity-75">
                          Raised: {new Date(esc.createdAt).toLocaleString()} {esc.raisedBy ? `by ${esc.raisedBy.name}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic pl-1">No escalations reported for this file.</p>
                )}
              </div>

              {/* ADMIN ACTIONS: Update status */}
              {user?.role === 'ADMIN' && (
                <div className="bg-card/30 p-4 border border-border rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                    🛡️ Admin Operations Control
                  </h4>
                  <form onSubmit={handleUpdateStatus} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1 text-muted-foreground">Approve/Modify File Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                      >
                        <option value="LOGGED">LOGGED</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="LAN">LAN</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="ON_HOLD">ON HOLD</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="DISBURSED">DISBURSED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1 text-muted-foreground">Audit Remarks / Comments</label>
                      <textarea
                        required
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Add reason for status transition (e.g. CIBIL score verified, Property valuation resolved)"
                        className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors h-16 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingStatus}
                      className="w-full bg-primary hover:bg-primary/95 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                    >
                      {updatingStatus ? 'Updating Audit Logs...' : 'Commit Status Transition'}
                    </button>
                  </form>
                </div>
              )}

              {/* PARTNER ACTIONS: File manual escalation */}
              {user?.role === 'PARTNER' && !caseDetails.escalations.some(e => ['OPEN', 'IN_PROGRESS'].includes(e.status)) && (
                <div className="bg-card/30 p-4 border border-border rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                    ⚠️ Raise Manual Escalation
                  </h4>
                  <form onSubmit={handleRaiseEscalation} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1 text-muted-foreground">Select Reason</label>
                      <select
                        value={escalationReason}
                        onChange={(e) => setEscalationReason(e.target.value)}
                        className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                      >
                        <option value="Documents Vetting Delay">Documents Vetting Delay</option>
                        <option value="Field Audit Verification Delay">Field Audit Verification Delay</option>
                        <option value="Credit Appraisal Delay">Credit Appraisal Delay</option>
                        <option value="Disbursal Status Delay">Disbursal Status Delay</option>
                        <option value="General Delay">General Process Delay</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1 text-muted-foreground">Escalation Comments</label>
                      <textarea
                        required
                        value={escalationComments}
                        onChange={(e) => setEscalationComments(e.target.value)}
                        placeholder="Provide details about the processing delay"
                        className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors h-16 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={raisingEscalation}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                    >
                      {raisingEscalation ? 'Raising Ticket...' : 'File Escalation Ticket'}
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Failed to parse case.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cases;
