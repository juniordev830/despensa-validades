import type {Lot} from "./domain.ts";
const DATABASE="despensa-validades-v1",STORE="lots";
function request<T>(r:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});}
async function open():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open(DATABASE,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
}
async function transaction<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>Promise<T>):Promise<T>{
 const db=await open();
 try {
  const tx=db.transaction(STORE,mode);
  const finished=new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});
  const result=await run(tx.objectStore(STORE));await finished;return result;
 }finally{db.close();}
}
export function listLots():Promise<Lot[]>{return transaction("readonly",s=>request(s.getAll() as IDBRequest<Lot[]>));}
export async function addLot(lot:Lot):Promise<void>{await transaction("readwrite",async s=>{await request(s.add(lot));});}
export async function changeLot(id:number,amount:number):Promise<void>{
 await transaction("readwrite",async s=>{
  const lot=await request(s.get(id) as IDBRequest<Lot|undefined>);
  if(!lot) throw new Error("Lote inexistente.");
  if(!Number.isSafeInteger(amount)||amount<=0||amount>lot.quantity) throw new Error("Estoque insuficiente.");
  const left=lot.quantity-amount;
  await request(left===0?s.delete(id):s.put({...lot,quantity:left}));
 });
}
