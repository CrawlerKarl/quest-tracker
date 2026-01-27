import { redirect } from 'next/navigation';
import { getCurrentRole } from '@/lib/auth';

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  const role = getCurrentRole();
  
  if (role !== 'mentor') {
    redirect('/');
  }
  
  return <>{children}</>;
}
