export default function InvalidLink() {
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
        This access link is not valid. Please check with your mentor for the correct link.
      </p>
    </main>
  );
}