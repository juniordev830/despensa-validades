import React,{useEffect,useState} from "react";
import{createRoot}from"react-dom/client";
import{addLot,changeLot,listLots}from"./db.ts";
import{byExpiry,createLot,type Lot}from"./domain.ts";
import "./style.css";
function App(){
 const [lots,setLots]=useState<Lot[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const reload=async()=>setLots(byExpiry(await listLots()));
 useEffect(()=>{reload().catch(e=>setError(String(e)));},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget;const data=new FormData(form);
  setBusy(true);setError("");
  try{await addLot(createLot(String(data.get("produto")??""),Number(data.get("quantidade")),String(data.get("validade")??"")));form.reset();await reload();}
  catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
 }
 async function change(id:number|undefined,quantity:number){if(id===undefined)return;setBusy(true);setError("");try{await changeLot(id,quantity);await reload();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <main><header><h1>🥬 Despensa e Validades</h1><p>Organize lotes, acompanhe vencimentos e registre consumo. Os dados permanecem neste navegador.</p></header>
 <section><h2>Adicionar lote</h2><form onSubmit={submit}><label>Produto<input required name="produto" maxLength={80} placeholder="Arroz"/></label><label>Quantidade (unidades)<input required type="number" min="1" step="1" name="quantidade" defaultValue="1"/></label><label>Validade<input required type="date" name="validade"/></label><button disabled={busy}>Salvar lote</button></form></section>
 {error&&<p role="alert" className="error">{error}</p>}
 <section><h2>Lotes por validade</h2>{lots.length===0?<p>Nenhum lote cadastrado.</p>:<ul>{lots.map(l=><li key={l.id}><span><strong>{l.product}</strong><small>Vence em {l.expires} · {l.quantity} unidade(s)</small></span><div><button disabled={busy} onClick={()=>change(l.id,1)}>Consumir 1</button><button disabled={busy} className="subtle" onClick={()=>change(l.id,l.quantity)}>Descartar lote</button></div></li>)}</ul>}</section></main>
}
createRoot(document.getElementById("root")!).render(<App/>);
