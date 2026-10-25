import { Navigate } from 'react-router-dom';

// The courier desk now lives inside the courier dashboard.
export default function CourierDesk() {
  return <Navigate to="/courier/dashboard/pickup" replace />;
}
