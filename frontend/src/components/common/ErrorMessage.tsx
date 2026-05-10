interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        backgroundColor: '#ffebee',
        border: '1px solid #ef9a9a',
        borderRadius: '4px',
        padding: '12px 16px',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ color: '#c62828', fontSize: '14px' }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Fechar mensagem de erro"
          style={{
            border: 'none',
            background: 'none',
            color: '#c62828',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
