import { useState } from "react";
import { useAuth, API } from "../contexts/AuthContext";
import { Card, Btn, Input, Alert } from "../components/ui";
import CadastroOrganizacao from "./CadastroOrganizacao";

export default function Login() {
  const { onLogin } = useAuth();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);

  if (cadastrando) return <CadastroOrganizacao onVoltar={() => setCadastrando(false)} />;

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setErro("");
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erro);
      onLogin(data.token, data.usuario);
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 w-full max-w-sm shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">NeXa</h1>
          <p className="text-sm text-gray-400">Diagnóstico de Riscos Psicossociais</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="E-mail" type="email" required placeholder="seu@email.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Senha" type="password" required placeholder="••••••••"
            value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} />
          {erro && <Alert type="error">{erro}</Alert>}
          <Btn type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Entrando..." : "Entrar"}
          </Btn>
        </form>

        {/* LINK CRIAR CONTA */}
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
