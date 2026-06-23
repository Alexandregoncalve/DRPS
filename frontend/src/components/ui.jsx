// ============================================================
// Componentes UI reutilizáveis — NeXa DRPS
// ============================================================

export function BadgeRisco({ valor }) {
  const cores = {
    Baixo: "bg-green-100 text-green-800",
    Médio: "bg-yellow-100 text-yellow-800",
    Alto: "bg-orange-100 text-orange-800",
    Crítico: "bg-red-100 text-red-800",
    Pendente: "bg-gray-100 text-gray-500",
    processada: "bg-green-100 text-green-800",
    coletada: "bg-purple-100 text-purple-800",
    aberta: "bg-blue-100 text-blue-800",
    "Não avaliado": "bg-gray-100 text-gray-400",
    psicologo: "bg-purple-100 text-purple-800",
    admin: "bg-gray-100 text-gray-700",
    gestor_matriz: "bg-blue-100 text-blue-800",
    gestor_filial: "bg-amber-100 text-amber-800",
  };
  const labels = { processada: "✅ Processada", coletada: "✔ Coleta concluída", aberta: "Aberta", psicologo: "Psicólogo", admin: "Admin", gestor_matriz: "Gestor Matriz", gestor_filial: "Gestor Filial" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cores[valor] || "bg-gray-100 text-gray-500"}`}>
      {labels[valor] || valor}
    </span>
  );
}

export function BarraProgresso({ coletadas, total }) {
  const pct = total > 0 ? Math.min(100, (coletadas / total) * 100) : 0;
  const cor = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-yellow-400";
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{coletadas} responderam</span>
        <span>{total > 0 ? `${Math.round(pct)}%` : "sem limite"}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`${cor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>{children}</div>;
}

export function Btn({ children, onClick, variant = "primary", disabled = false, type = "button", className = "" }) {
  const v = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-blue-600 hover:underline",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 ${v[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Input({ label, ...props }) {
  return (
    <div>
      {label && <label className="text-xs text-gray-500 block mb-1">{label}</label>}
      <input {...props} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="text-xs text-gray-500 block mb-1">{label}</label>}
      <select {...props} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        {children}
      </select>
    </div>
  );
}

export function Alert({ children, type = "info" }) {
  const s = { info: "bg-blue-50 text-blue-800", error: "bg-red-50 text-red-700", success: "bg-green-50 text-green-800", warning: "bg-amber-50 text-amber-800" };
  return <div className={`rounded-lg p-3 text-sm mb-4 ${s[type]}`}>{children}</div>;
}
