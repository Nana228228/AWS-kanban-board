interface LoadingProps {
  message?: string;
}

function Loading({ message = 'Carregando...' }: LoadingProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '4px solid #e0e0e0',
          borderTopColor: '#1976d2',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ marginTop: '12px', color: '#666', fontSize: '14px' }}>{message}</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Loading;
