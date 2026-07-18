import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Building2, KeyRound, Mail, User, ShieldAlert, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tabs: 'login' | 'signup' | 'forgot'
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>(
    searchParams.get('expired') ? 'login' : 'login'
  );

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'PARTNER' | 'ADMIN'>('PARTNER');
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (tab === 'login') {
        await login(email, password);
        showToast('Successfully logged in!', 'success');
        navigate('/');
      } else if (tab === 'signup') {
        if (role === 'PARTNER' && (!partnerCode || !partnerName)) {
          showToast('Partner Code and Agency Name are required', 'error');
          setSubmitting(false);
          return;
        }
        await register(email, name, password, partnerCode, partnerName);
        showToast('Registration successful!', 'success');
        navigate('/');
      } else {
        // Forgot password
        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate api
        showToast('Password reset link dispatched!', 'success');
        setTab('login');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Authentication action failed';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Visual Backdrops */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md glass-card bg-card/80 p-8 rounded-2xl relative z-10">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-primary/10 text-primary p-3 rounded-2xl mb-3 border border-primary/20">
            <Building2 size={28} className="animate-pulse-soft" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Partner Portal</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage files, track turnaround time, and view metrics.</p>
        </div>

        {/* Expired Session Alert */}
        {searchParams.get('expired') && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/20 text-red-500 flex items-center gap-2 text-xs">
            <ShieldAlert size={14} />
            <span>Session expired. Please login again.</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex bg-muted rounded-lg p-1 mb-6 border border-border">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
              tab === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
              tab === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'signup' && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-muted-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Role Picker */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-muted-foreground">System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'PARTNER' | 'ADMIN')}
                  className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-sm outline-none transition-colors"
                >
                  <option value="PARTNER">External Partner (DSA/Dealer)</option>
                  <option value="ADMIN">Internal Ops Admin</option>
                </select>
              </div>

              {role === 'PARTNER' && (
                <div className="grid grid-cols-2 gap-4 border-l-2 border-primary/20 pl-3">
                  {/* Partner Code */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-muted-foreground">Partner Code</label>
                    <input
                      type="text"
                      required
                      value={partnerCode}
                      onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                      placeholder="e.g. APEX100"
                      className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-sm outline-none transition-colors"
                    />
                  </div>
                  {/* Partner Name */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-muted-foreground">Agency Name</label>
                    <input
                      type="text"
                      required
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder="e.g. Apex Auto"
                      className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-sm outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-muted-foreground">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-muted-foreground" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            /* Password */
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">Password</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => setTab('forgot')}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 text-muted-foreground" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm rounded-xl py-3 mt-4 flex items-center justify-center gap-2 shadow-md shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {tab === 'login' && 'Sign In'}
                {tab === 'signup' && 'Register Portal'}
                {tab === 'forgot' && 'Send Reset Link'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Back Link */}
        {tab === 'forgot' && (
          <button
            onClick={() => setTab('login')}
            className="w-full text-center text-xs text-muted-foreground mt-4 hover:text-foreground font-semibold"
          >
            ← Back to Login
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;
