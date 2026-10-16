const http = require('node:http');
const PORT = Number(process.env.PORT || 8081);
const URL_PRODUTOS = process.env.URL_PRODUTOS || 'http://localhost:8080';
const pedidos = [];
let proximoId = 1;
const enviar = (res,status,dados) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(dados));};
async function corpo(req) {
 let bruto='';for await(const parte of req){bruto+=parte;if(bruto.length>1e6)throw Object.assign(new Error('Corpo muito grande'),{status:413});}
 try{return JSON.parse(bruto||'{}')}catch{throw Object.assign(new Error('JSON inválido'),{status:400});}
}
async function consultarAPI(caminho,opcoes={}) {
 let resp;
 try {resp = await fetch(`${URL_PRODUTOS}${caminho}`,{...opcoes,signal:AbortSignal.timeout(3000)});}
 catch {throw Object.assign(new Error('API de Produtos indisponível ou sem resposta.'),{status:503});}
 let dados;
 try {dados = await resp.json();} catch {throw Object.assign(new Error('Resposta inválida da API de Produtos.'),{status:502});}
 return {status:resp.status,dados};
}
http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});return res.end();}
 const caminho=new URL(req.url,`http://localhost:${PORT}`).pathname;
 try {
  if(req.method==='GET'&&caminho==='/health')return enviar(res,200,{servico:'pedidos',status:'online'});
  if(req.method==='GET'&&caminho==='/pedidos')return enviar(res,200,pedidos);
  if(req.method==='GET'&&/^\/pedidos\/\d+$/.test(caminho)) {
    const p=pedidos.find(p=>p.id===Number(caminho.split('/')[2]));return p?enviar(res,200,p):enviar(res,404,{erro:'Pedido não encontrado.'});
  }
  if(req.method==='POST'&&caminho==='/pedidos'){
   const {cliente,itens}=await corpo(req);
   if(typeof cliente!=='string'||!cliente.trim()||!Array.isArray(itens)||itens.length===0||itens.some(i=>!i||!Number.isInteger(i.produtoId)||i.produtoId<=0||!Number.isInteger(i.quantidade)||i.quantidade<=0))return enviar(res,400,{erro:'Informe cliente e itens com produtoId e quantidade inteiros positivos.'});
   // Reúne itens repetidos do mesmo produto para validar quantidades corretamente.
   const somados=new Map();for(const item of itens)somados.set(item.produtoId,(somados.get(item.produtoId)||0)+item.quantidade);
   if(somados.size!==1) return enviar(res,422,{erro:'Nesta versão didática, informe um produto por pedido para garantir atualização consistente de estoque.'});
   const [produtoId,quantidade]=[...somados.entries()][0];
   console.log(`Consultando API Produtos: GET /produtos/${produtoId}`);
   const consulta=await consultarAPI(`/produtos/${produtoId}`);
   if(consulta.status===404)return enviar(res,404,{erro:`Produto ${produtoId} não encontrado na API de Produtos.`});
   if(consulta.status!==200)return enviar(res,502,{erro:'Falha ao consultar produto.'});
   const produto=consulta.dados;
   if(produto.quantidade<quantidade)return enviar(res,409,{erro:'Estoque insuficiente.',disponivel:produto.quantidade,solicitado:quantidade});
   console.log(`Atualizando API Produtos: PATCH /produtos/${produtoId}/estoque`);
   const atualizacao=await consultarAPI(`/produtos/${produtoId}/estoque`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({quantidade})});
   if(atualizacao.status===409)return enviar(res,409,{erro:'Estoque insuficiente no momento da confirmação.',detalhes:atualizacao.dados});
   if(atualizacao.status!==200)return enviar(res,502,{erro:'Falha ao atualizar estoque.',detalhes:atualizacao.dados});
   const pedido={id:proximoId++,cliente:cliente.trim(),itens:[{produtoId,produto:produto.nome,quantidade,precoUnitario:produto.preco}],total:Number((produto.preco*quantidade).toFixed(2)),status:'confirmado',data:new Date().toISOString()};
   pedidos.push(pedido);
   return enviar(res,201,{mensagem:'Pedido confirmado e estoque atualizado.',pedido});
  }
  return enviar(res,404,{erro:'Rota não encontrada.'});
 }catch(e){console.error(e.message);return enviar(res,e.status||500,{erro:e.status?e.message:'Erro interno.'});}
}).listen(PORT,()=>console.log(`API Pedidos disponível em http://localhost:${PORT}`));