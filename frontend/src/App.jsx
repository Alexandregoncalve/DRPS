import { useAuth, AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Formulario from "./pages/Formulario";
import TrocarSenha from "./pages/TrocarSenha";
import DashboardGestor from "./pages/gestor/Dashboard";
import PainelPrincipal from "./pages/psicologo/Painel";

function Router() {
  const { token, usuario } = useAuth();

  // Rota pública: formulário anônimo
  const match = window.location.pathname.match(/^\/responder\/([a-f0-9]{64})$/);
  if (match) return <Formulario token={match[1]} />;

  if (!token || !usuario) return <Login />;

  // Força troca de senha no primeiro login
  if (usuario.precisa_trocar_senha) return <TrocarSenha />;

  const isGestor = ["gestor_matriz", "gestor_filial"].includes(usuario.papel);
  return isGestor ? <DashboardGestor /> : <PainelPrincipal />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
