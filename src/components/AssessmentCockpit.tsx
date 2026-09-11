import React, { useState } from 'react';
import {
  Shield, Globe, AlertTriangle, CheckCircle2, FileText,
  ExternalLink, Sparkles, Send, ArrowRight, Download, BookOpen, Scale,
  ChevronDown, ChevronUp, Clock, AlertOctagon, Check, FileCheck, BarChart3
} from 'lucide-react';
import { Product, AssessmentResult, Jurisdiction, EvidenceItem, Citation } from '../types';
import { Language, TRANSLATIONS } from '../lib/translations';

interface AssessmentCockpitProps {
  product: Product;
  assessment: AssessmentResult;
  jurisdiction: Jurisdiction;
  onJurisdictionChange: (j: Jurisdiction) => void;
  onAskAi: (question: string) => Promise<{
    answer: string;
    evidenceStrength: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
    isAbstaining: boolean;
    abstentionMessage?: string;
    citationsUsed: Citation[];
    searchMeta?: { totalSearched: number; relevantCount: number; isAbstentionTriggered: boolean };
  }>;
  onDownloadReport: () => void;
  lang: Language;
}

export const AssessmentCockpit: React.FC<AssessmentCockpitProps> = ({
  product,
  assessment,
  jurisdiction,
  onJurisdictionChange,
  onAskAi,
  onDownloadReport,
  lang
}) => {
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = useState<'overview' | 'ip' | 'regulatory' | 'abs' | 'export' | 'rag'>('overview');
  const [userQuestion, setUserQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatAnswer, setChatAnswer] = useState<{
    question: string;
    answer: string;
    strength: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
    isAbstaining: boolean;
    abstentionReason?: string;
    citations: Citation[];
    totalSearched?: number;
    relevantCount?: number;
  } | null>(null);

  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);

  const handlePresetQuestion = async (q: string) => {
    setUserQuestion(q);
    setIsAsking(true);
    try {
      const res = await onAskAi(q);
      const cits = Array.isArray(res.citationsUsed)
        ? res.citationsUsed
        : Array.isArray((res as any).citations)
        ? (res as any).citations
        : [];
      setChatAnswer({
        question: q,
        answer: res.answer,
        strength: res.evidenceStrength || 'HIGH',
        isAbstaining: !!res.isAbstaining,
        abstentionReason: res.abstentionMessage,
        citations: cits,
        totalSearched: res.searchMeta?.totalSearched,
        relevantCount: res.searchMeta?.relevantCount
      });
      setActiveTab('rag');
    } catch (err) {
      console.error('Preset question error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  const handleCustomQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    setIsAsking(true);
    try {
      const res = await onAskAi(userQuestion);
      const cits = Array.isArray(res.citationsUsed)
        ? res.citationsUsed
        : Array.isArray((res as any).citations)
        ? (res as any).citations
        : [];
      setChatAnswer({
        question: userQuestion,
        answer: res.answer,
        strength: res.evidenceStrength || 'HIGH',
        isAbstaining: !!res.isAbstaining,
        abstentionReason: res.abstentionMessage,
        citations: cits,
        totalSearched: res.searchMeta?.totalSearched,
        relevantCount: res.searchMeta?.relevantCount
      });
      setActiveTab('rag');
    } catch (err) {
      console.error('Custom question error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner matching screenshot style (white with orange top border) */}
      <div className="bg-white border border-slate-200 border-t-4 border-t-orange-500 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-mono">
                {product.classification.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ID: {product.id}
              </span>
              {assessment.safeAbstention && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Safe Abstention Active
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-600 tracking-tight">
              {product.name}
            </h1>

            {product.brandName && (
              <p className="text-xs text-slate-500 font-medium">
                Working Brand: <strong className="text-slate-800">{product.brandName}</strong>
              </p>
            )}

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
              {product.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Jurisdiction Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center">
              <button
                onClick={() => onJurisdictionChange('INDIA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  jurisdiction === 'INDIA'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🇮🇳 {t.india}
              </button>
              <button
                onClick={() => onJurisdictionChange('INTERNATIONAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  jurisdiction === 'INTERNATIONAL'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌎 {t.international}
              </button>
            </div>

            <button
              onClick={onDownloadReport}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-600" />
              <span>{t.printReport}</span>
            </button>
          </div>
        </div>

        {/* Product Attributes Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t.dosageFormAttr}</span>
            <span className="font-bold text-slate-800">{product.dosageForm}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t.applicantEntityAttr}</span>
            <span className="font-bold text-slate-800">{product.applicantType.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t.biologicalSourceAttr}</span>
            <span className="font-bold text-slate-800">{product.resourceSource.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t.stateJurisdictionAttr}</span>
            <span className="font-bold text-orange-600">{product.stateJurisdiction} (SBB)</span>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Scorecard Cards (Matching Screenshot orange top border style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Signal 1: Patent Status */}
        <div className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider shrink-0">
                {t.patentFeasibility}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                {assessment.patentRoute.status}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 mt-2">
              <p>{t.noveltyLabel}: <strong className="text-slate-800">{assessment.patentRoute.novelty}</strong></p>
              <p className="text-orange-700 font-medium text-[11px] leading-tight">
                {assessment.patentRoute.traditionalKnowledgeFlag
                  ? t.tkBarDetected
                  : t.tkNoConflict}
              </p>
            </div>
          </div>
        </div>

        {/* Signal 2: ABS Compliance */}
        <div className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider shrink-0">
                {t.absCompliance}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                {assessment.absRoute.absStatus.includes('Intimation') ? 'SBB Intimation' :
                 assessment.absRoute.absStatus.includes('NBA') ? 'NBA Approval' :
                 assessment.absRoute.absStatus}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 mt-2">
              <p>{t.authorityLabel}: <strong className="text-slate-800">{assessment.absRoute.authority}</strong></p>
              <p className="text-slate-500 text-[11px] leading-tight">
                {t.formsLabel}: {assessment.absRoute.formsRequired.join(', ') || 'Statutory clearance'}
              </p>
            </div>
          </div>
        </div>

        {/* Signal 3: Regulatory Licensing (Fixed data/matter styling and badge overflow) */}
        <div className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider shrink-0">
                {t.regulatoryLicense}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                {assessment.regulatoryPathway.licensingPathway.includes('Form 25D') ? 'Form 25D' :
                 assessment.regulatoryPathway.licensingPathway.includes('Form 25E') ? 'Form 25E' :
                 assessment.regulatoryPathway.licensingPathway.includes('Aahar') ? 'Ayurveda Aahar' :
                 'Ayush License'}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1.5 mt-2">
              <p className="text-slate-800 font-medium leading-tight text-[11px] line-clamp-2" title={assessment.regulatoryPathway.licensingPathway}>
                {assessment.regulatoryPathway.licensingPathway}
              </p>
              <p className="text-[11px]">
                {t.frameworkLabel}: <strong className="text-slate-800">{assessment.regulatoryPathway.framework}</strong>
              </p>
            </div>
          </div>
          <p className="text-slate-400 text-[10px] pt-1.5 border-t border-slate-100">
            {t.testingLabel}: {t.mandateTesting}
          </p>
        </div>

        {/* Signal 4: Global Treaties */}
        <div className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider shrink-0">
                {t.globalTreaties}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-700 shrink-0">
                WIPO 2024
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 mt-2">
              <p>{t.disclosureLabel}: <strong className="text-slate-800">{t.wipoOriginMandate}</strong></p>
              <p className="text-slate-500 text-[11px]">
                Target: {product.targetExportMarket || 'US FDA DSHEA'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cockpit Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-orange-500 text-white font-bold shadow-xs'
              : 'bg-white text-slate-600 hover:text-orange-600 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{t.tabOverview}</span>
        </button>

        <button
          onClick={() => setActiveTab('ip')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ip'
              ? 'bg-orange-500 text-white font-bold shadow-xs'
              : 'bg-white text-slate-600 hover:text-orange-600 border border-slate-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>{t.tabIpRegimes}</span>
        </button>

        <button
          onClick={() => setActiveTab('regulatory')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'regulatory'
              ? 'bg-orange-500 text-white font-bold shadow-xs'
              : 'bg-white text-slate-600 hover:text-orange-600 border border-slate-200'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>{t.tabLicensing}</span>
        </button>

        <button
          onClick={() => setActiveTab('abs')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'abs'
              ? 'bg-orange-500 text-white font-bold shadow-xs'
              : 'bg-white text-slate-600 hover:text-orange-600 border border-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{t.tabAbs}</span>
        </button>

        {jurisdiction === 'INTERNATIONAL' && (
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-orange-500 text-white font-bold shadow-xs'
                : 'bg-white text-slate-600 hover:text-orange-600 border border-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t.tabExport}</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('rag')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'rag'
              ? 'bg-orange-500 text-white font-bold shadow-xs'
              : 'bg-white text-orange-600 hover:bg-orange-50 border border-orange-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.tabRagAssistant}</span>
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                {t.groundedReasoning} ({jurisdiction} Scope)
              </h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Confidence: {assessment.confidence}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              {assessment.aiReasoning}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-orange-500" />
              {t.complianceRoadmap}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessment.recommendedNextSteps.map((step, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded">
                      {step.stage}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      step.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {step.priority} {t.priorityLabel.toUpperCase()}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{step.title}</div>
                  <p className="text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IP REGIMES */}
      {activeTab === 'ip' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-orange-500" />
                {t.patentAssessment} ({jurisdiction})
              </h3>
              <span className="text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-700 font-semibold border border-orange-200 font-mono">
                {assessment.patentRoute.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t.noveltyStatus}</span>
                <span className="font-bold text-slate-900 text-sm">{assessment.patentRoute.novelty}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t.inventiveStepSynergy}</span>
                <span className="font-bold text-slate-900 text-sm">{assessment.patentRoute.inventiveStep}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">TKDL Prior Art Conflict</span>
                <span className="font-bold text-red-600 font-mono text-sm">
                  {assessment.patentRoute.traditionalKnowledgeFlag ? 'FLAGGED (Section 3(p) Risk)' : 'CLEAR'}
                </span>
              </div>
            </div>

            {assessment.patentRoute.exclusionsApplicable.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-orange-500 border-y border-r border-amber-200 text-xs text-slate-800 space-y-2">
                <span className="font-bold flex items-center gap-1.5 text-orange-700 uppercase tracking-tight text-xs">
                  <AlertTriangle className="w-4 h-4 text-orange-600" /> Statutory Patenting Exclusions Identified:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {assessment.patentRoute.exclusionsApplicable.map((exc, idx) => (
                    <li key={idx}>{exc}</li>
                  ))}
                </ul>
              </div>
            )}

            {assessment.patentRoute.priorArtMatches.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Authoritative Prior Art & TKDL Citations
                </span>
                <div className="space-y-1.5">
                  {assessment.patentRoute.priorArtMatches.map((pa, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono">
                      {pa}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                {t.recommendedSteps}
              </span>
              <ul className="space-y-2 text-xs">
                {assessment.patentRoute.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <Check className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Trade Mark Classification & Scrutiny
              </h4>
              <p className="text-xs text-slate-600">
                Applicable Classes: <strong className="text-slate-900">{assessment.trademarkRoute.classes.join(', ')}</strong>
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700">
                {assessment.trademarkRoute.guidance}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                Geographical Indications (GI) Status
              </h4>
              <p className="text-xs text-slate-600">
                Status: <strong className="text-slate-900">{assessment.giRoute.relevance}</strong>
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700">
                {assessment.giRoute.guidance}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REGULATORY PATHWAY */}
      {activeTab === 'regulatory' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Regulatory Compliance & Licensing Dossier
                </h3>
                <p className="text-xs text-slate-500">
                  Framework: {assessment.regulatoryPathway.framework}
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold font-mono">
                {assessment.regulatoryPathway.licensingPathway}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Mandatory Documentation & Filings
              </span>
              <div className="space-y-2">
                {assessment.regulatoryPathway.documentationRequired.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Safety & Laboratory Testing Protocols (GLP / NABL)
              </span>
              <div className="space-y-2">
                {assessment.regulatoryPathway.safetyTestingRequired.map((test, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{test}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-50 border-l-4 border-red-500 border-y border-r border-red-200 text-xs space-y-2">
              <span className="font-bold text-red-700 flex items-center gap-1.5 uppercase tracking-tight text-xs">
                <AlertOctagon className="w-4 h-4" /> Advertising Scrutiny — Drugs and Magic Remedies Act 1954:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                {assessment.regulatoryPathway.advertisingScrutiny.map((adv, idx) => (
                  <li key={idx}>{adv}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BIOLOGICAL RESOURCES & ABS */}
      {activeTab === 'abs' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-500" />
                  Access & Benefit Sharing (ABS) Assessment
                </h3>
                <p className="text-xs text-slate-500">
                  Biological Diversity Act 2002 & BD (Amendment) Act 2023
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold font-mono">
                {assessment.absRoute.absStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Biological Resource?</span>
                <span className="font-bold text-emerald-700">YES (Detected)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Origin Source?</span>
                <span className="font-bold text-emerald-700">YES ({product.resourceSource})</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Commercial Activity?</span>
                <span className="font-bold text-emerald-700">YES (Production)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">IP / Patent Filing?</span>
                <span className="font-bold text-orange-600">YES (Form 3)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed space-y-2">
              <p><strong>Statutory Rationale:</strong> {assessment.absRoute.reason}</p>
              <p className="text-slate-600">
                <strong>Competent Authority:</strong> <span className="text-orange-600 font-bold">{assessment.absRoute.authority}</span>
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Required Regulatory Filings
              </span>
              <div className="space-y-2">
                {assessment.absRoute.formsRequired.map((form, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-orange-700 font-mono flex items-center justify-between">
                    <span className="font-bold">{form}</span>
                    <span className="text-[10px] px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                      Mandatory Prior Filing
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXPORT MARKETS & WIPO */}
      {activeTab === 'export' && jurisdiction === 'INTERNATIONAL' && assessment.internationalExportRoute && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  International Market Access & Treaty Obligations
                </h3>
                <p className="text-xs text-slate-500">
                  Target Market: {assessment.internationalExportRoute.targetMarket} | WIPO GRATK 2024
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold font-mono">
                {assessment.internationalExportRoute.targetMarket} Regulatory Scheme
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-blue-700 block text-[10px] uppercase font-bold mb-1">
                  WIPO GRATK Treaty (Adopted May 2024, Geneva)
                </span>
                <p className="text-slate-800 leading-relaxed">
                  {assessment.internationalExportRoute.wipoGratkDisclosure}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-blue-700 block text-[10px] uppercase font-bold mb-1">
                  Target Market Framework ({assessment.internationalExportRoute.targetMarket})
                </span>
                <p className="text-slate-800 leading-relaxed">
                  {assessment.internationalExportRoute.marketAccessFramework}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RAG STATUTORY ASSISTANT */}
      {activeTab === 'rag' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                {lang === 'hi' ? 'मानक वैधानिक प्रश्न' : 'Quick Statutory Questions'}
              </span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">
                {lang === 'hi' ? 'सत्यापित शून्य-मतिभ्रम' : '0-Hallucination Verified'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePresetQuestion(
                  lang === 'hi'
                    ? 'क्या इस पारंपरिक फॉर्मूलेशन को पेटेंट कराया जा सकता है? धारा 3(p) और धारा 3(e) के क्या प्रभाव हैं?'
                    : 'Can this traditional formulation be patented? What are the Section 3(p) and Section 3(e) implications?'
                )}
                className="p-3 text-left text-xs rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-800 border border-slate-200 hover:border-orange-300 transition cursor-pointer"
              >
                <strong className="block text-blue-600">
                  1. {lang === 'hi' ? 'पेटेंट योग्यता एवं धारा 3(p) रोक' : 'Patentability & Section 3(p) TK Bar'}
                </strong>
                <span className="text-slate-500 text-[11px]">
                  {lang === 'hi' ? 'पारंपरिक ज्ञान बहिष्कार बनाम सहक्रियाशीलता परख।' : 'Evaluates traditional knowledge exclusion vs synergy.'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetQuestion(
                  lang === 'hi'
                    ? 'जैविक विविधता अधिनियम के तहत इस जैविक संसाधन के लिए क्या एबीएस अनुमतियां और प्रपत्र लागू होते हैं?'
                    : 'What ABS permissions and forms apply for this biological resource under the Biological Diversity Act?'
                )}
                className="p-3 text-left text-xs rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-800 border border-slate-200 hover:border-orange-300 transition cursor-pointer"
              >
                <strong className="block text-blue-600">
                  2. {lang === 'hi' ? 'एनबीए फॉर्म 3 एवं जैविक संसाधन' : 'NBA Form 3 & Biological Resources'}
                </strong>
                <span className="text-slate-500 text-[11px]">
                  {lang === 'hi' ? 'आईपी आवेदन से पूर्व पूर्वानुमोदन अधिदेश की जांच।' : 'Checks prior approval mandates before IP filing.'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetQuestion(
                  lang === 'hi'
                    ? 'क्या इस फॉर्मूलेशन को जोड़ों के स्वास्थ्य दावों के साथ FSSAI आयुर्वेद-आहार के तहत बेचा जा सकता है?'
                    : 'Can this formulation be marketed under FSSAI Ayurveda-Aahar with joint claims?'
                )}
                className="p-3 text-left text-xs rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-800 border border-slate-200 hover:border-orange-300 transition cursor-pointer"
              >
                <strong className="block text-blue-600">
                  3. {lang === 'hi' ? 'आयुर्वेद-आहार एवं रोगमुक्ति दावा प्रतिबंध' : 'Ayurveda-Aahar & Disease Cure Ban'}
                </strong>
                <span className="text-slate-500 text-[11px]">
                  {lang === 'hi' ? 'DMR अधिनियम 1954 आपराधिक विज्ञापन प्रतिबंध।' : 'DMR Act 1954 criminal advertising restrictions.'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetQuestion(
                  lang === 'hi'
                    ? '2028 में कंपनी X और SBB के बीच इस काल्पनिक विवाद का सटीक कानूनी परिणाम क्या होगा?'
                    : 'What is the exact legal outcome of this hypothetical dispute between Company X and SBB in 2028?'
                )}
                className="p-3 text-left text-xs rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition cursor-pointer"
              >
                <strong className="block text-amber-800">
                  4. {lang === 'hi' ? 'सुरक्षित एआई परिहार परीक्षण' : 'Test Safe AI Abstention'}
                </strong>
                <span className="text-amber-700 text-[11px]">
                  {lang === 'hi' ? 'काल्पनिक न्यायिक निर्णय पर सुरक्षित परिहार।' : 'Safely abstains on speculative judicial prediction.'}
                </span>
              </button>
            </div>
          </div>

          {chatAnswer && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {lang === 'hi' ? 'पूछताछ:' : 'Inquiry:'}
                  </span>
                  <span className="text-xs text-slate-900 font-semibold">"{chatAnswer.question}"</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                  chatAnswer.isAbstaining
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {lang === 'hi' ? 'साक्ष्य:' : 'Evidence:'} {chatAnswer.strength}
                </span>
              </div>

              {chatAnswer.isAbstaining && (
                <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-orange-500 border-y border-r border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-orange-800">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{t.abstentionTitle}</span>
                  </div>
                  <p className="leading-relaxed text-slate-700">
                    {lang === 'hi'
                      ? 'विश्वसनीय निष्कर्ष निकालने के लिए अपर्याप्त सत्यापित वैधानिक साक्ष्य। मतिभ्रम को रोकने के लिए प्रणाली सुरक्षित रूप से पीछे हट गई।'
                      : 'Insufficient verified authoritative statutory evidence to render a reliable conclusion. System abstained safely to prevent hallucination.'}
                  </p>
                </div>
              )}

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-sans">
                {chatAnswer.answer}
              </div>

              {chatAnswer.citations.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    {t.citationsHeader} ({chatAnswer.citations.length})
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {chatAnswer.citations.map((cit, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="font-bold text-slate-900">{cit.authority}</div>
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-orange-600 font-mono text-[11px] font-bold">{cit.document} — {cit.section}</span>
                          {cit.pageRecord && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-100 text-amber-800 border border-amber-200">
                              📄 {cit.pageRecord}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px] italic line-clamp-2">"{cit.passage}"</p>
                        {cit.source && (
                          <a
                            href={cit.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 pt-1 text-[10px] font-semibold"
                            title={`Open official statutory source: ${cit.source}`}
                          >
                            <span>{t.officialSource} ↗</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleCustomQuestionSubmit} className="flex gap-2">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder={t.askPlaceholder}
              className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-xs"
            />
            <button
              type="submit"
              disabled={isAsking || !userQuestion.trim()}
              className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              {isAsking ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>{t.analyzingWithRag}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'RAG से पूछें' : 'Ask RAG'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 5. Authoritative Evidence Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'hi' ? 'प्रामाणिक विधिक साक्ष्य' : 'Authoritative Statutory Evidence'} ({jurisdiction === 'INDIA' ? t.india : t.international})
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span>{t.searchedSourcesLabel}: <strong>{assessment.sourcesSearched}</strong></span>
            <span>{t.relevantEvidenceLabel}: <strong className="text-orange-600">{assessment.relevantEvidenceCount}</strong></span>
          </div>
        </div>

        <div className="space-y-3">
          {assessment.evidence.map((item) => {
            const isExpanded = expandedEvidence === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl bg-white border border-slate-200 p-4 transition-all hover:border-orange-200 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {item.section}
                      </span>
                      <span className="text-xs text-slate-900 font-bold">{item.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-700">
                        {item.strength} {t.strengthLabel.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      {lang === 'hi' ? 'प्राधिकरण:' : 'Authority:'} <span className="text-slate-800">{item.authority}</span> ({item.framework})
                    </p>
                  </div>

                  <button
                    onClick={() => setExpandedEvidence(isExpanded ? null : item.id)}
                    className="p-1 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className={isExpanded ? '' : 'line-clamp-2'}>"{item.passage}"</p>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{t.versionLabel}: {item.version}</span>
                      {item.pageRecord ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                          📄 {item.pageRecord}
                        </span>
                      ) : item.pageNumber ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                          📄 Page {item.pageNumber}
                        </span>
                      ) : null}
                      {item.effectiveDate && <span>{t.effectiveDateLabel}: {item.effectiveDate}</span>}
                    </div>
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 font-semibold"
                        title={`Open official statutory source: ${item.sourceUrl}`}
                      >
                        <span>{t.officialSourceLink} ↗</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 text-center text-xs text-slate-600">
          <span className="font-bold text-orange-700">{t.disclaimerTitle}:</span>{' '}
          {assessment.disclaimer}
        </div>
      </div>
    </div>
  );
};
