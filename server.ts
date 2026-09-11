import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import { ragEngine } from './server/ragEngine.js';
import { generateGroundedAnswer } from './server/gemini.js';
import { AUTHORITATIVE_CORPUS } from './server/corpus.js';
import { BOTANICAL_DATABASE, CLASSICAL_YOGAS } from './server/botanicalData.js';
import { Jurisdiction, Product, ProductClassification } from './src/types.js';
import { knowledgeStore } from './server/knowledge.js';
import { semanticIndex } from './server/semanticIndex.js';
import { authMiddleware, roleGuard, hashPassword, verifyPassword, generateToken, verifyToken } from './server/auth.js';
import { validateUrl, validateProductInput, validateSearchInput, isOfficialDomain, validateFileUpload } from './server/validation.js';
import { generateRequestId, successResponse, errorResponse, validationErrorResponse } from './server/apiHelper.js';
import { classifyIntent } from './server/intentClassifier.js';
import { routeJurisdiction } from './server/jurisdictionRouter.js';
import { getNextQuestion, applyAnswersToProduct } from './server/adaptiveQuestions.js';
import { resolveBotanical } from './server/botanicalResolver.js';
import { matchClassicalFormulation } from './server/classicalMatcher.js';
import { evaluateAllIPRoutes } from './server/ipRoutes/index.js';
import { searchTKPriorArt } from './server/tkPriorArt.js';
import { evaluateABS } from './server/absModule.js';
import { routeRegulatory } from './server/regulatoryRouter.js';
import { evaluateInternational } from './server/internationalModule.js';
import { validateAllCitations, getVerifiedEvidence } from './server/evidenceValidator.js';
import { detectConflicts } from './server/conflictDetector.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// ================= API ROUTES =================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'AyushIP Navigator',
    version: '1.0.0-SIH26045',
    ministry: 'Ministry of Ayush',
    corpusSize: AUTHORITATIVE_CORPUS.length + knowledgeStore.all().length,
    builtInCorpusSize: AUTHORITATIVE_CORPUS.length,
    ingestedCorpusSize: knowledgeStore.all().length,
    llmConfigured: Boolean(process.env.GEMINI_API_KEY),
    persistence: 'JSON store (prototype; set DATA_DIR for mounted persistent storage)',
    botanicalCount: BOTANICAL_DATABASE.length,
    semanticIndex: { configured: semanticIndex.isConfigured(), indexed: semanticIndex.size(), model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004' },
    modules: {
      ipRoutes: true,
      intentClassifier: true,
      adaptiveQuestions: true,
      botanicalResolver: true,
      classicalMatcher: true
    }
  });
});

// Helper to sanitize user object for API responses
function sanitizeUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    organization: u.organization || 'Independent Innovator',
    state: u.state || 'National',
    dpdpConsent: Boolean(u.dpdpConsent),
    bdaComplianceAck: Boolean(u.bdaComplianceAck),
    legalConsentDate: u.legalConsentDate || u.registeredAt || new Date().toISOString(),
    registeredAt: u.registeredAt,
    lastLoginAt: u.lastLoginAt
  };
}

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, organization, state, dpdpConsent, bdaComplianceAck } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json(errorResponse('Full name is required for statutory account registration.'));
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json(errorResponse('A valid email address is required.'));
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json(errorResponse('Password must be at least 6 characters in length.'));
    }
    if (!dpdpConsent) {
      return res.status(400).json(errorResponse('DPDP Act 2023 consent is legally mandated to register and process user profile data.'));
    }
    if (!bdaComplianceAck) {
      return res.status(400).json(errorResponse('Statutory undertaking acknowledging Biological Diversity Act 2002/2023 compliance is required.'));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const allUsers = db.getAllUsers ? db.getAllUsers() : [];
    if (allUsers.some((u: any) => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(409).json(errorResponse('An account with this email address already exists. Please login with your registered credentials.'));
    }

    const passwordHash = await hashPassword(password);
    const nowIso = new Date().toISOString();
    const newUser = {
      id: 'usr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role || 'STARTUP_MSME',
      organization: (organization || 'Independent Innovator').trim(),
      state: (state || 'Kerala').trim(),
      dpdpConsent: true,
      bdaComplianceAck: true,
      legalConsentDate: nowIso,
      registeredAt: nowIso,
      lastLoginAt: nowIso
    };

    db.saveUser(newUser as any);

    db.addAuditLog({
      action: 'USER_REGISTERED',
      jurisdiction: 'INDIA',
      details: `New innovator account registered: ${newUser.name} (${newUser.email}) | Role: ${newUser.role} | Org: ${newUser.organization} | State: ${newUser.state} | Consents: DPDP 2023 & BDA 2002/2023 Verified`,
      userEmail: newUser.email
    });

    const token = generateToken(newUser as any);
    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      message: 'Account registered successfully with verified legal consent.'
    });
  } catch (err: any) {
    console.error('[Auth] Registration error:', err);
    res.status(500).json(errorResponse('Failed to register user account: ' + (err.message || 'Unknown error')));
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json(errorResponse('Email and password are required.'));
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = db.getUserByEmail?.(normalizedEmail);
    if (!user) {
      const allUsers = db.getAllUsers ? db.getAllUsers() : [];
      user = allUsers.find((u: any) => u.email.toLowerCase() === normalizedEmail);
    }

    // Check pre-seeded demo users if not explicitly in DB
    if (!user && (normalizedEmail === 'demo@ayuship.in' || normalizedEmail === 'demo@ipsakti.local')) {
      if (password === 'demo123' || password === 'ayush2026' || password === 'demo') {
        const hash = await hashPassword('demo123');
        user = {
          id: 'usr-ayush-001',
          name: 'Demo Ayurveda Innovator',
          email: normalizedEmail,
          passwordHash: hash,
          role: 'STARTUP_MSME',
          organization: 'Ayush Innovation Labs',
          state: 'Kerala',
          dpdpConsent: true,
          bdaComplianceAck: true,
          legalConsentDate: new Date().toISOString(),
          registeredAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        } as any;
        db.saveUser(user as any);
      }
    }

    if (!user) {
      return res.status(401).json(errorResponse('Invalid email or password. If you are a new user, please register first.'));
    }

    // Verify password against stored PBKDF2 hash
    let passwordValid = false;
    if (user.passwordHash) {
      passwordValid = await verifyPassword(password, user.passwordHash);
    } else if (user.id === 'usr-ayush-001' && (password === 'demo123' || password === 'ayush2026' || password === 'demo')) {
      passwordValid = true;
      // Upgrade unhashed user
      user.passwordHash = await hashPassword(password);
      db.saveUser(user);
    }

    if (!passwordValid) {
      return res.status(401).json(errorResponse('Invalid email or password.'));
    }

    user.lastLoginAt = new Date().toISOString();
    db.saveUser(user);

    db.addAuditLog({
      action: 'USER_LOGIN',
      jurisdiction: 'INDIA',
      details: `User logged in: ${user.name} (${user.email}) | Role: ${user.role} | Org: ${user.organization || 'Independent'}`,
      userEmail: user.email
    });

    const token = generateToken(user as any);
    res.json({
      token,
      user: sanitizeUser(user),
      message: 'Login successful'
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json(errorResponse('Authentication failed: ' + (err.message || 'Unknown error')));
  }
});

// Current User Profile Verification
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('No active session token found'));
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json(errorResponse('Session token expired or invalid. Please log in again.'));
  }

  let user = db.getUser(decoded.userId);
  if (!user && decoded.email) {
    user = db.getUserByEmail(decoded.email);
  }

  if (!user) {
    return res.status(404).json(errorResponse('User profile not found.'));
  }

  res.json({ user: sanitizeUser(user) });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const decoded = verifyToken(authHeader.substring(7));
    if (decoded) {
      db.addAuditLog({
        action: 'USER_LOGOUT',
        jurisdiction: 'INDIA',
        details: `User logged out: ${decoded.email}`,
        userEmail: decoded.email
      });
    }
  }
  res.json({ success: true, message: 'Successfully logged out' });
});

// Products CRUD
app.get('/api/products', (req, res) => {
  const products = db.getAllProducts();
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.post('/api/products', (req, res) => {
  const data = req.body;
  const newProduct: Product = {
    id: data.id || 'prod-' + Math.random().toString(36).substring(2, 9),
    name: data.name || 'Untitled Ayurvedic Product',
    brandName: data.brandName || '',
    description: data.description || '',
    intendedUse: data.intendedUse || '',
    healthClaims: Array.isArray(data.healthClaims) ? data.healthClaims : [],
    dosageForm: data.dosageForm || 'CAPSULE',
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    applicantType: data.applicantType || 'INDIAN_MSME',
    resourceSource: data.resourceSource || 'CULTIVATED',
    stateJurisdiction: data.stateJurisdiction || 'Madhya Pradesh',
    hasForeignEquity: Boolean(data.hasForeignEquity),
    hasNovelProcess: Boolean(data.hasNovelProcess),
    isClassicalTextBased: Boolean(data.isClassicalTextBased),
    classicalTextReference: data.classicalTextReference || '',
    classification: data.classification || 'PATENT_PROPRIETARY',
    classificationRationale: data.classificationRationale || '',
    targetExportMarket: data.targetExportMarket || 'USA',
    status: data.status || 'CLASSIFIED',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const saved = db.saveProduct(newProduct);
  res.status(201).json(saved);
});

app.delete('/api/products/:id', (req, res) => {
  const success = db.deleteProduct(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ message: 'Product deleted successfully' });
});

// Classification & Adaptive Questions
app.post('/api/products/:id/classify', (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const result = ragEngine.classifyProduct(product);
  product.classification = result.classification;
  product.classificationRationale = result.rationale;
  db.saveProduct(product);
  
  const nextQuestion = getNextQuestion([], product);

  res.json({
    classificationResult: {
      classification: result.classification,
      reasons: [result.rationale],
      evidenceUsed: [],
      missingFacts: [],
      confidence: 0.85
    },
    suggestedQuestion: nextQuestion,
    // Keep old fields for backward compatibility
    classification: result.classification,
    rationale: result.rationale
  });
});

app.post('/api/products/:id/questions', (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { answers = [] } = req.body;
  if (answers.length > 0) {
      applyAnswersToProduct(answers, product);
      db.saveProduct(product);
  }

  const nextQuestion = getNextQuestion(answers, product);
  
  res.json({
    suggestedQuestion: nextQuestion,
    // Keep old fields for backward compatibility if needed
    questions: nextQuestion ? [nextQuestion] : [],
    classification: product.classification,
    rationale: product.classificationRationale
  });
});

// Assessment Evaluation
app.post('/api/assessment/evaluate', async (req, res) => {
  const { productId, jurisdiction = 'INDIA' } = req.body;
  const product = db.getProductById(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const assessment = await ragEngine.evaluateProduct(product, jurisdiction as Jurisdiction);
  db.saveAssessment(assessment);
  res.json(assessment);
});

app.get('/api/assessment/:id', (req, res) => {
  const assessment = db.getAssessment(req.params.id);
  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }
  res.json(assessment);
});

app.get('/api/assessment/product/:productId', async (req, res) => {
  const jurisdiction = (req.query.jurisdiction as string) || undefined;
  const assessment = db.getAssessmentByProductId(req.params.productId, jurisdiction);
  if (!assessment) {
    // Generate on-the-fly if not evaluated yet
    const product = db.getProductById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const newAssessment = await ragEngine.evaluateProduct(product, (jurisdiction as Jurisdiction) || 'INDIA');
    db.saveAssessment(newAssessment);
    return res.json(newAssessment);
  }
  res.json(assessment);
});

// RAG Search & Answer
app.post('/api/rag/search', async (req, res) => {
  const { query, jurisdiction = 'INDIA', tags } = req.body;
  const searchResult = await ragEngine.searchHybrid({
    query: query || '',
    jurisdiction: jurisdiction as Jurisdiction,
    tags
  });

  db.addAuditLog({
    action: 'RAG_SEARCH',
    jurisdiction: jurisdiction as Jurisdiction,
    details: `Search query: "${query}". Retrieved: ${searchResult.relevantCount} sources. Abstention: ${searchResult.isAbstentionTriggered}`,
    userEmail: process.env.DEMO_EMAIL || 'system@ipsakti.local'
  });

  res.json(searchResult);
});

app.post('/api/rag/answer', async (req, res) => {
  const {
    userQuestion,
    productId,
    jurisdiction = 'INDIA'
  } = req.body;

  const product = productId ? db.getProductById(productId) : undefined;
  const productName = product?.name || 'Ayurvedic Formulation';
  const productDescription = product?.description || '';
  const classification = product?.classification || 'PATENT_PROPRIETARY';

  // Perform search
  const searchResult = await ragEngine.searchHybrid({
    query: userQuestion + ' ' + productName,
    jurisdiction: jurisdiction as Jurisdiction
  });

  // Call grounded reasoning
  const answerResult = await generateGroundedAnswer({
    userQuestion,
    productName,
    productDescription,
    classification,
    jurisdiction: jurisdiction as Jurisdiction,
    evidence: searchResult.evidence,
    citations: searchResult.citations,
    isAbstentionTriggered: searchResult.isAbstentionTriggered,
    abstentionReason: searchResult.abstentionReason
  });

  db.addAuditLog({
    action: 'AI_REASONING',
    jurisdiction: jurisdiction as Jurisdiction,
    productId,
    productName,
    details: `AI Answer generated for "${userQuestion}". Evidence strength: ${answerResult.evidenceStrength}. Abstaining: ${answerResult.safeAbstention}`,
    userEmail: process.env.DEMO_EMAIL || 'system@ipsakti.local'
  });

  res.json({
    ...answerResult,
    searchMeta: {
      totalSearched: searchResult.totalSearched,
      relevantCount: searchResult.relevantCount,
      isAbstentionTriggered: searchResult.isAbstentionTriggered
    }
  });
});

// Documents / Knowledge Corpus API
app.get(['/api/documents', '/api/corpus'], (req, res) => {
  const jurisdiction = req.query.jurisdiction as string;
  const docs = [...AUTHORITATIVE_CORPUS, ...knowledgeStore.all()];
  res.json(jurisdiction ? docs.filter(d => d.jurisdiction === jurisdiction) : docs);
});

app.get(['/api/documents/:id', '/api/corpus/:id'], (req, res) => {
  const doc = [...AUTHORITATIVE_CORPUS, ...knowledgeStore.all()].find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// Ingest administrator-supplied text into the persistent local knowledge store.
app.post('/api/documents/ingest-text', async (req, res) => {
  try {
    const { title, authority, framework, section, jurisdiction, sourceUrl, version, effectiveDate, text, tags } = req.body;
    if (!title || !authority || !framework || !jurisdiction || !sourceUrl || !text) {
      return res.status(400).json({ error: 'title, authority, framework, jurisdiction, sourceUrl and text are required' });
    }
    const created = await knowledgeStore.ingestText({ title, authority, framework, section, jurisdiction, sourceUrl, version, effectiveDate, text, tags });
    db.addAuditLog({ action:'DOCUMENT_INGESTED', jurisdiction, details:`Ingested ${created.length} evidence chunks from "${title}".`, userEmail:process.env.DEMO_EMAIL || 'system@ipsakti.local' });
    res.status(201).json({ message:'Document processed, chunked and indexed', chunksCreated:created.length, documents:created });
  } catch (e) { res.status(500).json({ error:'Document ingestion failed', details:String(e) }); }
});

// Fetch readable text from an authoritative public URL and index it locally.
app.post('/api/documents/ingest-url', async (req, res) => {
  try {
    const { url, title, authority, framework, jurisdiction, section, tags } = req.body;
    if (!url || !title || !authority || !framework || !jurisdiction) return res.status(400).json({ error:'url, title, authority, framework and jurisdiction are required' });
    const created = await knowledgeStore.ingestUrl({ url, title, authority, framework, jurisdiction, section, tags });
    db.addAuditLog({ action:'SOURCE_SYNCED', jurisdiction, details:`Fetched and indexed public source "${title}" from ${url}.`, userEmail:process.env.DEMO_EMAIL || 'system@ipsakti.local' });
    res.status(201).json({ message:'Public source fetched, cleaned, chunked and indexed', chunksCreated:created.length, documents:created });
  } catch (e) { res.status(502).json({ error:'Source fetch failed', details:String(e) }); }
});

// Knowledge-base status for a visible demo/admin panel.
app.get('/api/knowledge/status', (_req, res) => {
  const ingested=knowledgeStore.all();
  res.json({ builtIn:AUTHORITATIVE_CORPUS.length, ingested:ingested.length, total:AUTHORITATIVE_CORPUS.length+ingested.length, india:ingested.filter(d=>d.jurisdiction==='INDIA').length, international:ingested.filter(d=>d.jurisdiction==='INTERNATIONAL').length });
});

// Build / refresh the semantic retrieval index for the active corpus.
app.post('/api/rag/index', async (req, res) => {
  try {
    if (!semanticIndex.isConfigured()) return res.status(400).json({ error:'GEMINI_API_KEY is required to build the semantic index.' });
    const jurisdiction = req.body?.jurisdiction as Jurisdiction | undefined;
    const docs = [...AUTHORITATIVE_CORPUS, ...knowledgeStore.all()].filter(d => !jurisdiction || d.jurisdiction === jurisdiction);
    const result = await semanticIndex.index(docs);
    db.addAuditLog({ action:'SEMANTIC_INDEX_BUILT', jurisdiction:jurisdiction || 'INDIA', details:`Indexed ${result.created} evidence documents using ${result.model}. Total vectors: ${result.total}.`, userEmail:process.env.DEMO_EMAIL || 'system@ipsakti.local' });
    res.json(result);
  } catch (e) { res.status(502).json({ error:'Semantic indexing failed', details:String(e) }); }
});

// Botanical Search API
app.get('/api/botanicals/search', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  if (!query) {
    return res.json(BOTANICAL_DATABASE);
  }
  const filtered = BOTANICAL_DATABASE.filter(b =>
    b.sanskritName.toLowerCase().includes(query) ||
    b.hindiName.includes(query) ||
    b.commonName.toLowerCase().includes(query) ||
    b.botanicalName.toLowerCase().includes(query) ||
    b.indications.some(ind => ind.toLowerCase().includes(query))
  );
  res.json(filtered);
});

// Classical Yogas API
app.get('/api/classical-yogas', (req, res) => {
  res.json(CLASSICAL_YOGAS);
});

// Audit Logs API
app.get('/api/audit-logs', (req, res) => {
  const logs = db.getAuditLogs(100);
  res.json(logs);
});

// Evidence Validation API — Validates citations against the authoritative corpus
app.post('/api/evidence/validate', (req, res) => {
  const { citations, jurisdiction = 'INDIA' } = req.body;
  if (!citations || !Array.isArray(citations)) {
    return res.status(400).json({ error: 'citations array is required' });
  }
  const report = validateAllCitations(
    citations.map((c: any) => ({ id: String(c.id || c.citationId || ''), claim: String(c.claim || c.claimText || c.passage || '') })),
    jurisdiction
  );
  res.json(report);
});

// Demo Scenarios Runner (Supporting 10 Comprehensive Pre-Built Scenarios)
app.post('/api/demo/run', async (req, res) => {
  const { scenarioId } = req.body;
  
  const scenarioProductMap: Record<string, { pid: string; juris: Jurisdiction; title: string }> = {
    'demo-joint-health': { pid: 'prod-ashwa-joint-001', juris: 'INDIA', title: 'Scenario 1: Ashwagandha & Haridra Synergy (P&P ASU)' },
    'demo-patent-question': { pid: 'prod-classical-yogaraja-002', juris: 'INDIA', title: 'Scenario 2: Classical Yogaraja Guggulu (Section 3p Bar)' },
    'demo-aahar': { pid: 'prod-ojas-aahar-003', juris: 'INDIA', title: 'Scenario 3: Ojas Rasayana (FSSAI Ayurveda Aahar)' },
    'demo-ojas': { pid: 'prod-ojas-aahar-003', juris: 'INDIA', title: 'Scenario 3: Ojas Rasayana (FSSAI Ayurveda Aahar)' },
    'demo-extract': { pid: 'prod-phyto-withan-004', juris: 'INDIA', title: 'Scenario 4: WS-Phyto-4 (Phytopharmaceutical DCGI Pathway)' },
    'demo-phyto': { pid: 'prod-phyto-withan-004', juris: 'INDIA', title: 'Scenario 4: WS-Phyto-4 (Phytopharmaceutical DCGI Pathway)' },
    'demo-safe-abstention': { pid: 'prod-synthetic-nootropic-005', juris: 'INDIA', title: 'Scenario 5: Synthetic Nootropic (Safe AI Abstention)' },
    'demo-synthetic': { pid: 'prod-synthetic-nootropic-005', juris: 'INDIA', title: 'Scenario 5: Synthetic Nootropic (Safe AI Abstention)' },
    'demo-triphala': { pid: 'prod-triphala-churna-006', juris: 'INDIA', title: 'Scenario 6: Classical Triphala Churna (Section 9 Descriptive Bar)' },
    'demo-neem-process': { pid: 'prod-neem-extract-007', juris: 'INDIA', title: 'Scenario 7: Supercritical CO2 Neem (Novel Process Patent)' },
    'demo-guduchi-cultivated': { pid: 'prod-guduchi-cultivated-008', juris: 'INDIA', title: 'Scenario 8: Cultivated Guduchi (Section 7 BDA Cultivator Exemption)' },
    'demo-brahmi-dmr': { pid: 'prod-brahmi-drink-009', juris: 'INDIA', title: 'Scenario 9: Brahmi Neuro Drink (DMR Act 1954 Curative Claims Red Flag)' },
    'demo-export-us': { pid: 'prod-ashwa-joint-001', juris: 'INTERNATIONAL', title: 'Scenario 1: International US FDA DSHEA & WIPO GRATK' },
    'demo-export-eu': { pid: 'prod-ashwa-eu-export-010', juris: 'INTERNATIONAL', title: 'Scenario 10: European Export Ashwagandha (EU THMPD 15-Year Rule)' }
  };

  const matched = scenarioProductMap[scenarioId];
  if (matched) {
    let product = db.getProductById(matched.pid);
    if (!product) {
      // Fallback to first available
      product = db.getAllProducts()[0];
    }
    if (!product) return res.status(404).json({ error: 'Demo product not found' });
    
    let assessment = db.getAssessmentByProductId(product.id, matched.juris);
    if (!assessment) {
      assessment = await ragEngine.evaluateProduct(product, matched.juris);
      db.saveAssessment(assessment);
    }

    return res.json({
      scenario: matched.title,
      product,
      assessment,
      jurisdiction: matched.juris
    });
  }

  res.status(400).json({ error: 'Unknown scenario ID' });
});
// File upload endpoint
app.post('/api/documents/ingest-file', async (req, res) => {
  try {
    // Note: In production, use multer middleware for multipart form parsing
    // For the prototype, accept base64-encoded file in JSON body
    const { fileBase64, filename, mimetype, title, authority, framework, jurisdiction } = req.body;
    if (!fileBase64 || !filename || !mimetype) {
      return res.status(400).json(errorResponse('Missing file data, filename, or mimetype'));
    }
    const buffer = Buffer.from(fileBase64, 'base64');
    const validation = validateFileUpload({ mimetype, size: buffer.length, buffer });
    if (!validation.valid) {
      return res.status(400).json(errorResponse(validation.error || 'File validation failed'));
    }
    const chunks = await knowledgeStore.ingestFile({
      buffer, filename, mimetype,
      title: title || filename,
      authority: authority || 'User Upload',
      framework: framework || 'Uploaded Document',
      jurisdiction: jurisdiction || 'INDIA'
    });
    db.addAuditLog({
      action: 'DOCUMENT_UPLOADED',
      jurisdiction: jurisdiction || 'INDIA',
      details: `Uploaded file: ${filename} (${mimetype}, ${buffer.length} bytes, ${chunks.length} chunks)`,
      userEmail: 'system'
    });
    res.json({ success: true, chunks: chunks.length, contentHash: validation.contentHash });
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || 'File ingestion failed'));
  }
});

app.post('/api/intent/classify', (req, res) => {
  try {
    const { query, productContext } = req.body;
    if (!query) return res.status(400).json(errorResponse('Query is required'));
    const result = classifyIntent(query, productContext);
    res.json(result);
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message));
  }
});

app.get('/api/botanicals/resolve', (req, res) => {
  try {
    const query = req.query.q as string;
    const plantPart = req.query.plantPart as string | undefined;
    if (!query) return res.status(400).json(errorResponse('Query parameter q is required'));
    const result = resolveBotanical(query, plantPart);
    res.json(result);
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message));
  }
});

app.get('/api/assessment/:id/report', (req, res) => {
  try {
    const assessment = db.getAssessment(req.params.id);
    if (!assessment) return res.status(404).json(errorResponse('Assessment not found'));
    const product = db.getProductById(assessment.productId);
    res.json({
      success: true,
      report: {
        product,
        assessment,
        generatedAt: new Date().toISOString(),
        knowledgeBaseStatus: {
          builtInCorpus: AUTHORITATIVE_CORPUS.length,
          ingestedDocuments: knowledgeStore.all().length,
          semanticIndexSize: semanticIndex.size(),
        }
      }
    });
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message));
  }
});

// ================= VITE MIDDLEWARE SETUP =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/data/**', '**/dist/**', '**/store.json', '**/.git/**']
        }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AyushIP Navigator] Server running on http://0.0.0.0:${PORT}`);
    // Auto-index authoritative corpus for semantic search on boot
    semanticIndex.bootIndex(AUTHORITATIVE_CORPUS).catch(e => console.error('[Boot] Auto-index failed:', e));
  });
}

startServer();
