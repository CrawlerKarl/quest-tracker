import { redirect } from 'next/navigation';
import { getCurrentRole } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const role = getCurrentRole();
  
  if (role !== 'mentee') {
    redirect('/');
  }
  
  return <>{children}</>;
}
