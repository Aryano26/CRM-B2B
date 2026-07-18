import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  AlertTriangle, RefreshCw, X
} from 'lucide-react';

interface Escalation {
  id: string;
  type: string;
  reason: string;
  comments: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  file: {
    id: string;
    applicantName: string;
    status: string;
    createdAt: string;
    partner: { name: string; code: string };
  };
  raisedBy: { name: string; role: string } | null;
}

const statusBadges: Record<string, string> = {
  OPEN: 'bg-red-500/10 text-red-500 border border-red-500/20',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  RESOLVED: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
};

const Escalations: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    timeTaken: string;
    fileId: string;
    applicant: string;
    status: string;
    reason?: string;
  } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const handleMouseMove = (e: React.MouseEvent, esc: Escalation) => {
    const raisedDate = new Date(esc.createdAt);
    const resolvedDate = esc.resolvedAt ? new Date(esc.resolvedAt) : new Date();
    const hoursElapsed = Math.round((resolvedDate.getTime() - raisedDate.getTime()) / (1000 * 60 * 60));
    
    setTooltip({
      x: e.clientX + 15,
      y: e.clientY + 15,
      timeTaken: `${hoursElapsed} hours`,
      fileId: esc.file.id,
      applicant: esc.file.applicantName,
      status: esc.file.status,
      reason: esc.reason
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Resolution modal/state for Admin
  const [activeResolveEsc, setActiveResolveEsc] = useState<Escalation | null>(null);
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');
  const [resolutionComments, setResolutionComments] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response = await api.get('/escalations', { params });
      setEscalations(response.data);
    } catch (error) {
      showToast('Error fetching escalation records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, [statusFilter, typeFilter]);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResolveEsc) return;

    setSubmittingResolution(true);
    try {
      await api.patch(`/escalations/${activeResolveEsc.id}/resolve`, {
        status: resolveStatus,
        comments: resolutionComments || undefined,
      });

      showToast(`Escalation ticket marked as ${resolveStatus}`, 'success');
      setActiveResolveEsc(null);
      setResolutionComments('');
      fetchEscalations();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update escalation ticket', 'error');
    } finally {
      setSubmittingResolution(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Filters Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded border">
            <AlertTriangle size={14} /> Filter Tickets
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-lg text-xs py-1.5 px-3 outline-none focus:border-primary text-foreground"
          >
            <option value="">All Statuses (Open & Resolved)</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-background border border-border rounded-lg text-xs py-1.5 px-3 outline-none focus:border-primary text-foreground"
          >
            <option value="">All Types (Auto & Manual)</option>
            <option value="MANUAL">Manual Escalations</option>
            <option value="AUTOMATED">Automated SLA Breaches</option>
          </select>
        </div>

        <button
          onClick={fetchEscalations}
          className="bg-muted hover:bg-muted/80 text-foreground p-2 rounded-lg border transition-all text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* Escalations Table */}
      <div className="glass-card rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">File ID</th>
                <th className="px-6 py-4">Applicant Name</th>
                <th className="px-6 py-4">Partner Agency</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Logged Date</th>
                <th className="px-6 py-4 text-center">Ticket Status</th>
                {user?.role === 'ADMIN' && <th className="px-6 py-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse bg-card">
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-muted rounded w-16 mx-auto" /></td>
                    {user?.role === 'ADMIN' && <td className="px-6 py-4"><div className="h-8 bg-muted rounded w-16 mx-auto" /></td>}
                  </tr>
                ))
              ) : escalations.length > 0 ? (
                escalations.map((esc) => (
                  <tr 
                    key={esc.id} 
                    onMouseMove={(e) => handleMouseMove(e, esc)}
                    onMouseLeave={handleMouseLeave}
                    className="hover:bg-muted/10 transition-colors bg-card cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-xs text-primary">{esc.file.id}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{esc.file.applicantName}</td>
                    <td className="px-6 py-4 text-xs">
                      <div>
                        <p className="font-semibold">{esc.file.partner.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{esc.file.partner.code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold">
                      <span className={`px-2 py-0.5 rounded-full ${
                        esc.type === 'AUTOMATED' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {esc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(esc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadges[esc.status]}`}>
                        {esc.status}
                      </span>
                    </td>
                    {user?.role === 'ADMIN' && (
                      <td className="px-6 py-4 text-center">
                        <button
                          disabled={esc.status === 'RESOLVED'}
                          onClick={() => {
                            setActiveResolveEsc(esc);
                            setResolveStatus(esc.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED');
                          }}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                            ${esc.status === 'RESOLVED' 
                              ? 'bg-muted text-muted-foreground border-transparent cursor-not-allowed' 
                              : 'bg-primary hover:bg-primary/95 text-white shadow-sm'
                            }
                          `}
                        >
                          Resolve
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 7 : 6} className="text-center py-12 text-muted-foreground">
                    <p className="font-bold text-sm">No Escalation Tickets Logged</p>
                    <p className="text-xs mt-1">Excellent! No files are currently delayed beyond processing time-limits.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Resolution Modal Dialog */}
      {activeResolveEsc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border p-6 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveResolveEsc(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg"
            >
              <X size={16} />
            </button>

            <h3 className="font-bold text-base text-foreground mb-1">Update Escalation Status</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ticket for case file: <span className="font-mono text-primary font-bold">{activeResolveEsc.file.id}</span> ({activeResolveEsc.file.applicantName})
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              {/* Select Status */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Action Status</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                >
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED (Close Ticket)</option>
                </select>
              </div>

              {/* Resolution Remarks */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Resolution Comments</label>
                <textarea
                  required
                  value={resolutionComments}
                  onChange={(e) => setResolutionComments(e.target.value)}
                  placeholder="Explain resolution (e.g. Valuation report cleared, query sent to underwriter, file approved)"
                  className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors h-24 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveResolveEsc(null)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-1.5"
                >
                  {submittingResolution ? 'Updating...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
            {tooltip.reason && <p className="text-muted-foreground"><strong className="text-foreground">Reason:</strong> {tooltip.reason}</p>}
            <p className="text-muted-foreground"><strong className="text-foreground">Duration:</strong> {tooltip.timeTaken}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Escalations;
