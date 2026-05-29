import { MoodGradientBg } from '@/components/mood/MoodGradientBg';

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return (
    <MoodGradientBg mood="neutral" className="-mb-28 pb-28">
      {children}
    </MoodGradientBg>
  );
}
