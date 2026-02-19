import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import DistributorsPage from './pages/DistributorsPage';
import ContactPage from './pages/ContactPage';
import ProductsPage from './pages/ProductsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/nosotros" element={<AboutPage />} />
        <Route path="/distribuidores" element={<DistributorsPage />} />
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/productos" element={<ProductsPage />} />

        {/* Placeholders - reusing Home for now, but should have their own intro pages */}
        <Route path="/spaces" element={<HomePage />} />
        <Route path="/deco" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
