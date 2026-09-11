import React from 'react';
import { X, Download, Printer, Shield, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { Product, AssessmentResult, Jurisdiction } from '../types';
import { Language, TRANSLATIONS } from '../lib/translations';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  assessment: AssessmentResult;
  jurisdiction: Jurisdiction;
  lang?: Language;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  product,
  assessment,
  jurisdiction,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];
  if (!isOpen) return null;

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Top Header Banner
    doc.setFillColor(234, 88, 12); // Orange
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('AYUSHIP NAVIGATOR — STATUTORY ASSESSMENT DOSSIER', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Ministry of Ayush | Smart India Hackathon SIH26045 | Decision-Support System', 14, 18);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Active Jurisdiction: ${jurisdiction}`, 14, 23);

    // Product Title & Classification
    let y = 38;
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Product: ${product.name}`, 14, y);

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Classification: ${product.classification.replace(/_/g, ' ')} | Form: ${product.dosageForm} | Applicant: ${product.applicantType}`, 14, y);

    y += 5;
    doc.text(`Source of Resource: ${product.resourceSource} | State SBB: ${product.stateJurisdiction}`, 14, y);

    // Section 1: Botanical Composition
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('1. Botanical Formulation & Ingredients', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    product.ingredients.forEach((ing) => {
      doc.text(`• ${ing.sanskritName} (${ing.botanicalName}) - Part: ${ing.plantPart || 'N/A'}, Ratio: ${ing.ratio || '1:1'}`, 18, y);
      y += 5;
    });

    // Section 2: Patent & Novelty
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('2. Intellectual Property & Patent Status', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Feasibility: ${assessment.patentRoute.status}`, 18, y);
    y += 5;
    doc.text(`Novelty: ${assessment.patentRoute.novelty}`, 18, y);
    y += 5;
    doc.text(`Inventive Step: ${assessment.patentRoute.inventiveStep}`, 18, y);
    y += 5;
    doc.text(`Traditional Knowledge Bar (Section 3(p)): ${assessment.patentRoute.traditionalKnowledgeFlag ? 'FLAGGED (Prior Art in TKDL)' : 'CLEARED'}`, 18, y);
    y += 5;
    doc.text(`Section 3(e) Synergism: ${assessment.patentRoute.synergisticProofRequired ? 'Required (Synergistic bioassay proof mandated)' : 'Not applicable'}`, 18, y);

    // Section 3: Regulatory & Rule 158-B
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. Regulatory & AYUSH Licensing Route', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Licensing Pathway: ${assessment.regulatoryPathway.licensingPathway}`, 18, y);
    y += 5;
    doc.text(`Applicable Framework: ${assessment.regulatoryPathway.framework}`, 18, y);

    // Section 4: ABS Compliance
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('4. Biological Diversity & ABS Duty', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Status: ${assessment.absRoute.absStatus}`, 18, y);
    y += 5;
    doc.text(`Competent Authority: ${assessment.absRoute.authority}`, 18, y);
    y += 5;
    doc.text(`Forms Required: ${assessment.absRoute.formsRequired.join(', ') || 'None'}`, 18, y);

    // Section 5: Trademark
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('5. Trademark & Brand Protection', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Recommended Classes: ${assessment.trademarkRoute.classes.join(', ')}`, 18, y);

    const checkPageBreak = (extraSpace = 0) => {
      if (y + extraSpace > 260) {
        doc.addPage();
        y = 20;
      }
    };

    // Section 6: Citations
    if (assessment.citations && assessment.citations.length > 0) {
      y += 8;
      checkPageBreak();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('6. Authoritative Legal Citations', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      assessment.citations.forEach((c) => {
        checkPageBreak(25);
        doc.text(`[Evidence ID: ${c.id}]`, 18, y);
        y += 4;
        doc.text(`[${c.authority}] ${c.document} — ${c.section}`, 18, y);
        y += 4;
        doc.text(`Page Record: ${c.pageRecord || 'N/A'}`, 18, y);
        y += 4;
        doc.text(`Source: ${c.source}`, 18, y);
        y += 4;
        
        const passageLines = doc.splitTextToSize(`"${c.passage}"`, 170);
        doc.text(passageLines, 18, y);
        y += (passageLines.length * 4) + 4;
      });
    }

    // Section 7: Evidence Strength & Uncertainty
    y += 8;
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('7. Evidence Strength & Uncertainty', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Evidence Level: ${assessment.evidenceLevel}`, 18, y);
    y += 5;
    doc.text(`Confidence: ${assessment.confidence}`, 18, y);
    y += 5;
    if (assessment.safeAbstention) {
      const abstentionLines = doc.splitTextToSize(`Safe Abstention: ${assessment.abstentionReason}`, 170);
      doc.text(abstentionLines, 18, y);
      y += (abstentionLines.length * 5);
    }
    doc.text(`Sources Searched: ${assessment.sourcesSearched?.join(', ') || 'N/A'}`, 18, y);
    y += 5;
    doc.text(`Relevant Evidence Count: ${assessment.relevantEvidenceCount}`, 18, y);
    y += 5;

    // Section 8: Recommended Next Steps
    if (assessment.recommendedNextSteps && assessment.recommendedNextSteps.length > 0) {
      y += 8;
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('8. Recommended Next Steps', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      assessment.recommendedNextSteps.forEach((step: any) => {
        checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.text(`[Priority: ${step.priority}] ${step.stage} - ${step.title}`, 18, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(step.description, 170);
        doc.text(descLines, 18, y);
        y += (descLines.length * 5) + 2;
      });
    }

    // Disclaimer
    y += 8;
    checkPageBreak(40);
    doc.setFillColor(254, 243, 199);
    doc.rect(14, y, 182, 32, 'F');
    doc.setTextColor(146, 64, 14);
    doc.setFontSize(8);
    doc.text('MANDATORY NOTICE: Information and decision-support only under SIH26045.', 18, y + 6);
    doc.text('This evaluation does not constitute accredited legal advice or a guarantee of patent grant or regulatory license.', 18, y + 11);
    doc.text('Evidence retrieval method: RAG (Retrieval-Augmented Generation)', 18, y + 16);
    doc.text('This report was generated by an AI decision-support system.', 18, y + 21);
    doc.text('All conclusions require verification by qualified professionals.', 18, y + 26);

    doc.save(`AyushIP-Report-${product.name.replace(/\s+/g, '_')}-${jurisdiction}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 border-t-4 border-t-orange-500 rounded-2xl w-full max-w-4xl text-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0e6259] text-white flex items-center justify-center font-bold text-xl shadow-xs select-none">
              ॐ
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Official Statutory Assessment Dossier
              </h3>
              <p className="text-xs text-slate-500">
                Printable Evaluation Report • Ministry of Ayush Protocol
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

        {/* Printable View Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#f8fafc] text-xs text-slate-700">
          {/* Official Letterhead */}
          <div className="border-b border-slate-200 pb-4 text-center space-y-1 bg-white p-4 rounded-xl border">
            <span className="text-[10px] font-mono text-orange-700 font-bold uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              MINISTRY OF AYUSH | GOVERNMENT OF INDIA | SIH26045
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 pt-2 tracking-tight">
              AYUSHIP NAVIGATOR STATUTORY EVALUATION REPORT
            </h2>
            <p className="text-slate-500 text-[11px]">
              Decision-Support Analysis for Intellectual Property & Regulatory Clearance in Ayurveda
            </p>
          </div>

          {/* Core Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Formulation</span>
              <span className="font-bold text-sm text-slate-900">{product.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Jurisdiction</span>
              <span className="font-bold text-sm text-orange-600">{jurisdiction}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Classification</span>
              <span className="font-semibold text-blue-700">{product.classification.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Entity & Source</span>
              <span className="font-semibold text-slate-700">{product.applicantType} ({product.resourceSource})</span>
            </div>
          </div>

          {/* Detailed Summary Sections */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <h4 className="font-bold text-blue-700 uppercase tracking-wider text-[11px]">
                1. Intellectual Property Routing
              </h4>
              <p className="text-slate-700 leading-relaxed">
                <strong>Patent Feasibility:</strong> {assessment.patentRoute.status}. Subject to Section 3(p) Traditional Knowledge review and Section 3(e) synergistic demonstration. Form 3 NBA approval is mandatory before patent grant under Section 6 of Biological Diversity Act.
              </p>
              <p className="text-slate-700 leading-relaxed">
                <strong>Trademark Classes:</strong> {assessment.trademarkRoute.classes.join(', ')}. {assessment.trademarkRoute.guidance}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <h4 className="font-bold text-emerald-700 uppercase tracking-wider text-[11px]">
                2. Regulatory & Rule 158-B Licensing
              </h4>
              <p className="text-slate-700 leading-relaxed">
                <strong>Licensing Pathway:</strong> {assessment.regulatoryPathway.licensingPathway} under {assessment.regulatoryPathway.framework}.
              </p>
              <p className="text-slate-700 leading-relaxed">
                <strong>Safety & Testing:</strong> Acute oral toxicity study (OECD 423) and heavy metals testing (Lead, Cadmium, Mercury, Arsenic within AYUSH limits).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <h4 className="font-bold text-orange-700 uppercase tracking-wider text-[11px]">
                3. Access & Benefit Sharing (ABS) Duty
              </h4>
              <p className="text-slate-700 leading-relaxed">
                <strong>Status:</strong> {assessment.absRoute.absStatus} with {assessment.absRoute.authority}. Required filings: {assessment.absRoute.formsRequired.join(', ') || 'None'}.
              </p>
            </div>

            {assessment.humanReviewFlags && assessment.humanReviewFlags.length > 0 && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <h4 className="font-bold text-red-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  Statutory & Regulatory Human Review Flags ({assessment.humanReviewFlags.length})
                </h4>
                <ul className="space-y-1.5">
                  {assessment.humanReviewFlags.map((flag, idx) => (
                    <li key={idx} className="text-red-700 text-xs flex items-start gap-1.5">
                      <span className="text-red-500 font-bold">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Legal Disclaimer Box */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-center text-xs">
            <span className="font-bold">MANDATORY NOTICE:</span> {assessment.disclaimer}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            {t.close}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printView}</span>
            </button>
            <button
              onClick={generatePDF}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t.downloadPdf}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
