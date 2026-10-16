const {spawn} = require('node:child_process');
const assert = require('node:assert/strict');
const baseProd = 'http://127.0.0.1:18080', basePed = 'http://127.0.0.1:18081';
const servidores=[];
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
async function json(url,method='GET',body) {
 const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,dados:await r.json()};
}
async function aguardar(url) {for(let i=0;i<50;i++){try{if((await fetch(url)).ok)return;}catch{}await pausa(100);}throw Error(`Servidor não iniciou: ${url}`);}
async function main(){
 try{
  servidores.push(spawn(process.execPath,['produtos-api/server.js'],{cwd:__dirname+'/..',stdio:'ignore',env:{...process.env,PORT:'18080'}}));
  servidores.push(spawn(process.execPath,['pedidos-api/server.js'],{cwd:__dirname+'/..',stdio:'ignore',env:{...process.env,PORT:'18081',URL_PRODUTOS:baseProd}}));
  await aguardar(baseProd+'/health');await aguardar(basePed+'/health');
  let r=await json(baseProd+'/produtos','POST',{nome:'Teclado',preco:150,quantidade:10});assert.equal(r.status,201);const id=r.dados.id;
  r=await json(basePed+'/pedidos','POST',{cliente:'Aluno',itens:[{produtoId:id,quantidade:3}]});assert.equal(r.status,201);assert.equal(r.dados.pedido.total,450);
  r=await json(baseProd+`/produtos/${id}/estoque`);assert.equal(r.dados.disponivel,7);
  r=await json(basePed+'/pedidos','POST',{cliente:'Aluno',itens:[{produtoId:id,quantidade:99}]});assert.equal(r.status,409);
  r=await json(basePed+'/pedidos','POST',{cliente:'Aluno',itens:[{produtoId:999,quantidade:1}]});assert.equal(r.status,404);
  r=await json(basePed+'/pedidos');assert.equal(r.dados.length,1);
  console.log('PASSOU: cadastro, confirmação, baixa de estoque, saldo insuficiente, produto inexistente, listagem.');
 }finally{for(const p of servidores)p.kill();}
}
main().catch(e=>{console.error('FALHOU:',e.message);process.exitCode=1});