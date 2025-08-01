/**
 * Input validation and sanitization utilities
 * Prevents SQL injection and validates user inputs
 */

import { z } from 'zod';

// Common validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

export const searchFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  politicalGroup: z.string().max(20).optional(),
  committee: z.string().max(10).optional(),
}).merge(paginationSchema);

export const mepIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid MEP ID format');

export const committeeIdSchema = z.string().regex(/^comm_[a-z]+$/, 'Invalid committee ID format');

// SQL injection prevention
export function sanitizeSearchTerm(term: string): string {
  // Remove potentially dangerous characters
  return term.replace(/['\"\\;-]/g, '').trim();
}

// Rate limit key validation
export function validateRateLimitKey(key: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(key) && key.length <= 100;
}

// Email validation
export const emailSchema = z.string().email().max(254);

// URL validation for external links
export const urlSchema = z.string().url().max(2048);

// Export format validation
export const exportFormatSchema = z.enum(['csv', 'json', 'pdf']);

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: "Start date must be before end date"
});