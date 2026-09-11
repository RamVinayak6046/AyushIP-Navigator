import React, { useState } from 'react';
import { X, BookOpen, Search, ExternalLink, Globe } from 'lucide-react';
import { AUTHORITATIVE_CORPUS } from '../../server/corpus';
import { Jurisdiction } from '../types';
import { Language, TRANSLATIONS } from '../lib/translations';

interface KnowledgeCorpusModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeJurisdiction: Jurisdiction;
  lang?: Language;
}

export const KnowledgeCorpusModal: React.FC<KnowledgeCorpusModalProps> = ({
  isOpen,
  onClose,
  activeJurisdiction,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];
  const [filterScope, setFilterScope] = useState<'ALL' | 'INDIA' | 'INTERNATIONAL'>(activeJurisdiction);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filtered = AUTHORITATIVE_CORPUS.filter(item => {
    const matchesScope = filterScope === 'ALL' || item.jurisdiction === filterScope;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesScope;

    const matchesSearch =
      item.title.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q) ||
      item.framework.toLowerCase().includes(q) ||
      item.passage.toLowerCase().includes(q) ||
      (item.tags || []).some(t => t.toLowerCase().includes(q));

    return matchesScope && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 border-t-4 border-t-orange-500 rounded-2xl w-full max-w-4xl text-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t.corpusTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.corpusSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <button
              onClick={() => setFilterScope('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                filterScope === 'ALL'
                  ? 'bg-orange-500 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.allStatutes} ({AUTHORITATIVE_CORPUS.length})
            </button>
            <button
              onClick={() => setFilterScope('INDIA')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                filterScope === 'INDIA'
                  ? 'bg-orange-500 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇮🇳 {t.indiaStatutes}
            </button>
            <button
              onClick={() => setFilterScope('INTERNATIONAL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                filterScope === 'INTERNATIONAL'
                  ? 'bg-orange-500 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌎 {t.internationalTreaties}
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchCorpusPlaceholder}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>
        </div>

        {/* Document List Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs bg-[#f8fafc]">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              {t.corpusEmpty}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-orange-200 hover:shadow-sm transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-orange-700 text-xs bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
                      {item.section}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      item.jurisdiction === 'INDIA'
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {item.jurisdiction === 'INDIA' ? t.india : t.international}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                      {item.strength} Strength
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  {item.authority} — <span className="text-emerald-700 font-semibold">{item.framework}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 leading-relaxed text-xs">
                  "{item.passage}"
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                  <div className="flex flex-wrap gap-1">
                    {(item.tags || []).map((tag, tIdx) => (
                      <span key={tIdx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {item.pageRecord && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        📄 {item.pageRecord}
                      </span>
                    )}
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 font-semibold text-xs transition"
                        title={`Open official statutory source: ${item.sourceUrl}`}
                      >
                        {t.officialSource} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-slate-500 text-xs">
          <span>{filtered.length} {t.corpusShowing}</span>
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
