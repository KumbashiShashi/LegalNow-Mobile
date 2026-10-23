describe('API Client Path Normalization', () => {
  const normalizeEndpoint = (url: string): string => {
    if (url.startsWith('/api/')) {
      return url.replace(/^\/api/, '');
    }
    return url;
  };

  it('strips redundant leading /api from paths', () => {
    expect(normalizeEndpoint('/api/auth/login-otp/send')).toBe('/auth/login-otp/send');
    expect(normalizeEndpoint('/api/appointments')).toBe('/appointments');
    expect(normalizeEndpoint('/api/fees/citizen-subscription')).toBe('/fees/citizen-subscription');
  });

  it('preserves paths that already omit /api', () => {
    expect(normalizeEndpoint('/auth/login-otp/send')).toBe('/auth/login-otp/send');
    expect(normalizeEndpoint('/problems/mine')).toBe('/problems/mine');
  });
});
