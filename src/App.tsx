import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AIDetect from './pages/AIDetect';
import Humanize from './pages/Humanize';
import Plagiarism from './pages/Plagiarism';
import Paraphrase from './pages/Paraphrase';
import Reports from './pages/Reports';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/ai-detect" element={<AIDetect />} />
                <Route path="/humanize" element={<Humanize />} />
                <Route path="/plagiarism" element={<Plagiarism />} />
                <Route path="/paraphrase" element={<Paraphrase />} />
                <Route path="/reports" element={<Reports />} />
              </Route>
            </Routes>
          </Layout>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}
