import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { AuthGuard, RegistrationGuard } from './components/AuthGuard';
import { SplashIntro } from './components/SplashIntro';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DrugstoreProfile from './pages/DrugstoreProfile';
import PopList from './pages/PopList';
import PopEditor from './pages/PopEditor';
import Forms from './pages/Forms';
import Anamnese from './pages/Anamnese';
import Prescription from './pages/Prescription';
import Donation from './pages/Donation';
import PharmacyServices from './pages/PharmacyServices';
import SettingsPage from './pages/Settings';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <BrowserRouter>
      {showSplash && <SplashIntro onComplete={() => setShowSplash(false)} />}
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

            <Route path="/anamnesis" element={
              <AuthGuard>
                <RegistrationGuard>
                  <Anamnese />
                </RegistrationGuard>
              </AuthGuard>
            } />

            <Route path="/prescription" element={
              <AuthGuard>
                <RegistrationGuard>
                  <Prescription />
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

            <Route path="/services" element={
              <AuthGuard>
                <RegistrationGuard>
                  <PharmacyServices />
                </RegistrationGuard>
              </AuthGuard>
            } />

            <Route path="/support" element={
              <AuthGuard>
                <RegistrationGuard>
                  <Donation />
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

            <Route path="/settings" element={
              <AuthGuard>
                <RegistrationGuard>
                  <SettingsPage />
                </RegistrationGuard>
              </AuthGuard>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
