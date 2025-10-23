'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestPage() {
  const [status, setStatus] = useState('Iniciando...');
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setStatus('Testando conexão com Supabase...');

      const { data: { session: sess }, error: sessError } = await supabase.auth.getSession();
      if (sessError) {
        setError({ step: 'getSession', error: sessError });
      } else {
        setSession(sess);
        setStatus('Sessão obtida com sucesso!');
      }

      const { data, error: queryError } = await supabase
        .from('kpis_realtime')
        .select('*')
        .limit(1);

      if (queryError) {
        setError({ step: 'query', error: queryError });
        setStatus('Erro ao consultar dados');
      } else {
        setStatus('✅ Conexão OK! Dados: ' + JSON.stringify(data));
      }

    } catch (err: any) {
      setError({ step: 'catch', error: err.message });
      setStatus('❌ Erro: ' + err.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0B0F19',
      color: '#fff',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1f2e',
        border: '1px solid #2d3748',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{ fontSize: '24px', color: '#F5C742', marginBottom: '24px' }}>🧪 Teste de Conexão</h1>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Status:</p>
          <p style={{
            fontSize: '14px',
            background: '#0f1419',
            padding: '12px',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}>{status}</p>
        </div>

        {session && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Sessão:</p>
            <pre style={{
              fontSize: '12px',
              background: '#0f1419',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#ef4444', marginBottom: '8px' }}>Erro:</p>
            <pre style={{
              fontSize: '12px',
              background: '#7f1d1d',
              border: '1px solid #991b1b',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}

        <button
          onClick={testConnection}
          style={{
            background: '#F5C742',
            color: '#0B0F19',
            padding: '10px 20px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Testar Novamente
        </button>
      </div>
    </div>
  );
}
