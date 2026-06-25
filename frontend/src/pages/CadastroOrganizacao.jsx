import { useState } from "react";
import { API } from "../contexts/AuthContext";
import { Card, Input, Btn, Alert } from "../components/ui";

export default function CadastroOrganizacao({ onVoltar }) {
  const [form, setForm] = useState({
    nome_org: "", nome_responsavel: "", email: "", senha: "", confirmar_senha: "", telefone: ""
  });
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailDisponivel, setEmailDisponivel] = useState(null);

  async function verificarEmail(email) {
    if (!email || !email.includes("@")) return;
    try {
      const r = await fetch(`${API}/organizacoes/verificar-email?email=${encodeURIComponent(email)}`);
      const d = await r.json();
      setEmailDisponivel(d.disponivel);
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(""); setSucesso("");

    if (form.senha !== form.confirmar_senha) {
      return setErro("As senhas não coincidem");
    }
    if (emailDisponivel === false) {
      return setErro("Este e-mail já está cadastrado");
    }

    setLoading(true);
    try {
      const r = await fetch(`${API}/organizacoes/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_org: form.nome_org,
          nome_responsavel: form.nome_responsavel,
          email: form.email,
          senha: form.senha,
          telefone: form.telefone
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro);
      setSucesso(d.mensagem);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (sucesso) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="p-8 w-full max-w-sm shadow-sm text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Cadastro realizado!</h2>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{sucesso}</p>
        <Btn onClick={onVoltar} className="w-full justify-center">
          Fazer login agora →
        </Btn>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="p-8 w-full max-w-md shadow-sm">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Criar conta</h1>
          <p className="text-sm text-gray-400 mt-1">
            Diagnóstico de Riscos Psicossociais — NR-01
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ORGANIZAÇÃO */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sua organização</p>
            <Input
              label="Nome da organização / consultoria *"
              required
              placeholder="Ex: NeXa Psicossocial, RH Consultoria Ltda"
              value={form.nome_org}
              onChange={e => setForm({ ...form, nome_org: e.target.value })}
            />
          </div>

          {/* RESPONSÁVEL */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Responsável</p>
            <div className="space-y-3">
              <Input
                label="Nome completo *"
                required
                placeholder="Ex: Ana Paula Silva"
                value={form.nome_responsavel}
                onChange={e => setForm({ ...form, nome_responsavel: e.target.value })}
              />
              <div>
                <Input
                  label="E-mail *"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={e => { setForm({ ...form, email: e.target.value }); setEmailDisponivel(null); }}
                  onBlur={e => verificarEmail(e.target.value)}
                />
                {emailDisponivel === false && (
                  <p className="text-xs text-red-500 mt-1">❌ Este e-mail já está cadastrado</p>
                )}
                {emailDisponivel === true && (
                  <p className="text-xs text-green-600 mt-1">✅ E-mail disponível</p>
                )}
              </div>
              <Input
                label="Telefone / WhatsApp (opcional)"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={e => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
          </div>

          {/* SENHA */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Senha de acesso</p>
            <div className="space-y-3">
              <Input
                label="Senha *"
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={form.senha}
                onChange={e => setForm({ ...form, senha: e.target.value })}
              />
              <Input
                label="Confirmar senha *"
                type="password"
                required
                placeholder="Repita a senha"
                value={form.confirmar_senha}
                onChange={e => setForm({ ...form, confirmar_senha: e.target.value })}
              />
              <p className="text-xs text-gray-400">
                A senha deve ter: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo
              </p>
            </div>
          </div>

          {erro && <Alert type="error">{erro}</Alert>}

          <Btn type="submit" disabled={loading || emailDisponivel === false} className="w-full justify-center">
            {loading ? "Criando conta..." : "Criar conta gratuitamente →"}
          </Btn>

          <p className="text-center text-sm text-gray-400">
            Já tem conta?{" "}
            <button type="button" onClick={onVoltar} className="text-blue-600 hover:underline">
              Fazer login
            </button>
          </p>
        </form>
      </Card>
    </div>
  );
}
