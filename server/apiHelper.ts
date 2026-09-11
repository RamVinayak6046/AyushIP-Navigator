import crypto from 'crypto';
import { APIResponse } from './types.js';

/**
 * Generates a unique request ID for audit correlation
 */
export function generateRequestId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `req-${timestamp}-${random}`;
}

/**
 * Consistent success response
 */
export function successResponse<T>(data: T, message?: string): APIResponse<T> {
    return {
        success: true,
        data,
        message,
    } as any;
}

/**
 * Consistent error response
 */
export function errorResponse(error: string, statusCode: number = 500): APIResponse<any> {
    return {
        success: false,
        error,
        statusCode,
    } as any;
}

/**
 * 404 response
 */
export function notFoundResponse(entity: string): APIResponse<any> {
    return errorResponse(`${entity} not found`, 404);
}

/**
 * 400 validation error
 */
export function validationErrorResponse(errors: string[]): APIResponse<any> {
    return errorResponse(`Validation failed: ${errors.join(', ')}`, 400);
}

/**
 * 401 response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): APIResponse<any> {
    return errorResponse(message, 401);
}

/**
 * 403 response
 */
export function forbiddenResponse(message: string = 'Forbidden'): APIResponse<any> {
    return errorResponse(message, 403);
}

/**
 * 429 response
 */
export function rateLimitResponse(): APIResponse<any> {
    return errorResponse('Too many requests, please try again later.', 429);
}
