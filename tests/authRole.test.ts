import { UserRole } from '../src/types/api';

describe('Auth Role & Permissions Validation', () => {
  const isAllowedOnMobile = (role: UserRole | null | string): boolean => {
    if (!role) return false;
    // Strict Admin Exclusion
    if (role === 'admin') return false;
    return ['citizen', 'business', 'professional', 'hub', 'service_provider'].includes(role);
  };

  it('rejects admin roles from mobile access', () => {
    expect(isAllowedOnMobile('admin')).toBe(false);
  });

  it('allows citizens and businesses', () => {
    expect(isAllowedOnMobile('citizen')).toBe(true);
    expect(isAllowedOnMobile('business')).toBe(true);
  });

  it('allows professionals (advocates)', () => {
    expect(isAllowedOnMobile('professional')).toBe(true);
  });

  it('allows LOne Hub and Service Providers', () => {
    expect(isAllowedOnMobile('hub')).toBe(true);
    expect(isAllowedOnMobile('service_provider')).toBe(true);
  });

  it('rejects unknown or null roles', () => {
    expect(isAllowedOnMobile(null)).toBe(false);
    expect(isAllowedOnMobile('superadmin')).toBe(false);
  });
});

