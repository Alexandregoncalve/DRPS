// App.jsx
import { useAuth, AuthProvider }               from "./contexts/AuthContext";
import { SuperAdminProvider }                   from "./contexts/SuperAdminContext";
import SuperAdminApp                            from "./pages/superadmin/index";
import Login                                    from "./pages/Login";
import Formulario                               from "./pages/Formulario";
import TrocarSenha                              from "./pages/TrocarSenha";
import DashboardGestor                          from "./pages/gestor/Dashboard";
import PainelPrincipal                          from "./pages/psicologo/Painel";

function Router() {
  const { token, usuario } = useAuth();
  const path = window.location.pathname;

  // ── Rota pública: formulário anônimo ──────────────────────────────
  const matchForm = path.match(/^\/responder\/([a-f0-9]{64})$/);
  if (matchForm) return <Formulario token={matchForm[1]} />;

  // ── Rota Super Admin (path começa com /superadmin) ─────────────────
  // Isolado do AuthContext normal — usa SuperAdminContext próprio
  if (path.startsWith('/superadmin')) {
    return (
      <SuperAdminProvider>
        <SuperAdminApp />
      </SuperAdminProvider>
    );
  }

  // ── Rotas autenticadas normais ────────────────────────────────────
  if (!token || !usuario) return <Login />;

  // Bloqueia super admin de usar o painel normal
  if (usuario.papel === 'superadmin') {
    window.location.href = '/superadmin';
    return null;
  }

  // Força troca de senha no primeiro login
  if (usuario.precisa_trocar_senha) return <TrocarSenha />;

  const isGestor = ['gestor_matriz', 'gestor_filial'].includes(usuario.papel);
  return isGestor ? <DashboardGestor /> : <PainelPrincipal />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
