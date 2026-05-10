import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { AuthGuard, RegistrationGuard } from './components/AuthGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DrugstoreProfile from './pages/DrugstoreProfile';
import PopList from './pages/PopList';
import PopEditor from './pages/PopEditor';
import Forms from './pages/Forms';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <AuthGuard>
                <RegistrationGuard>
                  <Dashboard />
                </RegistrationGuard>
              </AuthGuard>
            } />

            <Route path="/pops" element={
              <AuthGuard>
                <RegistrationGuard>
                  <PopList />
                </RegistrationGuard>
              </AuthGuard>
            } />

            <Route path="/forms" element={
              <AuthGuard>
                <RegistrationGuard>
                  <Forms />
                </RegistrationGuard>
              </AuthGuard>
            } />

            <Route path="/pops/new" element={
              <AuthGuard>
                <RegistrationGuard>
                  <PopEditor />
                </RegistrationGuard>
              </AuthGuard>
            } />

            <Route path="/pops/edit/:id" element={
              <AuthGuard>
                <RegistrationGuard>
                  <PopEditor />
                </RegistrationGuard>
              </AuthGuard>
            } />

            <Route path="/profile" element={
              <AuthGuard>
                <DrugstoreProfile />
              </AuthGuard>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
