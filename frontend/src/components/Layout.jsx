import { useAuth } from "../contexts/AuthContext";
import { Btn } from "./ui";

const PAPEL_LABEL = { admin: "Admin NeXa", psicologo: "Psicólogo", gestor_matriz: "Gestor Matriz", gestor_filial: "Gestor Filial" };

export function Layout({ titulo, subtitulo, acoes, children }) {
  const { usuario, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900 text-sm">NeXa DRPS</h1>
              {titulo && <><span className="text-gray-300">·</span><span className="text-sm text-gray-600">{titulo}</span></>}
            </div>
            {subtitulo && <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>}
          </div>
          <div className="flex items-center gap-3">
            {acoes}
            <div className="text-right">
              <p className="text-xs font-medium text-gray-700">{usuario?.nome}</p>
              <p className="text-xs text-gray-400">{PAPEL_LABEL[usuario?.papel] || usuario?.papel}</p>
            </div>
            <Btn variant="ghost" onClick={logout} className="text-gray-400 text-xs">Sair</Btn>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
