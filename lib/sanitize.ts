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
⚠️ Before submitting evidence links, make sure they don't contain:
• Passwords or login information
• Your home address or school name
• Student ID numbers or personal IDs
• Private phone numbers or email addresses
• Any information you wouldn't want a stranger to see

When in doubt, ask your mentor first!
`.trim();
