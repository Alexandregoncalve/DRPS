import { useState, useEffect } from "react";
import { useAuth, API } from "../../contexts/AuthContext";
import { Layout } from "../../components/Layout";
import { Card, Btn, BadgeRisco, BarraProgresso, Alert, Input, Select } from "../../components/ui";

export default function PainelPrincipal() {
  const { token, usuario } = useAuth();
  const isAdmin = usuario.papel === "admin";
  const [view, setView] = useState("avaliacoes");
  const [empresas, setEmpresas] = useState([]);
  const [empresasTodas, setEmpresasTodas] = useState([]);
  const [setores, setSetores] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [avalSelecionada, setAvalSelecionada] = useState(null);
  const [resultados, setResultados] = useState(null);
  const [probabilidades, setProbabilidades] = useState({});
  const [msg, setMsg] = useState(""); const [erro, setErro] = useState("");
  const [novaEmp, setNovaEmp] = useState({ nome:"", cnpj:"", total_funcionarios:"", tipo:"matriz", matriz_id:"" });
  const [novoSetor, setNovoSetor] = useState({ nome:"", total_funcionarios:"" });
  const [adicionandoSetor, setAdicionandoSetor] = useState(false);
  const [novaAval, setNovaAval] = useState({ empresa_id:"", setor_id:"", data_fim:"" });
  const [novoUsr, setNovoUsr] = useState({ nome:"", email:"", senha:"", papel:"gestor_matriz", crp:"", empresa_vinculada_id:"" });
  const [empresaSel, setEmpresaSel] = useState(null);

  const headers = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    const [eR, aR, etR] = await Promise.all([fetch(`${API}/empresas`,{headers}), fetch(`${API}/avaliacoes`,{headers}), fetch(`${API}/empresas/todas`,{headers})]);
    const [emps, avals, empsT] = await Promise.all([eR.json(), aR.json(), etR.json()]);
    setEmpresas(Array.isArray(emps)?emps:[]);
    setEmpresasTodas(Array.isArray(empsT)?empsT:[]);
    setAvaliacoes(Array.isArray(avals)?avals:[]);
    if (isAdmin) { const uR = await fetch(`${API}/usuarios`,{headers}); setUsuarios(await uR.json()); }
  }

  async function carregarSetores(id) {
    if (!id) return setSetores([]);
    const r = await fetch(`${API}/empresas/${id}/setores`,{headers});
    setSetores(await r.json());
  }

  function fmtCNPJ(v) {
    v=v.replace(/\D/g,'');
    if(v.length<=14) v=v.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
    return v;
  }

  async function criarEmpresa(e) {
    e.preventDefault(); setErro("");
    const r = await fetch(`${API}/empresas`,{method:"POST",headers,body:JSON.stringify(novaEmp)});
    const d = await r.json();
    if (!r.ok) { setErro(d.erro); return; }
    setMsg(`✅ ${novaEmp.tipo==="filial"?"Filial":"Empresa"} "${novaEmp.nome}" criada!`);
    setNovaEmp({nome:"",cnpj:"",total_funcionarios:"",tipo:"matriz",matriz_id:""});
    setEmpresaSel(null); carregarTudo(); setView("empresas");
  }

  async function adicionarSetor(e) {
    e.preventDefault();
    if (!novaAval.empresa_id) return;
    await fetch(`${API}/empresas/setores`,{method:"POST",headers,body:JSON.stringify({...novoSetor,empresa_id:novaAval.empresa_id})});
    setNovoSetor({nome:"",total_funcionarios:""}); setAdicionandoSetor(false);
    carregarSetores(novaAval.empresa_id);
  }

  async function criarAvaliacao(e) {
    e.preventDefault(); setErro("");
    const r = await fetch(`${API}/avaliacoes`,{method:"POST",headers,body:JSON.stringify(novaAval)});
    const d = await r.json();
    if (!r.ok) { setErro(d.erro); return; }
    setMsg(`✅ Avaliação criada!\n🔗 ${d.link_anonimo}`);
    setNovaAval({empresa_id:"",setor_id:"",data_fim:""}); carregarTudo(); setView("avaliacoes");
  }

  async function criarUsuario(e) {
    e.preventDefault(); setErro("");
    const r = await fetch(`${API}/usuarios`,{method:"POST",headers,body:JSON.stringify(novoUsr)});
    const d = await r.json();
    if (!r.ok) { setErro(d.erro); return; }
    setMsg(`✅ Usuário "${novoUsr.nome}" criado!`);
    setNovoUsr({nome:"",email:"",senha:"",papel:"gestor_matriz",crp:"",empresa_vinculada_id:""});
    carregarTudo(); setView("usuarios");
  }

  async function verResultados(aval) {
    setAvalSelecionada(aval);
    const r = await fetch(`${API}/avaliacoes/${aval.id}/resultados`,{headers});
    const d = await r.json(); setResultados(d);
    const p={}; d.resultados.forEach(x=>{ p[x.topico_num]=x.media_probabilidade||2; }); setProbabilidades(p);
    setView("resultados");
  }

  async function salvarProbabilidades() {
    const probs=Object.entries(probabilidades).map(([t,v])=>({topico_num:parseInt(t),valor:parseInt(v)}));
    await fetch(`${API}/avaliacoes/${avalSelecionada.id}/probabilidades`,{method:"POST",headers,body:JSON.stringify({probabilidades:probs})});
    await fetch(`${API}/avaliacoes/${avalSelecionada.id}/processar`,{method:"POST",headers});
    const r=await fetch(`${API}/avaliacoes/${avalSelecionada.id}/resultados`,{headers});
    setResultados(await r.json()); setMsg("✅ Matriz processada!");
  }

  // ---- VIEW: RESULTADOS ----
  if (view==="resultados" && avalSelecionada && resultados) return (
    <Layout titulo="Resultados" subtitulo={`${avalSelecionada.setor_nome} · ${avalSelecionada.empresa_nome}`}
      acoes={<Btn variant="secondary" onClick={()=>setView("avaliacoes")}>← Voltar</Btn>}>
      {msg && <Alert type="success">{msg}</Alert>}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(resultados.contagem).map(([k,v])=>(
          <Card key={k} className="p-4 text-center"><p className="text-2xl font-semibold text-gray-900">{v}</p><p className="text-xs text-gray-400 mt-1">{k}</p></Card>
        ))}
      </div>
      <Card className="overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Tópico</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium">Gravidade</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium">Prob.</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium">Matriz</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium w-28">Definir prob.</th>
          </tr></thead>
          <tbody>
            {resultados.resultados.map(r=>(
              <tr key={r.topico_num} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-700">{r.topico_nome}</td>
                <td className="px-4 py-3 text-center"><BadgeRisco valor={r.classif_gravidade}/></td>
                <td className="px-4 py-3 text-center"><BadgeRisco valor={r.classif_probabilidade}/></td>
                <td className="px-4 py-3 text-center"><BadgeRisco valor={r.matriz_risco}/></td>
                <td className="px-4 py-3 text-center">
                  <select value={probabilidades[r.topico_num]||2}
                    onChange={ev=>setProbabilidades({...probabilidades,[r.topico_num]:ev.target.value})}
                    className="border border-gray-200 rounded px-2 py-1 text-xs">
                    <option value={1}>1 - Baixa</option><option value={2}>2 - Média</option><option value={3}>3 - Alta</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Btn onClick={salvarProbabilidades}>Salvar e processar matriz</Btn>
    </Layout>
  );

  return (
    <Layout titulo={isAdmin?"Admin":"Psicólogo"} subtitulo={usuario.crp||""}
      acoes={
        <div className="flex gap-2">
          <Btn variant={view==="avaliacoes"?"primary":"secondary"} onClick={()=>setView("avaliacoes")}>Avaliações</Btn>
          <Btn variant={view==="empresas"?"primary":"secondary"} onClick={()=>setView("empresas")}>Empresas</Btn>
          {isAdmin && <Btn variant={view==="usuarios"?"primary":"secondary"} onClick={()=>setView("usuarios")}>Usuários</Btn>}
        </div>
      }>

      {msg && <Alert type="success" >{msg}</Alert>}
      {erro && <Alert type="error">{erro}</Alert>}

      {/* AVALIAÇÕES */}
      {view==="avaliacoes" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-900 text-sm">Avaliações</h2>
            <Btn onClick={()=>setView("nova")}>+ Nova avaliação</Btn>
          </div>
          <div className="space-y-3">
            {avaliacoes.length===0 ? <Card className="p-6 text-sm text-gray-400">Nenhuma avaliação.</Card>
              : avaliacoes.map(a=>(
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.empresa_nome} · {a.setor_nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(a.criado_em).toLocaleDateString("pt-BR")} · <BadgeRisco valor={a.status}/></p>
                    </div>
                    <Btn variant="ghost" onClick={()=>verResultados(a)} className="text-xs">Ver resultados</Btn>
                  </div>
                  <BarraProgresso coletadas={parseInt(a.respostas_coletadas)||0} total={parseInt(a.setor_total_funcionarios)||0}/>
                </Card>
              ))
            }
          </div>
        </div>
      )}

      {/* EMPRESAS */}
      {view==="empresas" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-900 text-sm">Empresas</h2>
            <Btn onClick={()=>{ setNovaEmp({nome:"",cnpj:"",total_funcionarios:"",tipo:"matriz",matriz_id:""}); setEmpresaSel(null); setView("cadastrar_empresa"); }}>+ Nova empresa</Btn>
          </div>
          <div className="space-y-3">
            {empresas.length===0 ? <Card className="p-6 text-sm text-gray-400">Nenhuma empresa.</Card>
              : empresas.map(emp=>(
                <Card key={emp.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{emp.nome}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Matriz</span>
                        {emp.total_filiais>0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{emp.total_filiais} filial(is)</span>}
                      </div>
                      {emp.cnpj && <p className="text-xs text-gray-400">{emp.cnpj}</p>}
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span>{emp.total_setores} setores</span>
                        <span>{emp.total_funcionarios_setores||0} funcionários</span>
                      </div>
                    </div>
                    <Btn variant="secondary" className="text-xs" onClick={()=>{
                      setEmpresaSel(emp); setNovaEmp({nome:"",cnpj:"",total_funcionarios:"",tipo:"filial",matriz_id:emp.id}); setView("cadastrar_empresa");
                    }}>+ Filial</Btn>
                  </div>
                </Card>
              ))
            }
          </div>
        </div>
      )}

      {/* CADASTRAR EMPRESA/FILIAL */}
      {view==="cadastrar_empresa" && (
        <Card className="p-6 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">{empresaSel?`Nova filial de ${empresaSel.nome}`:"Nova empresa (matriz)"}</h2>
          <form onSubmit={criarEmpresa} className="space-y-3">
            {!empresaSel && (
              <div><label className="text-xs text-gray-500 block mb-1">Tipo</label>
                <div className="flex gap-3">
                  {["matriz","filial"].map(t=>(
                    <label key={t} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer text-sm transition-all ${novaEmp.tipo===t?"border-blue-500 bg-blue-50 text-blue-800":"border-gray-200 text-gray-600"}`}>
                      <input type="radio" name="tipo" value={t} checked={novaEmp.tipo===t} onChange={()=>setNovaEmp({...novaEmp,tipo:t})} className="sr-only"/>
                      {t==="matriz"?"🏢 Matriz":"🏬 Filial"}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {novaEmp.tipo==="filial" && !empresaSel && (
              <Select label="Empresa matriz *" required value={novaEmp.matriz_id} onChange={e=>setNovaEmp({...novaEmp,matriz_id:e.target.value})}>
                <option value="">Selecione</option>
                {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
              </Select>
            )}
            <Input label="Nome *" required placeholder={novaEmp.tipo==="filial"?"Ex: Filial Porto Alegre":"Ex: Empresa Ltda"} value={novaEmp.nome} onChange={e=>setNovaEmp({...novaEmp,nome:e.target.value})}/>
            <Input label="CNPJ" placeholder="00.000.000/0001-00" value={novaEmp.cnpj} maxLength={18} onChange={e=>setNovaEmp({...novaEmp,cnpj:fmtCNPJ(e.target.value)})}/>
            <Input label="Total de funcionários" type="number" min="1" placeholder="Ex: 50" value={novaEmp.total_funcionarios} onChange={e=>setNovaEmp({...novaEmp,total_funcionarios:e.target.value})}/>
            <div className="flex gap-2 pt-1">
              <Btn type="submit">Criar {novaEmp.tipo==="filial"?"filial":"empresa"}</Btn>
              <Btn variant="secondary" onClick={()=>{ setEmpresaSel(null); setView("empresas"); }}>Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* NOVA AVALIAÇÃO */}
      {view==="nova" && (
        <Card className="p-6 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">Nova avaliação</h2>
          <div className="space-y-3">
            <Select label="Empresa *" required value={novaAval.empresa_id}
              onChange={e=>{ setNovaAval({...novaAval,empresa_id:e.target.value,setor_id:""}); carregarSetores(e.target.value); setAdicionandoSetor(false); }}>
              <option value="">Selecione</option>
              <option value="">Selecione</option>
              {empresasTodas.filter(e=>e.tipo==="matriz").map(matriz=>(
                <optgroup key={matriz.id} label={matriz.nome}>
                  <option value={matriz.id}>{matriz.nome} (matriz)</option>
                  {empresasTodas.filter(f=>f.matriz_id===matriz.id).map(filial=>(
                    <option key={filial.id} value={filial.id}>↳ {filial.nome}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
            {novaAval.empresa_id && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Setor *</label>
                  <button type="button" onClick={()=>setAdicionandoSetor(!adicionandoSetor)} className="text-xs text-blue-600 hover:underline">
                    {adicionandoSetor?"Cancelar":"+ Novo setor"}
                  </button>
                </div>
                {adicionandoSetor && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2">
                    <form onSubmit={adicionarSetor} className="space-y-2">
                      <Input required placeholder="Nome do setor" value={novoSetor.nome} onChange={e=>setNovoSetor({...novoSetor,nome:e.target.value})}/>
                      <Input type="number" min="1" placeholder="Nº de funcionários" value={novoSetor.total_funcionarios} onChange={e=>setNovoSetor({...novoSetor,total_funcionarios:e.target.value})}/>
                      <Btn type="submit" className="text-xs py-1.5">Adicionar</Btn>
                    </form>
                  </div>
                )}
                {setores.length===0 ? <p className="text-xs text-gray-400 py-2">Nenhum setor. Adicione acima.</p>
                  : <div className="space-y-2">{setores.map(s=>(
                    <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${novaAval.setor_id===s.id?"border-blue-500 bg-blue-50":"border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="setor" value={s.id} checked={novaAval.setor_id===s.id} onChange={()=>setNovaAval({...novaAval,setor_id:s.id})} className="text-blue-600"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{s.nome}</p>
                        <BarraProgresso coletadas={parseInt(s.respostas_coletadas)||0} total={parseInt(s.total_funcionarios)||0}/>
                      </div>
                    </label>
                  ))}</div>
                }
              </div>
            )}
            <Input label="Data de encerramento" type="date" value={novaAval.data_fim} onChange={e=>setNovaAval({...novaAval,data_fim:e.target.value})}/>
            <div className="flex gap-2 pt-1">
              <Btn onClick={criarAvaliacao} disabled={!novaAval.empresa_id||!novaAval.setor_id}>Criar e gerar link</Btn>
              <Btn variant="secondary" onClick={()=>setView("avaliacoes")}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}

      {/* USUÁRIOS */}
      {view==="usuarios" && isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-900 text-sm">Usuários</h2>
            <Btn onClick={()=>setView("novo_usuario")}>+ Novo usuário</Btn>
          </div>
          <Card className="overflow-hidden">
            {usuarios.length===0 ? <p className="text-sm text-gray-400 p-6">Nenhum usuário.</p>
              : <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">E-mail</th>
                  <th className="px-4 py-3 text-xs text-gray-400 font-medium">Perfil</th>
                  <th className="px-4 py-3 text-xs text-gray-400 font-medium">Empresa</th>
                </tr></thead>
                <tbody>{usuarios.map(u=>(
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{u.nome}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-center"><BadgeRisco valor={u.papel}/></td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">{u.empresa_nome||"—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            }
          </Card>
        </div>
      )}

      {/* NOVO USUÁRIO */}
      {view==="novo_usuario" && isAdmin && (
        <Card className="p-6 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">Novo usuário</h2>
          <form onSubmit={criarUsuario} className="space-y-3">
            <Input label="Nome *" required value={novoUsr.nome} onChange={e=>setNovoUsr({...novoUsr,nome:e.target.value})}/>
            <Input label="E-mail *" required type="email" value={novoUsr.email} onChange={e=>setNovoUsr({...novoUsr,email:e.target.value})}/>
            <Input label="Senha *" required type="password" value={novoUsr.senha} onChange={e=>setNovoUsr({...novoUsr,senha:e.target.value})}/>
            <Select label="Perfil *" value={novoUsr.papel} onChange={e=>setNovoUsr({...novoUsr,papel:e.target.value})}>
              <option value="psicologo">Psicólogo</option>
              <option value="gestor_matriz">Gestor Matriz</option>
              <option value="gestor_filial">Gestor Filial</option>
              <option value="admin">Admin NeXa</option>
            </Select>
            {["gestor_matriz","gestor_filial"].includes(novoUsr.papel) && (
              <Select label="Empresa vinculada" value={novoUsr.empresa_vinculada_id} onChange={e=>setNovoUsr({...novoUsr,empresa_vinculada_id:e.target.value})}>
                <option value="">Selecione</option>
                {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
              </Select>
            )}
            {novoUsr.papel==="psicologo" && (
              <Input label="CRP" placeholder="CRP 00/000000" value={novoUsr.crp} onChange={e=>setNovoUsr({...novoUsr,crp:e.target.value})}/>
            )}
            <div className="flex gap-2 pt-1">
              <Btn type="submit">Criar usuário</Btn>
              <Btn variant="secondary" onClick={()=>setView("usuarios")}>Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}
    </Layout>
  );
}
