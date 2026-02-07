/**
 * Валидация URL для редиректов и webhook — защита от Open Redirect и SSRF.
 */
export function isRedirectUrlAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return !isPrivateOrLocalHost(u.hostname);
  } catch {
    return false;
  }
}

export function isWebhookUrlSafe(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return !isPrivateOrLocalHost(u.hostname);
  } catch {
    return false;
  }
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) return true;
  if (host.startsWith('0.') || host === '0.0.0.0') return true;
  const parts = host.split('.').map((n) => parseInt(n, 10));
  if (parts.length === 4 && !parts.some(isNaN)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
  }
  return false;
}
