import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AssessmentCockpit } from './components/AssessmentCockpit';
import { ProductIntakeModal } from './components/ProductIntakeModal';
import { ReportModal } from './components/ReportModal';
import { AuditLogsModal } from './components/AuditLogsModal';
import { KnowledgeCorpusModal } from './components/KnowledgeCorpusModal';
import { AuthModal } from './components/AuthModal';
import { Product, AssessmentResult, Jurisdiction, User } from './types';
import { Language, TRANSLATIONS } from './lib/translations';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('INDIA');
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ayuship_user') || sessionStorage.getItem('ayuship_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    try {
      const saved = sessionStorage.getItem('ayuship_selectedProduct');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentResult | null>(() => {
    try {
      const saved = sessionStorage.getItem('ayuship_currentAssessment');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [activeView, setActiveView] = useState<'dashboard' | 'cockpit'>(() => {
    try {
      return (sessionStorage.getItem('ayuship_activeView') as any) || 'dashboard';
    } catch { return 'dashboard'; }
  });

  const setViewSafe = (view: 'dashboard' | 'cockpit') => {
    setActiveView(view);
    try { sessionStorage.setItem('ayuship_activeView', view); } catch {}
  };

  // Modals state
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);
  const [isKnowledgeBaseModalOpen, setIsKnowledgeBaseModalOpen] = useState(false);

  // Validate session token on mount
  useEffect(() => {
    const token = localStorage.getItem('ayuship_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('ayuship_user', JSON.stringify(data.user));
          }
        })
        .catch(err => console.warn('Session verification error:', err));
    }
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthInitialMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('ayuship_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {}
    }
    localStorage.removeItem('ayuship_token');
    localStorage.removeItem('ayuship_user');
    setCurrentUser(null);
  };

  // Fetch all products on mount
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error('Failed to fetch products:', e);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch assessment whenever selected product or jurisdiction changes
  const fetchAssessment = async (productId: string, j: Jurisdiction) => {
    try {
      const res = await fetch(`/api/assessment/product/${productId}?jurisdiction=${j}`);
      if (res.ok) {
        const data: AssessmentResult = await res.json();
        setCurrentAssessment(data);
        try { sessionStorage.setItem('ayuship_currentAssessment', JSON.stringify(data)); } catch {}
      }
    } catch (e) {
      console.error('Failed to fetch assessment:', e);
    }
  };

  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product);
    try { sessionStorage.setItem('ayuship_selectedProduct', JSON.stringify(product)); } catch {}
    await fetchAssessment(product.id, jurisdiction);
    setViewSafe('cockpit');
  };

  const handleJurisdictionChange = async (newJurisdiction: Jurisdiction) => {
    setJurisdiction(newJurisdiction);
    if (selectedProduct) {
      await fetchAssessment(selectedProduct.id, newJurisdiction);
    }
  };

  const handleSaveProduct = async (productPayload: Partial<Product>): Promise<Product> => {
    // Attach current user identity to product creator details if available
    const payloadWithUser: Partial<Product> = {
      ...productPayload,
      createdBy: currentUser?.email || productPayload.createdBy,
      applicantName: currentUser?.name || productPayload.applicantName,
      organization: currentUser?.organization || productPayload.organization || 'Independent Enterprise'
    };

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('ayuship_token') ? { Authorization: `Bearer ${localStorage.getItem('ayuship_token')}` } : {})
      },
      body: JSON.stringify(payloadWithUser)
    });
    if (!res.ok) {
      throw new Error('Failed to save product');
    }
    const saved: Product = await res.json();
    await fetchProducts();
    return saved;
  };

  const handleClassifyAndOpen = async (product: Product) => {
    setSelectedProduct(product);
    try { sessionStorage.setItem('ayuship_selectedProduct', JSON.stringify(product)); } catch {}
    await fetchAssessment(product.id, jurisdiction);
    setViewSafe('cockpit');
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchProducts();
        if (selectedProduct?.id === id) {
          setSelectedProduct(null);
          setCurrentAssessment(null);
          try {
            sessionStorage.removeItem('ayuship_selectedProduct');
            sessionStorage.removeItem('ayuship_currentAssessment');
          } catch {}
          setViewSafe('dashboard');
        }
      }
    } catch (e) {
      console.error('Failed to delete product:', e);
    }
  };

  const handleAskAi = async (userQuestion: string) => {
    const res = await fetch('/api/rag/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuestion,
        productId: selectedProduct?.id,
        jurisdiction
      })
    });
    if (!res.ok) {
      throw new Error('RAG request failed');
    }
    return await res.json();
  };

  // Demo Runner (Supports all 10 standard SIH statutory demo scenarios)
  const handleRunDemo = async (scenarioId: string) => {
    try {
      const res = await fetch('/api/demo/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.product) {
          setSelectedProduct(data.product);
          try { sessionStorage.setItem('ayuship_selectedProduct', JSON.stringify(data.product)); } catch {}
          if (data.jurisdiction) {
            setJurisdiction(data.jurisdiction);
          }
          if (data.assessment) {
            setCurrentAssessment(data.assessment);
            try { sessionStorage.setItem('ayuship_currentAssessment', JSON.stringify(data.assessment)); } catch {}
          } else {
            await fetchAssessment(data.product.id, data.jurisdiction || jurisdiction);
          }
          setViewSafe('cockpit');
          return;
        }
      }
    } catch (e) {
      console.warn('Demo runner API error, using local fallback:', e);
    }

    // Client-side fallback matching
    const idMap: Record<string, { pid: string; juris?: Jurisdiction }> = {
      'demo-joint-health': { pid: 'prod-ashwa-joint-001', juris: 'INDIA' },
      'demo-patent-question': { pid: 'prod-classical-yogaraja-002', juris: 'INDIA' },
      'demo-aahar': { pid: 'prod-ojas-aahar-003', juris: 'INDIA' },
      'demo-ojas': { pid: 'prod-ojas-aahar-003', juris: 'INDIA' },
      'demo-extract': { pid: 'prod-phyto-withan-004', juris: 'INDIA' },
      'demo-phyto': { pid: 'prod-phyto-withan-004', juris: 'INDIA' },
      'demo-safe-abstention': { pid: 'prod-synthetic-nootropic-005', juris: 'INDIA' },
      'demo-synthetic': { pid: 'prod-synthetic-nootropic-005', juris: 'INDIA' },
      'demo-triphala': { pid: 'prod-triphala-churna-006', juris: 'INDIA' },
      'demo-neem-process': { pid: 'prod-neem-extract-007', juris: 'INDIA' },
      'demo-guduchi-cultivated': { pid: 'prod-guduchi-cultivated-008', juris: 'INDIA' },
      'demo-brahmi-dmr': { pid: 'prod-brahmi-drink-009', juris: 'INDIA' },
      'demo-export-us': { pid: 'prod-ashwa-joint-001', juris: 'INTERNATIONAL' },
      'demo-export-eu': { pid: 'prod-ashwa-eu-export-010', juris: 'INTERNATIONAL' }
    };

    const target = idMap[scenarioId];
    if (target) {
      let prod = products.find(p => p.id === target.pid) || products[0];
      if (prod) {
        setSelectedProduct(prod);
        try { sessionStorage.setItem('ayuship_selectedProduct', JSON.stringify(prod)); } catch {}
        const targetJuris = target.juris || jurisdiction;
        setJurisdiction(targetJuris);
        await fetchAssessment(prod.id, targetJuris);
        setViewSafe('cockpit');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Global Clean White Header with AyushIP Navigator Branding & Auth */}
      <Header
        jurisdiction={jurisdiction}
        onJurisdictionChange={handleJurisdictionChange}
        lang={lang}
        onLangChange={setLang}
        onOpenAuditLogs={() => setIsAuditLogsModalOpen(true)}
        onOpenKnowledgeBase={() => setIsKnowledgeBaseModalOpen(true)}
        onRunDemo={handleRunDemo}
        activeView={activeView}
        onNavigateHome={() => setViewSafe('dashboard')}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeView === 'dashboard' ? (
          <Dashboard
            products={products}
            jurisdiction={jurisdiction}
            onSelectProduct={handleSelectProduct}
            onOpenNewProductModal={() => setIsNewProductModalOpen(true)}
            onDeleteProduct={handleDeleteProduct}
            onRunDemo={handleRunDemo}
            lang={lang}
          />
        ) : (
          selectedProduct && currentAssessment && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs w-fit">
                <button
                  onClick={() => setViewSafe('dashboard')}
                  className="hover:text-orange-600 font-semibold transition flex items-center gap-1 cursor-pointer text-slate-700"
                >
                  <span>←</span>
                  <span>{t.dashboard}</span>
                </button>
                <span className="text-slate-300">/</span>
                <span className="text-orange-600 font-bold">{selectedProduct.name}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {jurisdiction === 'INDIA' ? t.india : t.international} {lang === 'hi' ? 'मूल्यांकन' : 'ASSESSMENT'}
                </span>
              </div>

              <AssessmentCockpit
                product={selectedProduct}
                assessment={currentAssessment}
                jurisdiction={jurisdiction}
                onJurisdictionChange={handleJurisdictionChange}
                onAskAi={handleAskAi}
                onDownloadReport={() => setIsReportModalOpen(true)}
                lang={lang}
              />
            </div>
          )
        )}
      </main>

      {/* Clean White Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 mt-auto shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-orange-600 uppercase tracking-wider font-bold text-[10px] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
              {t.decisionSupportNotice}
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-slate-500 text-[11px]">
              {t.footerDisclaimer}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-600 font-semibold">SIH 2026</span>
            <span className="text-slate-300">•</span>
            <span className="text-orange-600 font-bold">{t.ministry}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        lang={lang}
        initialMode={authInitialMode}
      />

      <ProductIntakeModal
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        onSaveProduct={handleSaveProduct}
        onClassifyAndOpen={handleClassifyAndOpen}
        lang={lang}
      />

      {selectedProduct && currentAssessment && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          product={selectedProduct}
          assessment={currentAssessment}
          jurisdiction={jurisdiction}
          lang={lang}
        />
      )}

      <AuditLogsModal
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
        lang={lang}
      />

      <KnowledgeCorpusModal
        isOpen={isKnowledgeBaseModalOpen}
        onClose={() => setIsKnowledgeBaseModalOpen(false)}
        activeJurisdiction={jurisdiction}
        lang={lang}
      />
    </div>
  );
}
