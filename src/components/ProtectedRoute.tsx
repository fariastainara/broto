import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import BrotoLoader from "./BrotoLoader";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useAuth();

  if (loading) {
    return <BrotoLoader label="Preparando seu espaço" />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
