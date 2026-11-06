export type Lot = { id?: number; product: string; quantity: number; expires: string };
export function validDate(value: string): boolean {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const date=new Date(value+"T00:00:00Z");
 return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===value;
}
export function createLot(product: string, quantity: number, expires: string): Lot {
 const name=product.trim();
 if(!name) throw new Error("Informe o produto.");
 if(!Number.isSafeInteger(quantity)||quantity<=0) throw new Error("Quantidade deve ser um inteiro positivo.");
 if(!validDate(expires)) throw new Error("Validade inválida.");
 return {product:name,quantity,expires};
}
export function consume(lot: Lot,amount: number): Lot {
 if(!Number.isSafeInteger(amount)||amount<=0||amount>lot.quantity) throw new Error("Quantidade indisponível.");
 return {...lot,quantity:lot.quantity-amount};
}
export function byExpiry(lots: Lot[]): Lot[] {
 return [...lots].sort((a,b)=>a.expires.localeCompare(b.expires)||(a.id??0)-(b.id??0));
}
