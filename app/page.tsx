export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0B0F19 0%, #060810 100%)',
      color: '#F5C742',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px', fontWeight: 'bold' }}>
        Dashboard Águia
      </h1>
      <p style={{ fontSize: '24px', color: '#9ca3af', marginBottom: '40px' }}>
        Sistema Funcionando!
      </p>
      <div style={{
        background: 'rgba(245, 199, 66, 0.1)',
        border: '1px solid rgba(245, 199, 66, 0.3)',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '600px'
      }}>
        <p style={{ color: '#e5e7eb', marginBottom: '15px' }}>
          Você está vendo esta página de teste porque o servidor está funcionando.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          Acesse <a href="/login" style={{ color: '#F5C742', textDecoration: 'underline' }}>/login</a> para fazer login
        </p>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '10px' }}>
          Email: <strong style={{ color: '#e5e7eb' }}>yuricv89@hotmail.com</strong>
        </p>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          Senha: <strong style={{ color: '#e5e7eb' }}>senha123</strong>
        </p>
      </div>
    </div>
  );
}
