import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useInRouterContext, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Book from './pages/Book';
import Confirmation from './pages/Confirmation';
import About from './pages/About';
import { AdminShell, RequireAdmin } from './admin/AuthContext';
import Dashboard from './pages/admin/Dashboard';
import { RateProvider } from './useRate';
import { ClientProvider, RequireClient } from './client/ClientAuth';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import VerifyEmail from './pages/auth/VerifyEmail';
import { ForgotPassword, ResetPassword } from './pages/auth/Recover';
import ClientApp from './pages/client/ClientApp';
import Track from './pages/Track';
import Courier from './pages/Courier';
import CourierDesk from './pages/CourierDesk';
import CourierApp from './pages/courier/CourierApp';
import Crisp from './components/Crisp';
import { Splash } from './components/AppLoader';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <RateProvider>
      <ClientProvider>
      <Splash />
      <ScrollTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Crisp><Book /></Crisp>} />
          <Route path="/confirmation" element={<Crisp><Confirmation /></Crisp>} />
          <Route path="/confirmation/:ref" element={<Confirmation />} />
          <Route path="/about" element={<About />} />
          <Route path="/track" element={<Crisp><Track /></Crisp>} />
          <Route path="/track/:ref" element={<Crisp><Track /></Crisp>} />
          <Route path="/courier" element={<Crisp><Courier /></Crisp>} />
          <Route path="/courier/desk" element={<CourierDesk />} />
        </Route>

        <Route path="/courier/dashboard" element={<RequireClient role="COURIER"><CourierApp /></RequireClient>} />
        <Route path="/courier/dashboard/:tab" element={<RequireClient role="COURIER"><CourierApp /></RequireClient>} />
        <Route path="/account" element={<RequireClient role="CLIENT"><ClientApp /></RequireClient>} />
        <Route path="/account/:tab" element={<RequireClient role="CLIENT"><ClientApp /></RequireClient>} />
        <Route path="/signin" element={<Crisp><SignIn /></Crisp>} />
        <Route path="/signup" element={<Crisp><SignUp /></Crisp>} />
        <Route path="/verify-email" element={<Crisp><VerifyEmail /></Crisp>} />
        <Route path="/forgot-password" element={<Crisp><ForgotPassword /></Crisp>} />
        <Route path="/reset-password" element={<Crisp><ResetPassword /></Crisp>} />

        <Route path="/admin" element={<AdminShell />}>
          <Route path="login" element={<Navigate to="/signin" replace state={{ from: '/admin' }} />} />
          <Route index element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        </Route>

        <Route path="*" element={<Layout />}>
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
      </ClientProvider>
    </RateProvider>
  );
}

export default function App() {
  const inRouter = useInRouterContext();
  return inRouter ? <AppRoutes /> : <BrowserRouter><AppRoutes /></BrowserRouter>;
}