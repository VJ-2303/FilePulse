import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import OrgTreePage from './pages/OrgTreePage';
import FileDetailPage from './pages/FileDetailPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/org" element={<OrgTreePage />} />
          <Route path="/files/:id" element={<FileDetailPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
