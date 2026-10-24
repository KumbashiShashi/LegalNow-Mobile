jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('../src/api/axiosClient', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('../src/utils/storage', () => {
  let store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] || null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    __reset: () => {
      store = {};
    },
  };
});

import { useSecurityStore } from '../src/store/useSecurityStore';
import { handleNotificationRoute } from '../src/hooks/usePushNotifications';
import { router } from 'expo-router';

describe('useSecurityStore Biometrics & Security Lock', () => {
  beforeEach(() => {
    useSecurityStore.setState({ isBiometricEnabled: false, isLocked: false });
  });

  test('enabling biometric updates state and sets enabled', async () => {
    await useSecurityStore.getState().setBiometricEnabled(true);
    expect(useSecurityStore.getState().isBiometricEnabled).toBe(true);
    expect(useSecurityStore.getState().isLocked).toBe(false);
  });

  test('locking workspace sets isLocked to true', () => {
    useSecurityStore.getState().lock();
    expect(useSecurityStore.getState().isLocked).toBe(true);
  });

  test('unlocking workspace sets isLocked to false', () => {
    useSecurityStore.getState().lock();
    expect(useSecurityStore.getState().isLocked).toBe(true);

    useSecurityStore.getState().unlock();
    expect(useSecurityStore.getState().isLocked).toBe(false);
  });

  test('initializing security with stored flag sets locked to true', async () => {
    const storage = require('../src/utils/storage');
    await storage.setItemAsync('legalnow_biometric_enabled', 'true');

    await useSecurityStore.getState().initializeSecurity();
    expect(useSecurityStore.getState().isBiometricEnabled).toBe(true);
    expect(useSecurityStore.getState().isLocked).toBe(true);
  });
});

describe('handleNotificationRoute Deep-Link Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('routes to case workspace when caseId is supplied', () => {
    handleNotificationRoute({ caseId: 'case-xyz-123' });
    expect(router.push).toHaveBeenCalledWith('/case/case-xyz-123');
  });

  test('routes to invoice details when invoiceId is supplied', () => {
    handleNotificationRoute({ invoiceId: 'inv-456' });
    expect(router.push).toHaveBeenCalledWith('/invoices/inv-456');
  });

  test('routes to raw link when direct link is provided', () => {
    handleNotificationRoute({ link: '/(roles)/(citizen)/subscription' });
    expect(router.push).toHaveBeenCalledWith('/(roles)/(citizen)/subscription');
  });
});
