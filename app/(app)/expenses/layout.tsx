import { MoodGradientBg } from '@/components/mood/MoodGradientBg';

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return <MoodGradientBg mood="neutral">{children}</MoodGradientBg>;
}
