import { useState } from "react";
import { useAuth, API } from "../contexts/AuthContext";
import { Card, Btn, Input, Alert } from "../components/ui";

export default function Login() {
  const { onLogin } = useAuth();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

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
      </Card>
    </div>
  );
}
