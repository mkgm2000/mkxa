import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvatarUploadButton } from '@/components/profile/AvatarUploadButton';

const upload = vi.fn();
const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://x/avatars/MK.jpg' } }));
const upsert = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({
    from: () => ({ upsert }),
    storage: { from: () => ({ upload, getPublicUrl }) },
  }),
}));

describe('AvatarUploadButton', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('overlay variant renders an aria-labeled camera button', () => {
    render(<AvatarUploadButton athlete="MK" currentUrl={null} variant="overlay" onUploaded={() => {}} />);
    expect(screen.getByRole('button', { name: /cambiar foto/i })).toBeInTheDocument();
  });

  it('rejects non-image files', async () => {
    render(<AvatarUploadButton athlete="MK" currentUrl={null} variant="overlay" onUploaded={() => {}} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const txt = new File(['hello'], 'a.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [txt] });
    fireEvent.change(input);
    await waitFor(() => expect(screen.getByText(/imagen/i)).toBeInTheDocument());
    expect(upload).not.toHaveBeenCalled();
  });
});
