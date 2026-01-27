import { redirect } from 'next/navigation';
import { getCurrentRole } from '@/lib/auth';

export default function Home() {
  const role = getCurrentRole();
  
  if (role === 'mentor') {
    redirect('/mentor');
  } else if (role === 'mentee') {
    redirect('/app');
  }
  
  // Not logged in - show landing page
  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Quest Tracker</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '2rem' }}>
        A gamified journey to master digital skills and stay safe online.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Use your secret link to access the app.
      </p>
    </main>
  );
}
