import fs from 'fs';
import path from 'path';
import { EvidenceItem, Jurisdiction } from '../src/types.js';
import { GoogleGenAI } from '@google/genai';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'semantic-index.json');
const MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

interface StoredVector { id: string; jurisdiction: Jurisdiction; model: string; textHash: string; vector: number[]; updatedAt: string; }

function hashText(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}

function normalize(v: number[]) {
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map(x => x / norm);
}

export function cosine(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += a[i] * b[i];
  return sum;
}

function textFor(e: EvidenceItem) {
  return `${e.title}\n${e.framework}\n${e.section}\n${e.passage}\n${(e.tags || []).join(' ')}`;
}

export class SemanticIndex {
  private vectors: StoredVector[] = [];
  private ai: GoogleGenAI | null = null;
  private booting = false;
  constructor() { this.load(); }
  private load() {
    try { if (fs.existsSync(FILE)) this.vectors = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
    catch (e) { console.error('[SemanticIndex] load failed', e); }
  }
  private persist() { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(this.vectors)); }
  isConfigured() { return Boolean(process.env.GEMINI_API_KEY); }
  size(jurisdiction?: Jurisdiction) { return jurisdiction ? this.vectors.filter(v => v.jurisdiction === jurisdiction).length : this.vectors.length; }
  private client() {
    if (!process.env.GEMINI_API_KEY) return null;
    if (!this.ai) this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return this.ai;
  }
  async embed(text: string, retrievalQuery = false): Promise<number[] | null> {
    const ai = this.client();
    if (!ai) return null;
    try {
      const result = await ai.models.embedContent({
        model: MODEL,
        contents: text,
        config: {
          taskType: retrievalQuery ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
          outputDimensionality: Number(process.env.GEMINI_EMBEDDING_DIM || 768)
        }
      });
      const values = (result as any)?.embeddings?.[0]?.values || (result as any)?.embedding?.values;
      return Array.isArray(values) ? normalize(values) : null;
    } catch (e) {
      console.error('[SemanticIndex] embed failed:', e);
      return null;
    }
  }
  async index(docs: EvidenceItem[]) {
    const existing = new Map(this.vectors.map(v => [v.id, v]));
    let created = 0;
    for (const doc of docs) {
      const source = textFor(doc); const textHash = hashText(source);
      const old = existing.get(doc.id);
      if (old && old.model === MODEL && old.textHash === textHash) continue;
      const vector = await this.embed(source, false);
      if (!vector) continue; // skip failed documents instead of halting the entire batch
      existing.set(doc.id, { id: doc.id, jurisdiction: doc.jurisdiction, model: MODEL, textHash, vector, updatedAt: new Date().toISOString() });
      created++;
    }
    this.vectors = [...existing.values()]; this.persist();
    return { created, total: this.vectors.length, model: MODEL };
  }
  async query(text: string) { return this.embed(text, true); }
  get(id: string) { return this.vectors.find(v => v.id === id); }

  /**
   * Auto-index the authoritative corpus on first boot if GEMINI_API_KEY is set
   * and the index is empty or smaller than the corpus.
   */
  async bootIndex(corpus: EvidenceItem[]) {
    if (!this.isConfigured() || this.booting) return;
    if (this.vectors.length >= corpus.length) {
      console.log(`[SemanticIndex] Index already has ${this.vectors.length} vectors, skipping boot index.`);
      return;
    }
    this.booting = true;
    console.log(`[SemanticIndex] Auto-indexing ${corpus.length} authoritative documents on boot...`);
    try {
      const result = await this.index(corpus);
      console.log(`[SemanticIndex] Boot index complete: ${result.created} new vectors, ${result.total} total.`);
    } catch (e) {
      console.error('[SemanticIndex] Boot index failed:', e);
    } finally {
      this.booting = false;
    }
  }
}

export const semanticIndex = new SemanticIndex();

