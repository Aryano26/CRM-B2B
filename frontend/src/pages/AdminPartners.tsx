import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { 
  UserCheck, Search, RefreshCw, ShieldX
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  code: string;
  status: string;
  createdAt: string;
  _count: {
    users: number;
    files: number;
  };
}

const AdminPartners: React.FC = () => {
  const { showToast } = useToast();
  
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/partners');
      setPartners(response.data);
    } catch (error) {
      showToast('Error loading partner agencies list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setTogglingId(id);
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/admin/partners/${id}/status`, { status: nextStatus });
      showToast(`Partner status updated to ${nextStatus}`, 'success');
      
      // Update local state
      setPartners(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, status: nextStatus };
        }
        return p;
      }));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update partner agency status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Search Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agencies by name or code..."
            className="w-full bg-background border border-border focus:border-primary rounded-lg py-2 pl-10 pr-4 text-xs outline-none transition-colors"
          />
        </div>

        <button
          onClick={fetchPartners}
          className="bg-muted hover:bg-muted/80 text-foreground p-2 rounded-lg border transition-all text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Partners
        </button>
      </div>

      {/* Partners List Table */}
      <div className="glass-card rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Agency Code</th>
                <th className="px-6 py-4">Agency Name</th>
                <th className="px-6 py-4 text-center">User Count</th>
                <th className="px-6 py-4 text-center">Case Files Count</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse bg-card">
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-12 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-12 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-muted rounded w-16 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-muted rounded w-16 mx-auto" /></td>
                  </tr>
                ))
              ) : filteredPartners.length > 0 ? (
                filteredPartners.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/10 transition-colors bg-card">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-primary">{p.code}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">{p.name}</td>
                    <td className="px-6 py-4 text-center font-semibold text-muted-foreground">{p._count.users}</td>
                    <td className="px-6 py-4 text-center font-semibold text-muted-foreground">{p._count.files}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        p.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {p.status === 'ACTIVE' ? <UserCheck size={12} /> : <ShieldX size={12} />}
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        disabled={togglingId === p.id}
                        onClick={() => handleToggleStatus(p.id, p.status)}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 mx-auto
                          ${p.status === 'ACTIVE'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                          }
                        `}
                      >
                        {togglingId === p.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : p.status === 'ACTIVE' ? (
                          <>Deactivate</>
                        ) : (
                          <>Activate</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <p className="font-bold text-sm">No Partner Agencies Registered</p>
                    <p className="text-xs mt-1">Select other search parameters or register new partners.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPartners;
