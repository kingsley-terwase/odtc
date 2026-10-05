import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Book from './pages/Book';
import Confirmation from './pages/Confirmation';
import About from './pages/About';
import { AdminShell, RequireAdmin } from './admin/AuthContext';
import AdminLogin from './admin/Login';
import Dashboard from './pages/admin/Dashboard';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Book />} />
          <Route path="/confirmation/:ref" element={<Confirmation />} />
          <Route path="/about" element={<About />} />
        </Route>

        <Route path="/admin" element={<AdminShell />}>
          <Route path="login" element={<AdminLogin />} />
          <Route index element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        </Route>

        <Route path="*" element={<Layout />}>
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </>
  );
}