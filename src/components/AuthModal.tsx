import React, { useState } from 'react';
import { X, Shield, Lock, Mail, User as UserIcon, Building, MapPin, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { User, UserRole } from '../types';
import { Language, TRANSLATIONS } from '../lib/translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  lang: Language;
  initialMode?: 'login' | 'register';
}

const INDIAN_STATES = [
  'Kerala', 'Karnataka', 'Maharashtra', 'Delhi', 'Gujarat', 'Tamil Nadu',
  'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Andhra Pradesh', 'Telangana',
  'West Bengal', 'Punjab', 'Haryana', 'Uttarakhand', 'Himachal Pradesh',
  'Assam', 'Odisha', 'Goa', 'National / Central'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lang,
  initialMode = 'login'
}) => {
  const t = TRANSLATIONS[lang];
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('STARTUP_MSME');
  const [organization, setOrganization] = useState('');
  const [state, setState] = useState('Kerala');
  const [dpdpConsent, setDpdpConsent] = useState(true);
  const [bdaComplianceAck, setBdaComplianceAck] = useState(true);
  const [statutoryDisclaimerAck, setStatutoryDisclaimerAck] = useState(true);

  if (!isOpen) return null;

  const handleQuickDemo = () => {
    setEmail('demo@ayuship.in');
    setPassword('demo123');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to authenticate');
        }

        localStorage.setItem('ayuship_token', data.token);
        localStorage.setItem('ayuship_user', JSON.stringify(data.user));
        setSuccessMessage('Logged in successfully! Welcome back.');
        setTimeout(() => {
          onSuccess(data.user);
          onClose();
        }, 500);
      } else {
        // Register Mode
        if (!name.trim()) {
          throw new Error('Full legal name is required.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (!dpdpConsent) {
          throw new Error('DPDP Act 2023 consent is legally mandatory for account creation.');
        }
        if (!bdaComplianceAck) {
          throw new Error('Biological Diversity Act & Patents Act undertaking is required.');
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            role,
            organization: organization.trim() || 'Independent Innovator',
            state,
            dpdpConsent,
            bdaComplianceAck
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        localStorage.setItem('ayuship_token', data.token);
        localStorage.setItem('ayuship_user', JSON.stringify(data.user));
        setSuccessMessage('Account registered and credentials saved! You can now log in anytime.');
        setTimeout(() => {
          onSuccess(data.user);
          onClose();
        }, 700);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-t-4 border-orange-500 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0e6259] text-white flex items-center justify-center font-bold text-base shadow-xs select-none">
              ॐ
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {mode === 'login' ? 'Sign In' : 'Register Statutory Account'}
              </h2>
              <p className="text-xs text-slate-500">
                AyushIP Navigator • Ministry of Ayush Statutory Co-Pilot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              mode === 'login'
                ? 'border-orange-500 text-orange-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In with Registered Account
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMessage(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              mode === 'register'
                ? 'border-orange-500 text-orange-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            New Registration (with Legal)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'login' ? (
            <>
              {/* Quick Demo Autofill Notice */}
              <div className="p-3 bg-orange-50/80 border border-orange-200/80 rounded-xl flex items-center justify-between">
                <div className="text-xs text-orange-800">
                  <span className="font-bold">Fast Prototype Review:</span>
                  <span className="text-[11px] block text-orange-700">Pre-seeded demo user: demo@ayuship.in</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="px-2.5 py-1 bg-white border border-orange-300 text-orange-700 text-xs font-semibold rounded-lg hover:bg-orange-100/50 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Quick Autofill
                </button>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Name / Applicant Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password (minimum 6 characters) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role & State in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Entity Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-400 font-medium"
                  >
                    <option value="STARTUP_MSME">🚀 Startup / MSME</option>
                    <option value="VAIDYA">🌿 AYUSH Practitioner / Vaidya</option>
                    <option value="RESEARCHER">🔬 Clinical / Academic Researcher</option>
                    <option value="IP_PROFESSIONAL">⚖️ Patent Agent / IP Advocate</option>
                    <option value="ADMIN">🏭 AYUSH Enterprise / Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State Biodiversity Jurisdiction
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-400 font-medium"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Organization */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization / Clinic / Enterprise Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Statutory Legal Undertakings Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5 text-orange-600" />
                  Mandatory Statutory Declarations & Legal Undertakings
                </div>

                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dpdpConsent}
                    onChange={(e) => setDpdpConsent(e.target.checked)}
                    className="mt-0.5 rounded-sm text-orange-600 focus:ring-orange-500 border-slate-300"
                  />
                  <span className="text-[11px] leading-tight text-slate-600">
                    <strong className="text-slate-800">DPDP Act 2023 Consent:</strong> I provide explicit, informed consent for the processing of applicant profile data in strict adherence to Section 6 of the Digital Personal Data Protection Act, 2023.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bdaComplianceAck}
                    onChange={(e) => setBdaComplianceAck(e.target.checked)}
                    className="mt-0.5 rounded-sm text-orange-600 focus:ring-orange-500 border-slate-300"
                  />
                  <span className="text-[11px] leading-tight text-slate-600">
                    <strong className="text-slate-800">Biodiversity & Patents Undertaking:</strong> I declare that all biological resource access intimations and patent claims evaluated on this portal comply with the Biological Diversity Act 2002 (as amended 2023) and Section 3 of the Indian Patents Act 1970.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={statutoryDisclaimerAck}
                    onChange={(e) => setStatutoryDisclaimerAck(e.target.checked)}
                    className="mt-0.5 rounded-sm text-orange-600 focus:ring-orange-500 border-slate-300"
                  />
                  <span className="text-[11px] leading-tight text-slate-600">
                    <strong className="text-slate-800">AI Decision-Support Disclaimer:</strong> I acknowledge that AyushIP Navigator provides automated statutory intelligence and does not substitute for certified legal counsel or formal patent office orders.
                  </span>
                </label>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Processing statutory authentication...</span>
            ) : mode === 'login' ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In to AyushIP Navigator</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Register & Save Credentials Permanently</span>
              </>
            )}
          </button>

          {/* Mode Switch Helper */}
          <div className="text-center pt-1 text-xs text-slate-500">
            {mode === 'login' ? (
              <span>
                Don't have a registered account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMessage(null); }}
                  className="font-bold text-orange-600 hover:underline cursor-pointer"
                >
                  Register here with legal compliance
                </button>
              </span>
            ) : (
              <span>
                Already registered with your password?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(null); }}
                  className="font-bold text-orange-600 hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
