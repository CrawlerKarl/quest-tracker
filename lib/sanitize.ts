// Sanitize text input - remove potentially dangerous characters
export function sanitizeText(input: string, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

// Sanitize and validate URL
export function sanitizeUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  
  try {
    const url = new URL(input.trim());
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    
    // Block javascript: and data: schemes that might slip through
    if (url.href.toLowerCase().includes('javascript:') || 
        url.href.toLowerCase().includes('data:')) {
      return null;
    }
    
    return url.href;
  } catch {
    return null;
  }
}

// Validate and sanitize an array of URLs
export function sanitizeUrlArray(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  
  return urls
    .map(url => sanitizeUrl(String(url)))
    .filter((url): url is string => url !== null)
    .slice(0, 10); // Max 10 links
}

// Sanitize proof - can be URL or text description
// Examples: "https://imgur.com/abc123" OR "Done via screenshare with mentor"
export function sanitizeProof(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 1000) return trimmed.slice(0, 1000);
  
  // Remove potentially dangerous characters but allow most text
  const sanitized = trimmed
    .replace(/[<>]/g, '') // Remove angle brackets (prevent HTML injection)
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, ''); // Remove data: protocol
  
  return sanitized.length > 0 ? sanitized : null;
}

// Validate and sanitize an array of proof items (URLs or text)
export function sanitizeProofArray(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  
  return items
    .map(item => sanitizeProof(String(item)))
    .filter((item): item is string => item !== null && item.length > 0)
    .slice(0, 10); // Max 10 items
}

// Sanitize JSON string array
export function sanitizeStringArray(input: unknown, maxItems: number = 20, maxLength: number = 1000): string[] {
  if (!Array.isArray(input)) return [];
  
  return input
    .slice(0, maxItems)
    .map(item => sanitizeText(String(item), maxLength))
    .filter(item => item.length > 0);
}

// Safety reminder for evidence submissions
export const EVIDENCE_SAFETY_REMINDER = `
⚠️ Before submitting proof, make sure it doesn't contain:
• Passwords or login information
• Your home address or school name
• Student ID numbers or personal IDs
• Private phone numbers or email addresses
• Any information you wouldn't want a stranger to see

When in doubt, ask your mentor first!
`.trim();
