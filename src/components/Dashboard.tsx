import React from 'react';
import { Plus, ArrowRight, Trash2 } from 'lucide-react';
import { Product, Jurisdiction } from '../types';
import { Language, TRANSLATIONS } from '../lib/translations';

interface DashboardProps {
  products: Product[];
  jurisdiction: Jurisdiction;
  onSelectProduct: (product: Product) => void;
  onOpenNewProductModal: () => void;
  onDeleteProduct: (id: string) => void;
  onRunDemo: (scenarioId: string) => void;
  lang: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  jurisdiction,
  onSelectProduct,
  onOpenNewProductModal,
  onDeleteProduct,
  onRunDemo,
  lang
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="space-y-10 py-2">
      {/* HERO BANNER: Deep Teal Accent (#0e6259) matching reference design */}
      <section className="space-y-4">
        <div className="bg-[#0e6259] text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-3xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200/90 font-mono">
                SIH26045 • {lang === 'hi' ? 'आयुष मंत्रालय' : 'MINISTRY OF AYUSH'}
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {lang === 'hi'
                  ? 'आयुर्वेद उत्पाद से साक्ष्य-आधारित मूल्यांकन तक'
                  : 'From Ayurveda product to cited assessment'}
              </h1>
              <p className="text-teal-50/90 text-xs sm:text-sm leading-relaxed max-w-2xl font-normal">
                {lang === 'hi'
                  ? 'उत्पाद समझ, अनुकूली प्रश्न, वर्गीकरण, अधिकार-क्षेत्र सजग पुनर्प्राप्ति, साक्ष्य सत्यापन और सुरक्षित अनुशंसाएं।'
                  : 'Product understanding, adaptive questions, classification, jurisdiction-aware retrieval, evidence validation and safe recommendations.'}
              </p>
            </div>
            <div className="shrink-0">
              <button
                onClick={onOpenNewProductModal}
                className="bg-white hover:bg-slate-100 text-[#0e6259] font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#0e6259]" />
                <span>{lang === 'hi' ? 'नया उत्पाद' : 'New Product'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: Popular Categories (EXACT DUPLICATE OF SCREENSHOT) */}
      <section className="space-y-6">
        {/* Centered Heading with short orange underline accent */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.popularCategories}
          </h2>
          <div className="w-14 h-1 bg-orange-500 mx-auto rounded-full"></div>
        </div>

        {/* 5 Cards Row matching screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1 */}
          <div
            onClick={() => onRunDemo('demo-joint-health')}
            className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <h3 className="text-blue-600 font-bold text-sm sm:text-base leading-snug">
                {t.catPatentTitle}
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                {t.catPatentDesc}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-orange-600 mt-4 flex items-center gap-1">
              {t.launchDemo}
            </span>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => onRunDemo('demo-patent-question')}
            className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <h3 className="text-blue-600 font-bold text-sm sm:text-base leading-snug">
                {t.catClassicalTitle}
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                {t.catClassicalDesc}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-orange-600 mt-4 flex items-center gap-1">
              {t.launchDemo}
            </span>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => onRunDemo('demo-aahar')}
            className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <h3 className="text-blue-600 font-bold text-sm sm:text-base leading-snug">
                {t.catAaharTitle}
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                {t.catAaharDesc}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-orange-600 mt-4 flex items-center gap-1">
              {t.launchDemo}
            </span>
          </div>

          {/* Card 4 */}
          <div
            onClick={() => onRunDemo('demo-export-us')}
            className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <h3 className="text-blue-600 font-bold text-sm sm:text-base leading-snug">
                {t.catExportTitle}
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                {t.catExportDesc}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-orange-600 mt-4 flex items-center gap-1">
              {t.launchDemo}
            </span>
          </div>

          {/* Card 5 */}
          <div
            onClick={() => onRunDemo('demo-safe-abstention')}
            className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <h3 className="text-blue-600 font-bold text-sm sm:text-base leading-snug">
                {t.catSafeAbstentionTitle}
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                {t.catSafeAbstentionDesc}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-orange-600 mt-4 flex items-center gap-1">
              {t.testGuardrail}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 2: Latest Resources / Registered Formulations (EXACT DUPLICATE OF SCREENSHOT) */}
      <section className="space-y-6">
        {/* Centered Heading with short orange underline accent */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center relative">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.latestResources}
            </h2>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <button
                onClick={onOpenNewProductModal}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.newProductBtn}</span>
              </button>
            </div>
          </div>
          <div className="w-14 h-1 bg-orange-500 mx-auto rounded-full"></div>
        </div>

        {/* Product Cards Container (Centered for 1 example product) */}
        {products.length > 0 ? (
          <div className={products.length === 1 ? "max-w-xl mx-auto w-full" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"}>
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-100 border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        {p.dosageForm}
                      </span>
                      {products.length === 1 && (
                        <span className="text-[10px] font-bold text-[#0e6259] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          {lang === 'hi' ? 'उदाहरण उत्पाद' : 'Example Product'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title={t.deleteProduct}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-blue-600 font-bold text-sm sm:text-base leading-snug group-hover:text-blue-700 transition-colors">
                    {p.name}
                  </h3>

                  <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">
                    {p.description}
                  </p>

                  {/* Botanical Ingredients Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {p.ingredients.map((ing, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-50 text-slate-600 border border-slate-200"
                      >
                        🌿 {ing.sanskritName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    {p.classification === 'CLASSICAL_GENERIC' ? t.classicalBadge : t.proprietaryBadge}
                  </span>
                  <button
                    onClick={() => onSelectProduct(p)}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{t.viewCockpitAction}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-3 max-w-md mx-auto">
            <p className="text-slate-500 text-xs">
              {lang === 'hi' ? 'कोई उत्पाद पंजीकृत नहीं है।' : 'No products currently registered.'}
            </p>
            <button
              onClick={onOpenNewProductModal}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newProductBtn}</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
