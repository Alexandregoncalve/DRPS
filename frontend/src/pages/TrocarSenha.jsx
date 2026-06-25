import { useState } from "react";
import { useAuth, API } from "../contexts/AuthContext";
import { Card, Btn, Alert } from "../components/ui";

const REQUISITOS = [
  { regex: /.{8,}/,      label: "Mínimo 8 caracteres" },
  { regex: /[A-Z]/,      label: "Uma letra maiúscula" },
  { regex: /[a-z]/,      label: "Uma letra minúscula" },
  { regex: /[0-9]/,      label: "Um número" },
  { regex: /[^A-Za-z0-9]/, label: "Um caractere especial (! @ # $ %)" },
];

function CampoSenha({ label, value, onChange, autoComplete }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={ver ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
        />
        <button
          type="button"
          onClick={() => setVer(v => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:underline px-1"
        >
          {ver ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}

export default function TrocarSenha() {
  const { token, usuario, onLogin, logout } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha,  setNovaSenha]  = useState("");
  const [confirmar,  setConfirmar]  = useState("");
  const [erro,       setErro]       = useState("");
  const [loading,    setLoading]    = useState(false);

  const req      = REQUISITOS.map(r => r.regex.test(novaSenha));
  const todosOk  = req.every(Boolean);
  const iguais   = novaSenha && novaSenha === confirmar;

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    if (!todosOk)  { setErro("A senha não atende aos requisitos mínimos."); return; }
    if (!iguais)   { setErro("As senhas não coincidem."); return; }
    if (!senhaAtual.trim()) { setErro("Digite a senha atual."); return; }

    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/trocar-senha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ senhaAtual: senhaAtual.trim(), novaSenha }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erro || "Erro ao trocar senha");
      onLogin(token, { ...usuario, precisa_trocar_senha: false });
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 w-full max-w-sm shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Defina sua senha</h1>
          <p className="text-sm text-gray-400 mt-1">
            Por segurança, troque sua senha temporária antes de continuar.
          </p>
          {/* Mostra o email para o usuário saber qual conta está alterando */}
          {usuario?.email && (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-600 font-medium">
                Alterando senha de: <span className="font-bold">{usuario.email}</span>
              </p>
              <p className="text-xs text-blue-400 mt-0.5">
                A senha temporária foi definida pelo administrador
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CampoSenha
            label="Senha atual (temporária)"
            value={senhaAtual}
            onChange={e => setSenhaAtual(e.target.value)}
            autoComplete="current-password"
          />
          <CampoSenha
            label="Nova senha"
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            autoComplete="new-password"
          />
          <CampoSenha
            label="Confirmar nova senha"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            autoComplete="new-password"
          />

          {/* Requisitos */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            {REQUISITOS.map((r, i) => (
              <div key={i} className={`text-xs flex items-center gap-2 ${req[i] ? "text-green-600" : "text-gray-400"}`}>
                <span>{req[i] ? "✓" : "○"}</span>
                <span>{r.label}</span>
              </div>
            ))}
            {confirmar && (
              <div className={`text-xs flex items-center gap-2 ${iguais ? "text-green-600" : "text-red-400"}`}>
                <span>{iguais ? "✓" : "○"}</span>
                <span>Senhas coincidem</span>
              </div>
            )}
          </div>

          {erro && <Alert type="error">{erro}</Alert>}

          <Btn
            type="submit"
            disabled={loading || !todosOk || !iguais || !senhaAtual}
            className="w-full justify-center"
          >
            {loading ? "Salvando..." : "Definir nova senha"}
          </Btn>

          <button
            type="button"
            onClick={logout}
            className="text-xs text-gray-400 hover:text-gray-600 w-full text-center"
          >
            Sair
          </button>
        </form>
      </Card>
    </div>
  );
}
