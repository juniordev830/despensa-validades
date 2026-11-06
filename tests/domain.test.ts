import {test} from "node:test";
import {strict as assert} from "node:assert";
import {createLot,consume,byExpiry} from "../src/domain.ts";
test("dois lotes, consumo e ordenação",()=>{
 const a=createLot("Feijão",2,"2026-12-01"),b=createLot("Arroz",3,"2026-11-10");
 assert.deepEqual(byExpiry([a,b]).map(x=>x.product),["Arroz","Feijão"]);
 assert.equal(consume(a,1).quantity,1);
 assert.equal(a.quantity,2);
});
test("impede estoque negativo, entradas inválidas e datas impossíveis",()=>{
 assert.throws(()=>consume(createLot("Feijão",1,"2026-11-10"),2));
 assert.throws(()=>createLot("  ",2,"2026-11-10"));
 assert.throws(()=>createLot("A",0,"2026-11-10"));
 assert.throws(()=>createLot("A",2,"2026-02-30"));
});
