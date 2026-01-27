import { redirect } from 'next/navigation';
import { validateToken, setSessionCookie } from '@/lib/auth';

export default function MenteeEntry({ params }: { params: { token: string } }) {
  const role = validateToken(params.token);
  
  if (role === 'mentee') {
    setSessionCookie('mentee');
    redirect('/app');
  }
  
  // Invalid token
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
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Invalid Link</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        This access link is not valid. Please ask your mentor for the correct link.
      </p>
    </main>
  );
}
