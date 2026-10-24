jest.mock('../src/api/axiosClient', () => ({
  apiClient: {
    defaults: {
      baseURL: 'http://localhost:5000/api',
    },
  },
}));

import { useNetworkStore } from '../src/store/useNetworkStore';
import { mediaUrl } from '../src/utils/media';

describe('Network Connectivity Store', () => {
  beforeEach(() => {
    useNetworkStore.getState().setOffline(false);
  });

  it('initializes with online status', () => {
    expect(useNetworkStore.getState().isOffline).toBe(false);
    expect(useNetworkStore.getState().lastError).toBeNull();
  });

  it('updates state to offline with error description on network failure', () => {
    useNetworkStore.getState().setOffline(true, 'Server connection unreachable');
    expect(useNetworkStore.getState().isOffline).toBe(true);
    expect(useNetworkStore.getState().lastError).toBe('Server connection unreachable');
  });

  it('restores online state when network reconnects', () => {
    useNetworkStore.getState().setOffline(true, 'Network Error');
    expect(useNetworkStore.getState().isOffline).toBe(true);

    useNetworkStore.getState().setOffline(false);
    expect(useNetworkStore.getState().isOffline).toBe(false);
  });
});

describe('Chat Message Attachment & URL Processing', () => {
  const urlRegex = /(https?:\/\/[^\s]+|\/uploads\/[^\s]+)/g;
  const isImageUrl = (url: string) => /\.(jpeg|jpg|png|webp|gif)($|\?)/i.test(url);

  it('identifies image URLs correctly', () => {
    expect(isImageUrl('/uploads/sample_doc.png')).toBe(true);
    expect(isImageUrl('https://example.com/photo.JPG')).toBe(true);
    expect(isImageUrl('/uploads/agreement.pdf')).toBe(false);
    expect(isImageUrl('/uploads/case_file.docx')).toBe(false);
  });

  it('extracts attachment URLs from message body', () => {
    const message = 'Please review this file:\n📎 Contract.pdf: /uploads/abc_Contract.pdf';
    const matches = message.match(urlRegex);
    expect(matches).not.toBeNull();
    expect(matches?.[0]).toBe('/uploads/abc_Contract.pdf');
  });

  it('resolves relative upload URLs to full media paths', () => {
    const relativeUrl = '/uploads/12345_license.pdf';
    const resolved = mediaUrl(relativeUrl);
    expect(resolved).toBe('http://localhost:5000/uploads/12345_license.pdf');
  });

  it('leaves absolute media URLs unmodified', () => {
    const s3Url = 'https://s3.amazonaws.com/legalnow-bucket/receipt.pdf';
    expect(mediaUrl(s3Url)).toBe(s3Url);
  });
});
