import React from 'react';
import { useRoutes } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { routes } from './routes';

export const App: React.FC = () => {
  const element = useRoutes(routes);

  return <AuthProvider>{element}</AuthProvider>;
};
