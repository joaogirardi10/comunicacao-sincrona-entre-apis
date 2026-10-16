const http = require('node:http');
const PORT = Number(process.env.PORT || 8080);
const produtos = new Map();
let proximoId = 1;

function enviar(res, status, dados) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*'});
  res.end(JSON.stringify(dados));
}
async function corpo(req) {
  let bruto = '';
  for await (const parte of req) { bruto += parte; if (bruto.length > 1e6) throw Object.assign(new Error('Corpo muito grande'),{status:413}); }
  try { return JSON.parse(bruto || '{}'); } catch { throw Object.assign(new Error('JSON inválido'),{status:400}); }
}
const inteiroPositivo = x => Number.isInteger(x) && x > 0;
const inteiroNaoNegativo = x => Number.isInteger(x) && x >= 0;
const filas = new Map();
// A fila por produto serializa atualizações e evita venda simultânea acima do saldo.
async function comBloqueio(id, tarefa) {
  const anterior = filas.get(id) || Promise.resolve();
  let liberar;
  const proximo = new Promise(resolve => { liberar = resolve; });
  filas.set(id, proximo);
  await anterior;
  try { return await tarefa(); }
  finally { liberar(); if (filas.get(id) === proximo) filas.delete(id); }
}
http.createServer(async (req,res) => {
  if (req.method === 'OPTIONS') {res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,OPTIONS'}); return res.end();}
  const caminho = new URL(req.url, `http://localhost:${PORT}`).pathname;
  try {
    if (req.method === 'GET' && caminho === '/health') return enviar(res,200,{servico:'produtos',status:'online'});
    if (req.method === 'GET' && caminho === '/produtos') return enviar(res,200,[...produtos.values()]);
    if (req.method === 'POST' && caminho === '/produtos') {
      const {nome, preco, quantidade} = await corpo(req);
      if (typeof nome !== 'string' || !nome.trim() || typeof preco !== 'number' || !Number.isFinite(preco) || preco < 0 || !inteiroNaoNegativo(quantidade)) return enviar(res,400,{erro:'Informe nome, preco (>= 0) e quantidade (inteiro >= 0).'});
      const produto = {id:proximoId++,nome:nome.trim(),preco,quantidade};
      produtos.set(produto.id,produto);
      return enviar(res,201,produto);
    }
    const match = caminho.match(/^\/produtos\/(\d+)(\/estoque)?$/);
    if (match) {
      const id = Number(match[1]);
      const produto = produtos.get(id);
      if (!produto) return enviar(res,404,{erro:'Produto não encontrado.'});
      if (req.method === 'GET' && !match[2]) return enviar(res,200,produto);
      if (req.method === 'GET' && match[2]) return enviar(res,200,{id:produto.id,disponivel:produto.quantidade});
      if ((req.method === 'PATCH' || req.method === 'PUT') && match[2]) {
        const dados = await corpo(req);
        if (!inteiroPositivo(dados.quantidade)) return enviar(res,400,{erro:'Quantidade a descontar deve ser um inteiro positivo.'});
        return comBloqueio(id, () => {
          if (produto.quantidade < dados.quantidade) return enviar(res,409,{erro:'Estoque insuficiente.',disponivel:produto.quantidade,solicitado:dados.quantidade});
          produto.quantidade -= dados.quantidade;
          return enviar(res,200,{mensagem:'Estoque atualizado.',produto});
        });
      }
    }
    return enviar(res,404,{erro:'Rota não encontrada.'});
  } catch(e) { return enviar(res,e.status || 500,{erro:e.status ? e.message : 'Erro interno.'}); }
}).listen(PORT, () => console.log(`API Produtos disponível em http://localhost:${PORT}`));