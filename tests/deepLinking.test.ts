import { UserRole } from '../src/types/api';

/**
 * Helper replicating the link routing normalization in notifications and deep linking
 */
export function resolveDeepLinkPath(rawLink: string, currentRole: UserRole | null): string {
  let path = rawLink;

  if (path.startsWith('/cases/')) {
    path = path.replace('/cases/', '/case/');
  } else if (path === '/appointments') {
    if (currentRole === 'professional') path = '/(roles)/(advocate)/appointments';
    else if (currentRole === 'hub') path = '/(roles)/(lonehub)/meetings';
    else if (currentRole === 'service_provider') path = '/(roles)/(provider)/appointments';
    else path = '/(roles)/(citizen)/appointments';
  } else if (path === '/subscription') {
    path = '/(roles)/(citizen)/subscription';
  } else if (path === '/advocates') {
    path = '/(roles)/(citizen)/advocates';
  } else if (path.startsWith('/advocates/')) {
    path = path.replace('/advocates/', '/(roles)/(citizen)/advocates/');
  } else if (path === '/service-providers') {
    path = '/(roles)/(citizen)/service-providers';
  } else if (path === '/dashboard') {
    path = '/(roles)';
  }

  return path;
}

/**
 * Helper extracting path from legalnow:// custom URI scheme
 */
export function parseLegalNowUri(uri: string): { path: string; queryParams: Record<string, string> } {
  const cleanUri = uri.replace(/^legalnow:\/\//i, '/');
  const [path, queryString] = cleanUri.split('?');
  const queryParams: Record<string, string> = {};

  if (queryString) {
    queryString.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) queryParams[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }

  return { path: path.startsWith('/') ? path : `/${path}`, queryParams };
}

describe('Deep Link & Notification Route Resolution', () => {
  it('translates web /cases/:id to mobile /case/:id', () => {
    const resolved = resolveDeepLinkPath('/cases/550e8400-e29b-41d4-a716-446655440000', 'citizen');
    expect(resolved).toBe('/case/550e8400-e29b-41d4-a716-446655440000');
  });

  it('routes /appointments dynamically according to user role', () => {
    expect(resolveDeepLinkPath('/appointments', 'citizen')).toBe('/(roles)/(citizen)/appointments');
    expect(resolveDeepLinkPath('/appointments', 'business')).toBe('/(roles)/(citizen)/appointments');
    expect(resolveDeepLinkPath('/appointments', 'professional')).toBe('/(roles)/(advocate)/appointments');
    expect(resolveDeepLinkPath('/appointments', 'hub')).toBe('/(roles)/(lonehub)/meetings');
    expect(resolveDeepLinkPath('/appointments', 'service_provider')).toBe('/(roles)/(provider)/appointments');
  });

  it('translates /subscription to citizen subscription screen', () => {
    expect(resolveDeepLinkPath('/subscription', 'citizen')).toBe('/(roles)/(citizen)/subscription');
  });

  it('translates advocate profile deep links', () => {
    expect(resolveDeepLinkPath('/advocates/advocate-99', 'citizen')).toBe('/(roles)/(citizen)/advocates/advocate-99');
  });

  it('preserves direct invoice receipt paths', () => {
    expect(resolveDeepLinkPath('/invoices/inv-101', 'citizen')).toBe('/invoices/inv-101');
  });
});

describe('legalnow:// URI Scheme Parser', () => {
  it('parses legalnow://case/:id custom URI scheme', () => {
    const { path } = parseLegalNowUri('legalnow://case/case-1234');
    expect(path).toBe('/case/case-1234');
  });

  it('parses legalnow://invoices/:id custom URI scheme', () => {
    const { path } = parseLegalNowUri('legalnow://invoices/inv-5678');
    expect(path).toBe('/invoices/inv-5678');
  });

  it('parses legalnow:// URI with query parameters', () => {
    const { path, queryParams } = parseLegalNowUri('legalnow://advocates?category=Civil&city=Bengaluru');
    expect(path).toBe('/advocates');
    expect(queryParams.category).toBe('Civil');
    expect(queryParams.city).toBe('Bengaluru');
  });
});
