import { useState } from "react";
import { useAuth, API } from "../contexts/AuthContext";
import { Card, Btn, Alert } from "../components/ui";
import CadastroOrganizacao from "./CadastroOrganizacao";

export default function Login() {
  const { onLogin } = useAuth();
  const [email,       setEmail]       = useState("");
  const [senha,       setSenha]       = useState("");
  const [verSenha,    setVerSenha]    = useState(false);
  const [erro,        setErro]        = useState("");
  const [loading,     setLoading]     = useState(false);
  const [cadastrando, setCadastrando] = useState(false);

  if (cadastrando) return <CadastroOrganizacao onVoltar={() => setCadastrando(false)} />;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setErro("");
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), senha }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erro);
      onLogin(data.token, data.usuario);
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
          <h1 className="text-xl font-semibold text-gray-900">NeXa</h1>
          <p className="text-sm text-gray-400">Diagnóstico de Riscos Psicossociais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">

          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="seu@email.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Senha com mostrar/ocultar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <input
                type={verSenha ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
              />
              <button
                type="button"
                onClick={() => setVerSenha(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:underline px-1"
              >
                {verSenha ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {erro && <Alert type="error">{erro}</Alert>}

          <Btn type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Entrando..." : "Entrar"}
          </Btn>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400 mb-2">Ainda não tem conta?</p>
          <button
            onClick={() => setCadastrando(true)}
            className="text-sm text-blue-600 hover:underline font-medium">
            Criar conta gratuitamente →
          </button>
        </div>
      </Card>
    </div>
  );
}
