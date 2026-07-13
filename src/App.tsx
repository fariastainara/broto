import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Diary from "./pages/Diary";
import GoalsChallenges from "./pages/GoalsChallenges";
import Tasks from "./pages/Tasks";
import Studies from "./pages/Studies";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="diario" element={<Diary />} />
            <Route path="metas" element={<GoalsChallenges />} />
            <Route path="estudos" element={<Studies />} />
            <Route path="tarefas" element={<Tasks />} />
            <Route path="perfil" element={<Profile />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
