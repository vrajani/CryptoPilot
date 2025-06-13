import { AppProvider } from '@/contexts/AppContext';
import MainDashboardContent from '@/components/dashboard/MainDashboardContent';

export default function Home() {
  return (
    <AppProvider>
      <main className="flex-1">
        <MainDashboardContent />
      </main>
    </AppProvider>
  );
}
