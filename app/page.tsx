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
      <div style={{ 
        fontSize: '5rem', 
        marginBottom: '1rem',
        animation: 'pulse 2s ease-in-out infinite'
      }}>⚡</div>
      <h1 style={{ 
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '3rem', 
        marginBottom: '0.5rem',
        background: 'linear-gradient(90deg, #00d4ff, #ff0080)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        CyberQuest
      </h1>
      <p style={{ 
        color: 'var(--text-secondary)', 
        maxWidth: '400px', 
        marginBottom: '2rem',
        fontSize: '1.1rem'
      }}>
        Level up your digital skills. Earn XP. Become a legend.
      </p>
      <div style={{ 
        padding: '1rem 2rem',
        background: 'rgba(0, 212, 255, 0.1)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '8px',
        color: 'var(--text-muted)',
        fontSize: '0.9rem'
      }}>
        🔐 Use your secret link to enter
      </div>
    </main>
  );
}
