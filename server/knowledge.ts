import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EvidenceItem, Jurisdiction } from '../src/types.js';
import { isOfficialDomain } from './validation.js';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'knowledge.json');

function cleanHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/\s+/g,' ').trim();
}

function extractHtmlMetadata(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const canonMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i) || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i);
  return {
    title: titleMatch ? titleMatch[1].trim() : undefined,
    description: descMatch ? descMatch[1].trim() : undefined,
    canonical: canonMatch ? canonMatch[1].trim() : undefined
  };
}

function chunk(text:string, size=1500, overlap=200){
  const out:string[]=[]; let i=0;
  while(i<text.length){out.push(text.slice(i,i+size));i+=size-overlap;}
  return out.filter(x=>x.trim().length>80);
}

function isPrivateIp(ip: string) {
  if (ip === '127.0.0.1' || ip === '0.0.0.0' || ip === '::1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('fc00:') || ip.startsWith('fe80:')) return true;
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  if (ip === 'localhost') return true;
  return false;
}

export class KnowledgeStore {
  private docs: EvidenceItem[]=[];
  constructor(){this.load();}
  private load(){try{if(fs.existsSync(FILE))this.docs=JSON.parse(fs.readFileSync(FILE,'utf8'));}catch(e){console.error('[KB] load failed',e);}}
  private persist(){fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(FILE,JSON.stringify(this.docs,null,2));}
  all(){return this.docs;}
  add(doc:EvidenceItem){this.docs.push(doc);this.persist();return doc;}

  async ingestText(input:{title:string;authority:string;framework:string;section?:string;jurisdiction:Jurisdiction;sourceUrl:string;version?:string;effectiveDate?:string;text:string;tags?:string[]}){
    const chunks=chunk(input.text); const created:EvidenceItem[]=[];
    const tagSet = new Set(input.tags || []);
    let isOfficial = false;
    try {
      if (input.sourceUrl.startsWith('http')) {
        const domain = new URL(input.sourceUrl).hostname;
        isOfficial = isOfficialDomain(domain);
      }
    } catch (e) {}
    tagSet.add(isOfficial ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED');

    chunks.forEach((passage,i)=>created.push(this.add({
      id:`kb-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`,
      authority:input.authority,framework:input.framework,section:input.section || `Document chunk ${i+1}`,
      jurisdiction:input.jurisdiction,title:input.title,passage,strength:'MEDIUM',sourceUrl:input.sourceUrl,
      version:input.version || 'retrieved',effectiveDate:input.effectiveDate || new Date().toISOString().slice(0,10),
      tags: Array.from(tagSet), embeddingModel: undefined, embedding: undefined,
      verificationStatus: isOfficial ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      pageRecord: `Chunk ${i + 1}`
    } as any)));
    return created;
  }

  async processPdfBuffer(buffer: Buffer, sourceUrl: string, metaInput: any) {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const pages: string[] = [];
      const render_page = async function(pageData: any) {
        const textContent = await pageData.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        pages[pageData.pageIndex] = text;
        return text;
      };
      await pdfParse(buffer, { pagerender: render_page });
      
      let created: EvidenceItem[] = [];
      const tagSet = new Set(metaInput.tags || []);
      let isOfficial = false;
      try {
        if (sourceUrl.startsWith('http')) {
          const domain = new URL(sourceUrl).hostname;
          isOfficial = isOfficialDomain(domain);
        }
      } catch (e) {}
      tagSet.add(isOfficial ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED');

      for (let i = 0; i < pages.length; i++) {
        if (!pages[i]) continue;
        const pageChunks = chunk(pages[i], 1500, 200);
        for (let j = 0; j < pageChunks.length; j++) {
           created.push(this.add({
             id: `kb-${Date.now()}-${i}-${j}-${Math.random().toString(36).slice(2,7)}`,
             authority: metaInput.authority,
             framework: metaInput.framework,
             section: metaInput.section || `Page ${i+1} Chunk ${j+1}`,
             jurisdiction: metaInput.jurisdiction,
             title: metaInput.title,
             passage: pageChunks[j],
             strength: 'MEDIUM',
             sourceUrl,
             version: metaInput.version || 'retrieved',
             effectiveDate: metaInput.effectiveDate || new Date().toISOString().slice(0,10),
             tags: Array.from(tagSet),
             embeddingModel: undefined,
             embedding: undefined,
             pageNumber: i + 1,
             pageRecord: `Page ${i + 1}`,
             verificationStatus: isOfficial ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED'
           } as any));
        }
      }
      return created;
    } catch (e: any) {
      if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message.includes('Cannot find module')) {
        throw new Error('pdf-parse is not installed. Please install it to process PDFs.');
      }
      throw new Error(`PDF processing failed: ${e.message}`);
    }
  }

  async ingestUrl(input:{url:string;title:string;authority:string;framework:string;jurisdiction:Jurisdiction;section?:string;tags?:string[]}){
    let parsed: URL;
    try { parsed = new URL(input.url); }
    catch { throw new Error('Invalid URL. Use a complete http(s) URL.'); }
    
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only public HTTP/HTTPS sources are supported. Blocked file://, ftp://, data: protocols.');
    if (parsed.username || parsed.password) throw new Error('Credential-bearing URLs are not allowed.');
    
    const hostname = parsed.hostname.replace(/\[|\]/g, '');
    if (isPrivateIp(hostname)) throw new Error('Private or loopback IPs are not allowed.');

    let currentUrl = parsed.toString();
    let redirects = 0;
    let response;
    
    while (redirects < 3) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AyushIP-Navigator-Knowledge-Ingest/1.0)',
            'Accept': 'text/html,application/xhtml+xml,text/plain,application/pdf;q=0.9,*/*;q=0.5'
          }
        });
        clearTimeout(timeout);
      } catch (e: any) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') throw new Error('Fetch timed out after 10 seconds.');
        throw e;
      }
      
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        const nextUrlStr = response.headers.get('location')!;
        const nextParsed = new URL(nextUrlStr, currentUrl);
        const nextHost = nextParsed.hostname.replace(/\[|\]/g, '');
        if (isPrivateIp(nextHost)) throw new Error('Redirect to private IP is not allowed.');
        currentUrl = nextParsed.toString();
        redirects++;
      } else {
        break;
      }
    }
    
    if(!response || !response.ok) throw new Error(`Source returned HTTP ${response?.status}`);

    const contentType=(response.headers.get('content-type') || '').toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    
    if(contentType.includes('application/pdf') || currentUrl.toLowerCase().split('?')[0].endsWith('.pdf')) {
       return this.processPdfBuffer(buffer, currentUrl, input);
    }

    const body = buffer.toString('utf8');
    let text='';
    let docTitle = input.title;
    
    if(contentType.includes('text/html') || contentType.includes('application/xhtml+xml') || !contentType) {
      const meta = extractHtmlMetadata(body);
      if (meta.title && !input.title) docTitle = meta.title;
      text = cleanHtml(body);
    }
    else if(contentType.includes('text/plain')) {
      text = body.replace(/\s+/g,' ').trim();
    }
    else {
      throw new Error(`Unsupported source content type: ${contentType || 'unknown'}`);
    }

    const lower=text.toLowerCase();
    const looksLikeLogin = /sign in|log in|forgot (email|password)|create account|captcha|google accounts|sign up|authentication required|access denied/.test(lower) && text.length < 20000;
    if(looksLikeLogin) throw new Error('The URL appears to be a login/sign-in page, not the underlying source document. Paste the public official document URL instead.');
    if(text.length<100) throw new Error('Source returned insufficient readable text');
    
    return this.ingestText({...input, title: docTitle, text, sourceUrl: currentUrl});
  }

  async ingestFile(input: { buffer: Buffer; filename: string; mimetype: string; title: string; authority: string; framework: string; jurisdiction: Jurisdiction; section?: string; tags?: string[] }): Promise<EvidenceItem[]> {
    const hash = crypto.createHash('sha256').update(input.buffer).digest('hex');
    const sourceUrl = `file://${hash}/${input.filename}`;
    const mime = input.mimetype.toLowerCase();
    
    if (mime.includes('application/pdf') || input.filename.toLowerCase().endsWith('.pdf')) {
      return this.processPdfBuffer(input.buffer, sourceUrl, input);
    } else if (mime.includes('text/html')) {
      const body = input.buffer.toString('utf8');
      const text = cleanHtml(body);
      return this.ingestText({...input, text, sourceUrl});
    } else if (mime.includes('text/plain')) {
      const text = input.buffer.toString('utf8').replace(/\s+/g,' ').trim();
      return this.ingestText({...input, text, sourceUrl});
    } else if (mime.includes('image/')) {
      try {
        const Tesseract = (await import('tesseract.js')).default;
        const result = await Tesseract.recognize(input.buffer, 'eng');
        const text = result.data.text;
        return this.ingestText({...input, text, sourceUrl});
      } catch (e: any) {
        if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message.includes('Cannot find module')) {
          throw new Error('tesseract.js is not installed. Please install it to process images.');
        }
        throw new Error(`Image OCR failed: ${e.message}`);
      }
    } else {
      throw new Error(`Unsupported file type: ${mime}`);
    }
  }
}
export const knowledgeStore=new KnowledgeStore();
