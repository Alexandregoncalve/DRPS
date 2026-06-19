import { useState } from "react";
import { useAuth, API } from "../contexts/AuthContext";
import { Card, Btn, Input, Alert } from "../components/ui";

const REQUISITOS = [
  { regex: /.{8,}/, label: "Mínimo 8 caracteres" },
  { regex: /[A-Z]/, label: "Uma letra maiúscula" },
  { regex: /[a-z]/, label: "Uma letra minúscula" },
  { regex: /[0-9]/, label: "Um número" },
  { regex: /[^A-Za-z0-9]/, label: "Um caractere especial (! @ # $ %)" },
];

export default function TrocarSenha() {
  const { token, usuario, onLogin, logout } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const requisitosCumpridos = REQUISITOS.map(r => r.regex.test(novaSenha));
  const todosOk = requisitosCumpridos.every(Boolean);
  const senhasIguais = novaSenha && novaSenha === confirmar;

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    if (!todosOk) { setErro("A senha não atende aos requisitos mínimos."); return; }
    if (!senhasIguais) { setErro("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/trocar-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erro);
      // Atualiza o usuário local removendo a flag
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
          <p className="text-sm text-gray-400">Por segurança, troque sua senha temporária antes de continuar.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Senha atual (temporária)" type="password" required
            value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
          <Input label="Nova senha" type="password" required
            value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
          <Input label="Confirmar nova senha" type="password" required
            value={confirmar} onChange={e => setConfirmar(e.target.value)} />

          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            {REQUISITOS.map((r, i) => (
              <div key={i} className={`text-xs flex items-center gap-2 ${requisitosCumpridos[i] ? "text-green-600" : "text-gray-400"}`}>
                <span>{requisitosCumpridos[i] ? "✓" : "○"}</span>
                <span>{r.label}</span>
              </div>
            ))}
            {confirmar && (
              <div className={`text-xs flex items-center gap-2 ${senhasIguais ? "text-green-600" : "text-gray-400"}`}>
                <span>{senhasIguais ? "✓" : "○"}</span>
                <span>Senhas coincidem</span>
              </div>
            )}
          </div>

          {erro && <Alert type="error">{erro}</Alert>}
          <Btn type="submit" disabled={loading || !todosOk || !senhasIguais} className="w-full justify-center">
            {loading ? "Salvando..." : "Definir nova senha"}
          </Btn>
          <button type="button" onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center">
            Sair
          </button>
        </form>
      </Card>
    </div>
  );
}
