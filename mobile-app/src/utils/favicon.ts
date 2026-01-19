/**
 * Extracts domain from a URL
 */
export function extractDomain(url: string): string | null {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.match(/^https?:\/\//) ? url : `https://${url}`;
    const urlObj = new URL(urlWithProtocol);
    return urlObj.hostname;
  } catch (error) {
    return null;
  }
}

/**
 * Gets favicon URL for a domain using Google's favicon service
 */
export function getFaviconUrl(url: string, size: number = 64): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;
  
  // Using Google's favicon service for reliability
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/**
 * Gets a fallback favicon URL using DuckDuckGo
 */
export function getFallbackFaviconUrl(url: string): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;
  
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}
