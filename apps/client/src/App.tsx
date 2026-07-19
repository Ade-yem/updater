import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DigestProvider } from './contexts/DigestContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DigestTodayPage } from './pages/DigestTodayPage';
import { DigestHistoryPage } from './pages/DigestHistoryPage';
import { DigestDetailPage } from './pages/DigestDetailPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DigestProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/digest/today" element={<DigestTodayPage />} />
                <Route path="/digest/history" element={<DigestHistoryPage />} />
                <Route path="/digest/history/:id" element={<DigestDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/digest/today" replace />} />
          </Routes>
        </DigestProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
