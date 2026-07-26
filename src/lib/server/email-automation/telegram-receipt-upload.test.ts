import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$lib/server/db/client', () => ({ db: {} }));
vi.mock('$lib/server/ledger-expenses', () => ({ appendCompanyLedgerReceipt: vi.fn() }));
vi.mock('$lib/server/notion/upload', () => ({ uploadBlobToNotion: vi.fn() }));

import { detectReceiptImage } from './telegram-receipt-upload';

describe('Telegram receipt image validation', () => {
  it('recognizes supported image signatures', () => {
    expect(detectReceiptImage(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toEqual({ mimeType: 'image/jpeg', extension: 'jpg' });
    expect(detectReceiptImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({ mimeType: 'image/png', extension: 'png' });
    expect(detectReceiptImage(new TextEncoder().encode('RIFF0000WEBP'))).toEqual({ mimeType: 'image/webp', extension: 'webp' });
  });

  it('rejects content that only claims to be an image', () => {
    expect(detectReceiptImage(new TextEncoder().encode('<script>alert(1)</script>'))).toBeNull();
    expect(detectReceiptImage(new Uint8Array())).toBeNull();
  });
});
