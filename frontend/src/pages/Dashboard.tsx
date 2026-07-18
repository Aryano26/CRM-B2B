import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  FolderCheck, Zap, AlertTriangle, AlertOctagon, ShieldAlert,
  Calendar, RefreshCw, ChevronRight, Ban
} from 'lucide-react';

interface EscalationAgingItem {
  id: string;
  fileId: string;
  reason: string;
  partnerName: string;
  partnerCode: string;
  daysSinceRaised: number;
  createdAt: string;
}

interface MetricDetails {
  totalLogged: number;
  activeEscalated: number;
}

interface Metrics {
  count: MetricDetails;
  amount: MetricDetails;
  pendingReview: number;
  approved: number;
  disbursed: number;
  rejected: number;
  slaBreached: number;
  avgTAT: string;
}

interface ChartItem {
  name: string;
  count?: number;
  value?: number;
  amount?: number;
  avgHours?: number;
}

interface ChartDataGroup {
  fileTrend: ChartItem[];
  statusDistribution: ChartItem[];
  escalationReasonData: ChartItem[];
  averageResolutionTimeData: ChartItem[];
}

interface ChartData {
  count: ChartDataGroup;
  amount: ChartDataGroup;
}

interface Partner {
  id: string;
  name: string;
  code: string;
}

const COLORS = ['#6366f1', '#a855f7', '#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [escalationAgingList, setEscalationAgingList] = useState<EscalationAgingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'count' | 'amount'>('count');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);

  // Fetch partners list if user is Admin
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/admin/partners')
        .then((res) => setPartners(res.data))
        .catch(() => showToast('Failed to load partner agencies filters', 'error'));
    }
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (selectedPartnerId) params.partnerId = selectedPartnerId;

      const response = await api.get('/dashboard/stats', { params });
      setMetrics(response.data.metrics);
      setCharts(response.data.charts);
      setEscalationAgingList(response.data.escalationAgingList || []);
    } catch (error) {
      showToast('Error loading dashboard analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo, selectedPartnerId]);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedPartnerId('');
  };

  // Helper formatting for currency
  const formatAmountValue = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(1)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getMetricValue = (countVal: number, amountVal: number) => {
    if (viewMode === 'amount') {
      return formatAmountValue(amountVal);
    }
    return countVal.toLocaleString('en-IN');
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Filter skeleton */}
        <div className="h-14 bg-card rounded-xl border border-border" />
        
        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-card rounded-xl border border-border" />
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-card rounded-xl border border-border" />
          <div className="h-80 bg-card rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Filter Panel */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border">
            <Calendar size={16} />
            <span>Filters</span>
          </div>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-background border border-border rounded-lg text-xs py-1.5 px-2.5 outline-none focus:border-primary text-foreground font-semibold"
            placeholder="From Date"
          />
          <span className="text-xs text-muted-foreground font-medium">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-background border border-border rounded-lg text-xs py-1.5 px-2.5 outline-none focus:border-primary text-foreground font-semibold"
            placeholder="To Date"
          />

          {user?.role === 'ADMIN' && (
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="bg-background border border-border rounded-lg text-xs py-1.5 px-2.5 outline-none focus:border-primary text-foreground font-semibold"
            >
              <option value="">All Partner Agencies</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          )}

          {(dateFrom || dateTo || selectedPartnerId) && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-red-500 font-semibold underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* View Mode Toggle & Refresh */}
        <div className="flex items-center gap-3">
          {/* Toggle buttons */}
          <div className="flex bg-muted/65 p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('count')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'count' 
                  ? 'bg-card text-foreground shadow-sm border border-border' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="View Case Counts"
            >
              <span className="font-mono text-xs">#</span>
              <span className="hidden sm:inline">Volume</span>
            </button>
            <button
              onClick={() => setViewMode('amount')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'amount' 
                  ? 'bg-card text-foreground shadow-sm border border-border' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="View Loan Amounts"
            >
              <span className="font-mono text-xs">₹</span>
              <span className="hidden sm:inline">Value</span>
            </button>
          </div>

          <button
            onClick={fetchStats}
            className="bg-muted hover:bg-muted/80 text-foreground p-2 rounded-lg border transition-all text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 gap-6">
        
        {/* Total Logged */}
        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Logged</p>
            <h3 className="text-3xl font-bold mt-1 text-foreground">
              {metrics ? getMetricValue(metrics.count.totalLogged, metrics.amount.totalLogged) : 0}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              {viewMode === 'amount' ? 'Total loan volume logged' : 'Files uploaded in CRM'}
            </p>
          </div>
          <div className="bg-blue-500/10 text-blue-500 p-4 rounded-xl">
            <FolderCheck size={24} />
          </div>
        </div>

        {/* Active Escalated */}
        <div className="glass-card p-6 rounded-xl flex items-center justify-between relative overflow-hidden">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Escalations</p>
            <h3 className="text-3xl font-bold mt-1 text-foreground">
              {metrics ? getMetricValue(metrics.count.activeEscalated, metrics.amount.activeEscalated) : 0}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              {viewMode === 'amount' ? 'Value of escalated cases' : 'Manual/Auto tickets open'}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${metrics && metrics.count.activeEscalated > 0 ? 'bg-red-500/10 text-red-500 animate-pulse-soft' : 'bg-muted text-muted-foreground'}`}>
            <AlertOctagon size={24} />
          </div>
        </div>

        {/* Average Turnaround Time */}
        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average TAT</p>
            <h3 className="text-3xl font-bold mt-1 text-foreground">{metrics?.avgTAT}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Log to decision interval</p>
          </div>
          <div className="bg-indigo-500/10 text-indigo-500 p-4 rounded-xl">
            <Zap size={24} />
          </div>
        </div>
      </div>

      {/* SLA Breach Banner */}
      {metrics && metrics.slaBreached > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 animate-pulse-soft shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 text-white p-2 rounded-lg">
              <ShieldAlert size={18} />
            </div>
            <div>
              <p className="text-sm font-bold">Action Required: SLA Breaches Detected</p>
              <p className="text-xs opacity-90">There are {metrics.slaBreached} case files currently pending beyond the SLA processing threshold.</p>
            </div>
          </div>
          <ChevronRight size={20} />
        </div>
      )}

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Case Submission Volume Trend */}
        <div className="glass-card p-6 rounded-xl flex flex-col">
          <h4 className="text-sm font-bold text-foreground mb-4">
            {viewMode === 'amount' ? 'Case Submission Loan Value Trend' : 'Case Submission Volume Trend'}
          </h4>
          <div className="h-64 flex-1">
            {charts && charts[viewMode].fileTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={charts[viewMode].fileTrend}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => viewMode === 'amount' ? formatAmountValue(val) : val} />
                  <Tooltip 
                    contentStyle={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontSize: '12px' }}
                    formatter={(val: any) => [viewMode === 'amount' ? formatAmountValue(val) : val, viewMode === 'amount' ? 'Value' : 'Count']}
                  />
                  <Bar dataKey={viewMode} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </ReBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Ban size={32} />
                <span className="text-xs">No historical logging trends found</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="glass-card p-6 rounded-xl flex flex-col">
          <h4 className="text-sm font-bold text-foreground mb-4">
            {viewMode === 'amount' ? 'Current Cases Status Value Breakdown' : 'Current Cases Status Breakdown'}
          </h4>
          <div className="h-64 flex-1 flex flex-col justify-center">
            {charts && charts[viewMode].statusDistribution.some(item => (item.value || 0) > 0) ? (
              <div className="h-full flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts[viewMode].statusDistribution.filter(item => (item.value || 0) > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {charts[viewMode].statusDistribution.filter(item => (item.value || 0) > 0).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                      formatter={(val: any) => [viewMode === 'amount' ? formatAmountValue(val) : val, 'Total']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom list details */}
                <div className="w-1/2 space-y-1.5 text-xs pl-4 max-h-56 overflow-y-auto">
                  {charts[viewMode].statusDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-muted-foreground font-medium">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {viewMode === 'amount' ? formatAmountValue(item.value || 0) : item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Ban size={32} />
                <span className="text-xs">No active status records logged</span>
              </div>
            )}
          </div>
        </div>

        {/* Escalation Reasons Chart & Table Row */}
        <div className="glass-card p-6 rounded-xl flex flex-col md:col-span-2">
          <h4 className="text-sm font-bold text-foreground mb-4">
            {viewMode === 'amount' ? 'Tickets Escalation Value Breakdown by Reason' : 'Tickets Escalation Breakdown by Reason'}
          </h4>
          <div className="h-64 flex-1">
            {charts && (charts[viewMode].escalationReasonData.length > 0 || escalationAgingList.length > 0) ? (
              <div className="h-full flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-2/3 h-full flex flex-col">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center font-bold border-b pb-1 mb-2 text-muted-foreground">
                    <span>Escalation Aging List (Oldest Open)</span>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 max-h-56 space-y-2">
                    {escalationAgingList.length > 0 ? (
                      escalationAgingList.map((item) => {
                        const isHighAge = item.daysSinceRaised > 3;
                        return (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors"
                          >
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="flex items-center gap-2">
                                <Link 
                                  to={`/cases?caseId=${item.fileId}`}
                                  className="text-xs font-bold font-mono text-primary hover:underline"
                                >
                                  {item.fileId}
                                </Link>
                                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded border truncate max-w-[150px]" title={item.partnerName}>
                                  {item.partnerName}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-foreground truncate mt-1" title={item.reason}>
                                {item.reason}
                              </p>
                            </div>
                            <div>
                              <span 
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isHighAge 
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}
                              >
                                {item.daysSinceRaised === 1 ? '1 day open' : `${item.daysSinceRaised} days open`}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 pt-8">
                        <span className="text-2xl">✅</span>
                        <span className="text-xs font-medium text-emerald-500 font-bold">No open escalations — all caught up</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Custom table list alongside chart */}
                <div className="w-full md:w-1/3 space-y-2.5 text-xs pl-4 md:border-l border-border max-h-56 overflow-y-auto">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 font-bold border-b pb-1 mb-2 text-muted-foreground">
                    <span>Category</span>
                    <span>{viewMode === 'amount' ? 'Value' : 'Count'}</span>
                  </div>
                  {charts[viewMode].escalationReasonData.map((item) => (
                    <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-0.5">
                      <span className="text-muted-foreground font-medium truncate max-w-[200px]" title={item.name}>{item.name}</span>
                      <span className="font-semibold text-foreground bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-mono text-[10px] border border-purple-500/20">
                        {viewMode === 'amount' ? formatAmountValue(item.value || 0) : item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <AlertTriangle size={32} />
                <span className="text-xs">No escalations files logged or open tickets found</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
