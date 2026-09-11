import React, { useEffect, useState } from 'react';
import { X, Clock, Shield, RefreshCw } from 'lucide-react';
import { AuditLog } from '../types';
import { Language, TRANSLATIONS } from '../lib/translations';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose, lang = 'en' }) => {
  const t = TRANSLATIONS[lang];
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 border-t-4 border-t-orange-500 rounded-2xl w-full max-w-3xl text-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t.auditLogsTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.auditLogsSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-slate-100 transition cursor-pointer"
              title={t.refreshLogs}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs divide-y divide-slate-100 bg-[#f8fafc]">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">{t.noAuditLogs}</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="pt-3.5 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">{log.action}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-blue-700 font-semibold">{log.jurisdiction}</span>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed font-normal">{log.details}</p>
                <div className="text-[10px] text-slate-400 font-mono">
                  User: {log.userEmail} {log.productName && `| Product: ${log.productName}`}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 text-slate-500 text-[11px] flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            DPDP Act 2023 Compliant Audit Trail
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
