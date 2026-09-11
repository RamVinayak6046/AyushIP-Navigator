import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Clock, Zap, Globe, Shield, User as UserIcon, LogOut, ChevronDown, CheckCircle2, Building, MapPin } from 'lucide-react';
import { Jurisdiction, User } from '../types';
import { Language, TRANSLATIONS } from '../lib/translations';

interface HeaderProps {
  jurisdiction: Jurisdiction;
  onJurisdictionChange: (jurisdiction: Jurisdiction) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  onOpenAuditLogs: () => void;
  onOpenKnowledgeBase: () => void;
  onRunDemo: (scenarioId: string) => void;
  activeView: 'dashboard' | 'cockpit';
  onNavigateHome: () => void;
  currentUser?: User | null;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  jurisdiction,
  onJurisdictionChange,
  lang,
  onLangChange,
  onOpenAuditLogs,
  onOpenKnowledgeBase,
  onRunDemo,
  activeView,
  onNavigateHome,
  currentUser,
  onOpenAuth,
  onLogout
}) => {
  const t = TRANSLATIONS[lang];
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'VAIDYA': return '🌿 Vaidya';
      case 'STARTUP_MSME': return '🚀 MSME';
      case 'RESEARCHER': return '🔬 Researcher';
      case 'IP_PROFESSIONAL': return '⚖️ IP Agent';
      case 'ADMIN': return '🏭 Admin';
      default: return 'Applicant';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-800 shadow-xs">
      {/* Top Simple Navigation Header matching prototype style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand with Om symbol logo and AyushIP Navigator */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={onNavigateHome}
          title="Return to Home Dashboard"
        >
          <div className="w-9 h-9 rounded-xl bg-[#0e6259] text-white flex items-center justify-center font-bold text-xl shadow-xs select-none">
            ॐ
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black text-orange-600 tracking-tight leading-none">
              AyushIP <span className="text-slate-900">{lang === 'hi' ? 'नेविगेटर' : 'Navigator'}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide">
              {lang === 'hi' ? 'आयुष वैधानिक आईपी एवं नियामक सह-पायलट' : 'Traditional Medicine Statutory Co-Pilot'}
            </span>
          </div>
        </div>

        {/* Right Menu Links matching prototype style */}
        <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm font-medium text-slate-600">
          <button
            onClick={onNavigateHome}
            className={`transition cursor-pointer ${
              activeView === 'dashboard'
                ? 'text-orange-600 font-bold'
                : 'hover:text-orange-600 text-slate-600'
            }`}
          >
            {t.home}
          </button>

          <button
            onClick={onOpenKnowledgeBase}
            className="hover:text-orange-600 transition cursor-pointer text-slate-600 flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.corpus}</span>
          </button>

          <button
            onClick={onOpenAuditLogs}
            className="hover:text-orange-600 transition cursor-pointer text-slate-600 flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">{t.auditLogs}</span>
          </button>

          {/* Clean Jurisdiction Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => onJurisdictionChange('INDIA')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                jurisdiction === 'INDIA'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇮🇳</span>
              <span>{t.india}</span>
            </button>
            <button
              onClick={() => onJurisdictionChange('INTERNATIONAL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                jurisdiction === 'INTERNATIONAL'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🌎</span>
              <span>{t.international}</span>
            </button>
          </div>

          {/* Language Toggle matching screenshot */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold gap-1">
            <button
              onClick={() => onLangChange('en')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                lang === 'en'
                  ? 'bg-[#0e6259] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLangChange('hi')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                lang === 'hi'
                  ? 'bg-[#0e6259] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* User Auth Section */}
          {currentUser ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-[#0e6259] text-white flex items-center justify-center font-bold text-[11px]">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden md:block leading-tight">
                  <div className="font-bold text-slate-800 truncate max-w-[110px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-orange-600 font-medium">
                    {getRoleBadge(currentUser.role)}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="pb-3 border-b border-slate-100 mb-3">
                    <div className="font-bold text-slate-900 text-sm">{currentUser.name}</div>
                    <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-bold text-[10px] border border-orange-200">
                        {getRoleBadge(currentUser.role)}
                      </span>
                      {currentUser.organization && (
                        <span className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          {currentUser.organization}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Statutory Compliance Badges */}
                  <div className="space-y-1.5 py-1 mb-3 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>DPDP Act 2023 Consent Verified</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>BDA 2002/2023 Undertaking Signed</span>
                    </div>
                    {currentUser.state && (
                      <div className="flex items-center gap-1.5 text-slate-600 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>State Jurisdiction: {currentUser.state}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAuth?.('login');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Switch / Login Another Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth?.('login')}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Login / Register</span>
            </button>
          )}
        </div>
      </div>

      {/* Scope Subtitle Strip */}
      <div className="bg-orange-50/70 border-t border-orange-100/80 px-4 py-1.5 text-xs text-orange-800 text-center font-medium">
        <span className="font-bold">
          {jurisdiction === 'INDIA' ? `🇮🇳 ${t.jurisdictionLabel}: ${t.india}` : `🌎 ${t.jurisdictionLabel}: ${t.international}`}
        </span>
        {' — '}
        <span className="text-slate-600 text-[11px]">{jurisdiction === 'INDIA' ? t.indiaBadgeDesc : t.intlBadgeDesc}</span>
      </div>
    </header>
  );
};
