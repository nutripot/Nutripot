import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { tokens } from '../../styles/tokens';
import { FormField } from '../../components/forms/FormField';
import { TextInput } from '../../components/forms/TextInput';
import { Button } from '../../components/ui/Button';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('innovativeden0@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: tokens.colors.slate[100],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing[4],
        fontFamily: tokens.typography.fontFamily.sans,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: tokens.borderRadius.lg,
          boxShadow: tokens.shadows.lg,
          border: `1px solid ${tokens.colors.slate[200]}`,
          padding: `${tokens.spacing[8]} ${tokens.spacing[6]}`,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: tokens.spacing[6] }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: tokens.borderRadius.md,
              backgroundColor: tokens.colors.primary[600],
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: tokens.typography.fontSize.xl,
              marginBottom: tokens.spacing[3],
            }}
          >
            B
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: tokens.typography.fontSize.xl,
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.slate[900],
            }}
          >
            BusinessHub Enterprise
          </h1>
          <p
            style={{
              margin: `${tokens.spacing[1]} 0 0`,
              fontSize: tokens.typography.fontSize.sm,
              color: tokens.colors.slate[500],
            }}
          >
            Sign in with authorized administrator credentials
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: tokens.colors.danger[50],
              border: `1px solid ${tokens.colors.danger[100]}`,
              color: tokens.colors.danger[700],
              padding: tokens.spacing[3],
              borderRadius: tokens.borderRadius.md,
              fontSize: tokens.typography.fontSize.sm,
              marginBottom: tokens.spacing[4],
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormField id="email" label="Email Address" required>
            <TextInput
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="innovativeden0@gmail.com"
            />
          </FormField>

          <FormField id="password" label="Master Password" required>
            <TextInput
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: tokens.spacing[2] }}
          >
            Sign In to Enterprise Workspace
          </Button>
        </form>

        <div
          style={{
            marginTop: tokens.spacing[6],
            paddingTop: tokens.spacing[4],
            borderTop: `1px solid ${tokens.colors.slate[100]}`,
            textAlign: 'center',
            fontSize: tokens.typography.fontSize.xs,
            color: tokens.colors.slate[400],
          }}
        >
          Protected by Cloudflare Edge & PBKDF2-SHA256 Cryptography
        </div>
      </div>
    </div>
  );
};
