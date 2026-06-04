import { MoodGradientBg } from '@/components/mood/MoodGradientBg';

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return (
    <MoodGradientBg mood="neutral" className="-mb-36 pb-36">
      {children}
    </MoodGradientBg>
  );
}
