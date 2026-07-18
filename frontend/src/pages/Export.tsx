import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Download, Calendar, HelpCircle
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  code: string;
}

interface Case {
  id: string;
  applicantName: string;
  email: string;
  createdAt: string;
  fileType: string;
  status: string;
  partner: { name: string };
  updatedAt: string;
}

const Export: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Filter States
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [exporting, setExporting] = useState(false);

  // Live preview state
  const [previewCases, setPreviewCases] = useState<Case[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    timeTaken: string;
    fileId: string;
    applicant: string;
    status: string;
    category: string;
  } | null>(null);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const params: any = {
        limit: 10,
        status: status || undefined,
        partnerId: selectedPartnerId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      const response = await api.get('/cases', { params });
      setPreviewCases(response.data.cases);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [dateFrom, dateTo, status, selectedPartnerId]);

  const handleMouseMove = (e: React.MouseEvent, c: Case) => {
    const created = new Date(c.createdAt);
    const completed = ['APPROVED', 'REJECTED', 'DISBURSED'].includes(c.status) ? new Date(c.updatedAt) : new Date();
    const hoursTaken = Math.round((completed.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    setTooltip({
      x: e.clientX + 15,
      y: e.clientY + 15,
      timeTaken: `${hoursTaken} hours`,
      fileId: c.id,
      applicant: c.applicantName,
      status: c.status,
      category: c.fileType.replace('_', ' ')
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Load partners list if admin
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/admin/partners')
        .then((res) => setPartners(res.data))
        .catch(() => showToast('Failed to fetch partner list', 'error'));
    }
  }, [user]);

  const handleExportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);

    try {
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (status) params.status = status;
      if (selectedPartnerId) params.partnerId = selectedPartnerId;

      // Request as blob to authenticate request with JWT header securely
      const response = await api.get('/export/csv', {
        params,
        responseType: 'blob',
      });

      // Construct browser download link
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const formattedDate = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `PartnerCRM_Report_${formattedDate}.csv`);
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Export document generated successfully!', 'success');
    } catch (error) {
      showToast('Failed to generate export document', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card bg-card p-8 rounded-2xl shadow-sm">
        
        {/* Headline */}
        <div className="border-b pb-4 mb-6">
          <h2 className="text-lg font-bold text-foreground">Generate Operations Reports</h2>
          <p className="text-xs text-muted-foreground mt-1">Configure parameters and compile database spreadsheets for audit logs.</p>
        </div>

        <form onSubmit={handleExportCSV} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* From Date */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-muted-foreground" size={16} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none transition-colors text-foreground"
                />
              </div>
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-muted-foreground" size={16} />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none transition-colors text-foreground"
                />
              </div>
            </div>

            {/* File Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">File Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
              >
                <option value="">All Statuses (Approved, Pending, Disbursed, Rejected)</option>
                <option value="LOGGED">LOGGED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="LAN">LAN</option>
                <option value="APPROVED">APPROVED</option>
                <option value="ON_HOLD">ON HOLD</option>
                <option value="REJECTED">REJECTED</option>
                <option value="DISBURSED">DISBURSED</option>
              </select>
            </div>

            {/* Partner Selection (Admin only) */}
            {user?.role === 'ADMIN' ? (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Filter by Partner</label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                >
                  <option value="">All Partner Agencies</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-muted/30 border p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="text-muted-foreground font-semibold">Scoped Partner</p>
                  <p className="font-bold text-foreground mt-0.5">{user?.partner?.name}</p>
                </div>
                <span className="font-mono text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">{user?.partner?.code}</span>
              </div>
            )}
          </div>

          {/* Guidelines */}
          <div className="bg-muted/40 p-4 rounded-xl border text-xs space-y-2">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <HelpCircle size={14} className="text-primary" /> Report Metadata Columns
            </h4>
            <p className="text-muted-foreground">The generated CSV export includes: File ID, Applicant Name, Email, Contact details, File Type, current processing Status, Partner Name/Code, submitter user, timestamps, SLA breach escalation flags, and turnaround time (TAT in hours) for resolved cases.</p>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t flex justify-end">
            <button
              type="submit"
              disabled={exporting}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm px-6 py-3 rounded-xl shadow-md shadow-primary/20 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              {exporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Generating CSV File...
                </>
              ) : (
                <>
                  <Download size={16} /> Compile & Export CSV
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Report Preview Section */}
      <div className="glass-card bg-card p-8 rounded-2xl shadow-sm mt-6 animate-in fade-in duration-300">
        <div className="border-b pb-4 mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-foreground">Report Spreadsheets Preview</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Live query results matching active parameters (showing up to 10 rows).</p>
          </div>
          <span className="text-xs bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-full font-bold">
            {previewCases.length} Row(s)
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">File ID</th>
                <th className="px-4 py-3">Applicant Name</th>
                <th className="px-4 py-3">Partner Agency</th>
                <th className="px-4 py-3">Product Category</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-muted-foreground">
              {loadingPreview ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse bg-card">
                    <td className="px-4 py-3"><div className="h-3.5 bg-muted rounded w-16" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 bg-muted rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 bg-muted rounded w-28" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 bg-muted rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-5 bg-muted rounded w-12 mx-auto" /></td>
                  </tr>
                ))
              ) : previewCases.length > 0 ? (
                previewCases.map((c) => (
                  <tr 
                    key={c.id} 
                    onMouseMove={(e) => handleMouseMove(e, c)}
                    onMouseLeave={handleMouseLeave}
                    className="hover:bg-muted/40 transition-colors bg-card cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-primary">{c.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{c.applicantName}</td>
                    <td className="px-4 py-3">{c.partner?.name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">
                        {c.fileType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'LOGGED' ? 'bg-blue-500/10 text-blue-500' :
                        c.status === 'ASSIGNED' ? 'bg-indigo-500/10 text-indigo-500' :
                        c.status === 'LAN' ? 'bg-purple-500/10 text-purple-500' :
                        c.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                        c.status === 'DISBURSED' ? 'bg-green-500/10 text-green-500' :
                        c.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    No matching case records found. Adjust your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {tooltip && (
        <div 
          className="fixed z-50 glass-card bg-card/90 border border-border p-4 rounded-xl shadow-xl text-xs space-y-2 pointer-events-none w-64 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="flex justify-between items-center border-b pb-1.5">
            <span className="font-bold font-mono text-primary">{tooltip.fileId}</span>
            <span className={`px-1.5 py-0.5 border rounded font-bold text-[9px] uppercase ${
              tooltip.status === 'APPROVED' || tooltip.status === 'DISBURSED'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : tooltip.status === 'REJECTED'
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            }`}>{tooltip.status}</span>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground"><strong className="text-foreground">Applicant:</strong> {tooltip.applicant}</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Category:</strong> {tooltip.category}</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Processing TAT:</strong> {tooltip.timeTaken}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Export;
