// Recap is a full-screen, immersive Spotify-Wrapped-style flow.
// It lives OUTSIDE the (app) group so the BottomNav and MoodGate don't
// render — every pixel belongs to the slide.

export default function RecapLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-black">{children}</div>;
}
