import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AvatarCircle } from '@/components/profile/AvatarCircle';

describe('AvatarCircle', () => {
  it('renders the image when src is provided', () => {
    render(<AvatarCircle athlete="MK" src="https://example.com/x.jpg" />);
    const img = screen.getByRole('img', { name: /MK/i });
    expect(img).toHaveAttribute('src', 'https://example.com/x.jpg');
  });

  it('falls back to initials when src is null', () => {
    render(<AvatarCircle athlete="Xabi" src={null} />);
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('uses MK initials with the love mood color, Xabi with joyful', () => {
    const { container, rerender } = render(<AvatarCircle athlete="MK" src={null} />);
    const mkBg = (container.firstChild as HTMLElement).style.backgroundColor;
    expect(mkBg).not.toBe('');
    rerender(<AvatarCircle athlete="Xabi" src={null} />);
    const xaBg = (container.firstChild as HTMLElement).style.backgroundColor;
    expect(xaBg).not.toBe(mkBg);
  });

  it('falls back to initials when the image fails to load', () => {
    render(<AvatarCircle athlete="MK" src="https://bad/x.jpg" />);
    const img = screen.getByRole('img', { name: /MK/i });
    fireEvent.error(img);
    expect(screen.getByText('M')).toBeInTheDocument();
  });
});
