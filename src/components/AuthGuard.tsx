import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const RegistrationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { drugstore, loading } = useAuth();

  if (loading) return null;

  if (!drugstore) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
