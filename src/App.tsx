import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import AIDetect from './pages/AIDetect';
import Humanize from './pages/Humanize';
import Plagiarism from './pages/Plagiarism';
import Paraphrase from './pages/Paraphrase';
import Reports from './pages/Reports';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ai-detect" element={<AIDetect />} />
          <Route path="/humanize" element={<Humanize />} />
          <Route path="/plagiarism" element={<Plagiarism />} />
          <Route path="/paraphrase" element={<Paraphrase />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </Router>
  );
}
