/**
 * AyushIP Navigator — Shared API Client
 * Provides safe JSON parsing, consistent error handling, and auth token management.
 * All components MUST use this instead of calling fetch() directly.
 */

const API_BASE = '';
let authToken: string | null = null;

/** Set the auth token for all subsequent requests */
export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('ayuship_token', token);
  } else {
    localStorage.removeItem('ayuship_token');
  }
}

/** Get the current auth token */
export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('ayuship_token') || localStorage.getItem('ipsakti_token');
  }
  return authToken;
}

/** API Error class with structured information */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public serverMessage?: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/** Safe JSON parser — never throws on non-JSON responses */
async function safeParseJSON(response: Response): Promise<any> {
  const text = await response.text();
  if (!text || text.trim().length === 0) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    // Server returned non-JSON (HTML error page, plain text, etc.)
    return { 
      success: false, 
      error: `Server returned non-JSON response (${response.status}): ${text.substring(0, 200)}` 
    };
  }
}

/** Core fetch wrapper with auth, safe parsing, and error handling */
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add content-type for JSON bodies (but not for FormData)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await safeParseJSON(response);

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new APIError(
      errorMessage,
      response.status,
      data?.error,
      data?.requestId
    );
  }

  return data as T;
}

// ========================= API Methods =========================

// Auth
export const api = {
  // Authentication
  async login(email: string, password: string) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data?.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  async register(name: string, email: string, password: string, role: string, organization?: string) {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, organization }),
    });
    if (data?.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  logout() {
    setAuthToken(null);
  },

  // Products
  async getProducts() {
    return apiFetch('/api/products');
  },

  async getProduct(id: string) {
    return apiFetch(`/api/products/${id}`);
  },

  async saveProduct(product: any) {
    return apiFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  async deleteProduct(id: string) {
    return apiFetch(`/api/products/${id}`, { method: 'DELETE' });
  },

  async classifyProduct(productId: string) {
    return apiFetch(`/api/products/${productId}/classify`, { method: 'POST' });
  },

  async getAdaptiveQuestions(productId: string, answers?: any[]) {
    return apiFetch(`/api/products/${productId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ answers: answers || [] }),
    });
  },

  // Assessments
  async evaluateProduct(productId: string, jurisdiction: string) {
    return apiFetch('/api/assessment/evaluate', {
      method: 'POST',
      body: JSON.stringify({ productId, jurisdiction }),
    });
  },

  async getAssessment(id: string) {
    return apiFetch(`/api/assessment/${id}`);
  },

  async getProductAssessment(productId: string, jurisdiction: string) {
    return apiFetch(`/api/assessment/product/${productId}?jurisdiction=${jurisdiction}`);
  },

  async getAssessmentReport(assessmentId: string) {
    return apiFetch(`/api/assessment/${assessmentId}/report`);
  },

  // RAG
  async ragSearch(query: string, jurisdiction: string, tags?: string[]) {
    return apiFetch('/api/rag/search', {
      method: 'POST',
      body: JSON.stringify({ query, jurisdiction, tags }),
    });
  },

  async ragAnswer(query: string, jurisdiction: string, productContext?: any) {
    return apiFetch('/api/rag/answer', {
      method: 'POST',
      body: JSON.stringify({ query, jurisdiction, productContext }),
    });
  },

  async buildSemanticIndex() {
    return apiFetch('/api/rag/index', { method: 'POST' });
  },

  // Documents
  async getDocuments(jurisdiction?: string) {
    const url = jurisdiction ? `/api/documents?jurisdiction=${jurisdiction}` : '/api/documents';
    return apiFetch(url);
  },

  async getDocument(id: string) {
    return apiFetch(`/api/documents/${id}`);
  },

  async ingestUrl(input: { url: string; title: string; authority: string; framework: string; jurisdiction: string }) {
    return apiFetch('/api/documents/ingest-url', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async ingestText(input: { text: string; title: string; authority: string; framework: string; jurisdiction: string }) {
    return apiFetch('/api/documents/ingest-text', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async ingestFile(formData: FormData) {
    return apiFetch('/api/documents/ingest-file', {
      method: 'POST',
      body: formData,
    });
  },

  // Knowledge
  async getKnowledgeStatus() {
    return apiFetch('/api/knowledge/status');
  },

  // Botanicals
  async searchBotanicals(query: string) {
    return apiFetch(`/api/botanicals/search?q=${encodeURIComponent(query)}`);
  },

  async getClassicalYogas() {
    return apiFetch('/api/classical-yogas');
  },

  // Audit
  async getAuditLogs() {
    return apiFetch('/api/audit-logs');
  },

  // Health
  async getHealth() {
    return apiFetch('/api/health');
  },

  // Demo
  async runDemo(scenario: string) {
    return apiFetch('/api/demo/run', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    });
  },
};

export default api;
