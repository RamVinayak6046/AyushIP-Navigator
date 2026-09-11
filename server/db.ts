import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Product, AssessmentResult, AuditLog, User } from '../src/types.js';
import { DEMO_SCENARIOS, AUTHORITATIVE_CORPUS } from './corpus.js';

interface Store {
  products: Product[];
  assessments: AssessmentResult[];
  auditLogs: AuditLog[];
  users: User[];
  documents: DocumentRecord[];
  reviewTasks: ReviewTaskRecord[];
  uploads: UploadRecord[];
}

export interface DocumentRecord {
  id: string;
  title: string;
  authority: string;
  framework: string;
  jurisdiction: string;
  sectionArticleRule: string;
  publicationDate?: string;
  effectiveDate: string;
  version: string;
  status: 'CURRENT' | 'SUPERSEDED' | 'DRAFT' | 'UNKNOWN';
  sourceUrl: string;
  sourceType: string;
  verificationStatus: 'VERIFIED_OFFICIAL' | 'CURATED_DEMO' | 'UNVERIFIED' | 'REVIEW_REQUIRED';
  retrievalTimestamp: string;
  contentHash: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewTaskRecord {
  id: string;
  type: 'EVIDENCE_REVIEW' | 'DOCUMENT_VERIFICATION' | 'ASSESSMENT_REVIEW' | 'CONFLICT_RESOLUTION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED';
  assignedRole: string;
  relatedEntityId: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  completedBy?: string;
  resolution?: string;
}

export interface UploadRecord {
  id: string;
  filename: string;
  mimetype: string;
  sizeBytes: number;
  contentHash: string;
  documentId?: string;
  uploadedBy: string;
  createdAt: string;
}

const ROOT_DIR = typeof __dirname !== 'undefined' ? path.resolve(__dirname, '..') : process.cwd();
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync(path.join(ROOT_DIR, 'data')) ? path.join(ROOT_DIR, 'data') : path.join(process.cwd(), 'data'));
const STORE_FILE = path.join(DATA_DIR, 'store.json');

class PersistentDB {
  private products = new Map<string, Product>();
  private assessments = new Map<string, AssessmentResult>();
  private auditLogs: AuditLog[] = [];
  private users = new Map<string, User>();
  private documents = new Map<string, DocumentRecord>();
  private reviewTasks = new Map<string, ReviewTaskRecord>();
  private uploads = new Map<string, UploadRecord>();

  constructor() { this.load(); }

  private load() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) as Store;
        (raw.products || []).forEach(p => this.products.set(p.id, p));
        (raw.assessments || []).forEach(a => this.assessments.set(a.id, a));
        this.auditLogs = raw.auditLogs || [];
        (raw.users || []).forEach(u => this.users.set(u.id, u));
        (raw.documents || []).forEach(d => this.documents.set(d.id, d));
        (raw.reviewTasks || []).forEach(t => this.reviewTasks.set(t.id, t));
        (raw.uploads || []).forEach(u => this.uploads.set(u.id, u));
      }
    } catch (e) { console.error('[DB] Failed to load store:', e); }

    if (!this.users.size) {
      this.users.set('usr-ayush-001', {
        id: 'usr-ayush-001', name: 'Demo Ayurveda Innovator',
        email: process.env.DEMO_EMAIL || 'demo@ipsakti.local',
        role: 'STARTUP_MSME', organization: 'Demo Ayurveda Innovation'
      });
    }

    // Ensure 1 benchmark example product is loaded into product registry if empty
    if (this.products.size === 0) {
      const primaryDemo = DEMO_SCENARIOS.find(p => p.id === 'prod-ashwa-joint-001') || DEMO_SCENARIOS[0];
      if (primaryDemo) {
        this.products.set(primaryDemo.id, primaryDemo);
      }
    }

    // Ensure all authoritative statutory documents are tracked in document registry
    AUTHORITATIVE_CORPUS.forEach(doc => {
      if (!this.documents.has(doc.id)) {
        this.documents.set(doc.id, {
          id: doc.id,
          title: doc.title,
          authority: doc.authority,
          framework: doc.framework,
          jurisdiction: doc.jurisdiction,
          sectionArticleRule: doc.section,
          effectiveDate: doc.effectiveDate,
          version: doc.version,
          status: 'CURRENT',
          sourceUrl: doc.sourceUrl,
          sourceType: 'STATUTE',
          verificationStatus: 'VERIFIED_OFFICIAL',
          retrievalTimestamp: new Date().toISOString(),
          contentHash: crypto.createHash('sha256').update(doc.passage).digest('hex'),
          chunkCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
  }

  private persistTimer: NodeJS.Timeout | null = null;
  public persistImmediate() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const data: Store = {
        products: Array.from(this.products.values()),
        assessments: Array.from(this.assessments.values()),
        auditLogs: this.auditLogs.slice(-2000),
        users: Array.from(this.users.values()),
        documents: Array.from(this.documents.values()),
        reviewTasks: Array.from(this.reviewTasks.values()),
        uploads: Array.from(this.uploads.values())
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.log('[DB] STORE_FILE successfully written:', STORE_FILE, '| Total users:', data.users.length);
    } catch (e) { console.error('[DB] Immediate persistence error:', e); }
  }

  private persist() {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistImmediate();
    }, 500);
  }

  getUser(id: string) { return this.users.get(id); }
  getUserByEmail(email: string) { return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase()); }
  getAllUsers() { return Array.from(this.users.values()); }
  saveUser(user: User) { 
    this.users.set(user.id, user); 
    this.persistImmediate(); 
    return user; 
  }

  getAllProducts() { return Array.from(this.products.values()).sort((a,b) => new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()); }
  getProductById(id: string) { return this.products.get(id) || DEMO_SCENARIOS.find(p => p.id === id); }
  saveProduct(product: Product) {
    product.updatedAt = new Date().toISOString();
    if (!product.createdAt) product.createdAt = product.updatedAt;
    this.products.set(product.id, product);
    this.addAuditLog({ action:'PRODUCT_SAVED', jurisdiction:'INDIA', productId:product.id, productName:product.name, details:`Product "${product.name}" created/updated with classification "${product.classification}".`, userEmail: process.env.DEMO_EMAIL || 'system@ipsakti.local' });
    this.persist();
    return product;
  }
  deleteProduct(id: string) {
    const product=this.products.get(id); if(!product) return false;
    this.products.delete(id);
    this.addAuditLog({ action:'PRODUCT_DELETED', jurisdiction:'INDIA', productId:id, productName:product.name, details:`Product "${product.name}" removed from registry.`, userEmail: process.env.DEMO_EMAIL || 'system@ipsakti.local' });
    this.persist(); return true;
  }

  getAssessment(id: string) { return this.assessments.get(id); }
  getAssessmentByProductId(productId:string, jurisdiction?:string) {
    return Array.from(this.assessments.values()).reverse().find(a=>a.productId===productId && (!jurisdiction || a.jurisdiction===jurisdiction));
  }
  saveAssessment(a:AssessmentResult) {
    this.assessments.set(a.id,a);
    const p=this.products.get(a.productId); if(p){p.status=a.safeAbstention?'PENDING_REVIEW':'ASSESSED';p.updatedAt=new Date().toISOString();}
    this.addAuditLog({ action:'ASSESSMENT_COMPLETED', jurisdiction:a.jurisdiction, productId:a.productId, productName:a.productName, details:`Evaluation performed for "${a.productName}" in ${a.jurisdiction}. Confidence: ${a.confidence}. Safe Abstention: ${a.safeAbstention}.`, userEmail: process.env.DEMO_EMAIL || 'system@ipsakti.local' });
    this.persist(); return a;
  }
  getAuditLogs(limit=100){return this.auditLogs.slice(-limit).reverse();}
  
  addAuditLog(log: (Omit<AuditLog, 'id' | 'timestamp'> & { userId?: string; requestId?: string }) | AuditLog) {
    const item = { id: (log as any).id || ('log-' + Math.random().toString(36).slice(2,9)), timestamp: (log as any).timestamp || new Date().toISOString(), ...log } as any;
    this.auditLogs.push(item);
    if (this.auditLogs.length > 2000) this.auditLogs.shift();
    this.persist();
    return item;
  }

  getAllDocuments() { return Array.from(this.documents.values()); }
  getDocument(id: string) { return this.documents.get(id); }
  saveDocument(doc: DocumentRecord) { this.documents.set(doc.id, doc); this.persist(); return doc; }
  deleteDocument(id: string) { const res = this.documents.delete(id); if (res) this.persist(); return res; }

  getReviewTasks(status?: string) {
    const tasks = Array.from(this.reviewTasks.values());
    return status ? tasks.filter(t => t.status === status) : tasks;
  }
  saveReviewTask(task: ReviewTaskRecord) { this.reviewTasks.set(task.id, task); this.persist(); return task; }
  updateReviewTask(id: string, updates: Partial<ReviewTaskRecord>) {
    const task = this.reviewTasks.get(id);
    if (!task) return null;
    const updated = { ...task, ...updates, updatedAt: new Date().toISOString() };
    this.reviewTasks.set(id, updated);
    this.persist();
    return updated;
  }

  getUploads() { return Array.from(this.uploads.values()); }
  saveUpload(upload: UploadRecord) { this.uploads.set(upload.id, upload); this.persist(); return upload; }
}

export const db = new PersistentDB();
