import crypto from 'crypto';
import { Product } from './types.js';

/**
 * Validates URL safety
 */
export function validateUrl(url: string): { valid: boolean; error?: string; sanitizedUrl?: string } {
    if (!url || url.length > 2048) {
        return { valid: false, error: 'URL is missing or exceeds 2048 characters' };
    }

    try {
        const parsedUrl = new URL(url);

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return { valid: false, error: 'Only http and https protocols are allowed' };
        }

        if (parsedUrl.username || parsedUrl.password) {
            return { valid: false, error: 'Credential-bearing URLs are not allowed' };
        }

        const hostname = parsedUrl.hostname;

        // Block private and local IP ranges
        if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '::1' ||
            hostname.startsWith('10.') ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('169.254.') ||
            hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
            hostname.startsWith('fc00::') ||
            hostname.startsWith('fe80::')
        ) {
            return { valid: false, error: 'Local or private IP addresses are not allowed' };
        }

        return { valid: true, sanitizedUrl: parsedUrl.toString() };
    } catch (e) {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Validates product creation/update request body
 */
export function validateProductInput(body: any): { valid: boolean; errors: string[]; sanitized?: Partial<Product> } {
    const errors: string[] = [];
    if (!body || typeof body !== 'object') {
        return { valid: false, errors: ['Invalid product input'] };
    }

    if (!body.name || typeof body.name !== 'string') {
        errors.push('Product name is required');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return { 
        valid: true, 
        errors: [], 
        sanitized: {
            ...body,
            name: sanitizeString(body.name),
            description: body.description ? sanitizeString(body.description) : undefined,
        } as Partial<Product>
    };
}

/**
 * Validates document ingestion
 */
export function validateIngestionInput(body: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!body || typeof body !== 'object') {
        return { valid: false, errors: ['Invalid ingestion input'] };
    }

    if (!body.url && !body.content) {
        errors.push('Either url or content must be provided');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validates uploaded files
 */
export function validateFileUpload(file: { mimetype: string; size: number; buffer: Buffer }): { valid: boolean; error?: string; contentHash?: string } {
    const allowedMimeTypes = ['application/pdf', 'text/plain', 'text/html', 'image/png', 'image/jpeg'];
    const maxSize = parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10); // Default 10MB

    if (!file || !file.buffer) {
        return { valid: false, error: 'Invalid file upload' };
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
        return { valid: false, error: 'Invalid file type' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'File size exceeds maximum allowed limit' };
    }

    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    return { valid: true, contentHash: hash };
}

/**
 * Validates RAG search requests
 */
export function validateSearchInput(body: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!body || typeof body !== 'object') {
        return { valid: false, errors: ['Invalid search input'] };
    }

    if (!body.query || typeof body.query !== 'string') {
        errors.push('Search query is required');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Strip dangerous characters, trim, limit length
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    return input.replace(/[<>]/g, '').trim().substring(0, 10000);
}

/**
 * Check against allowlist of trusted government/treaty body domains
 */
export function isOfficialDomain(url: string): boolean {
    const allowedDomains = [
        'ipindia.gov.in', 'ayush.gov.in', 'nbaindia.org', 'wipo.int', 
        'wto.org', 'fda.gov', 'ema.europa.eu', 'gov.uk', 'mohap.gov.ae', 
        'tga.gov.au', 'fssai.gov.in', 'plantauthority.gov.in', 'cdsco.gov.in'
    ];

    try {
        const parsedUrl = new URL(url);
        return allowedDomains.some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`));
    } catch {
        return false;
    }
}
