# Comunicação Síncrona entre APIs REST

Atividade prática da disciplina **Desenvolvimento de Sistemas Distribuídos**. Projeto didático em JavaScript (Node.js) que demonstra comunicação síncrona HTTP entre **duas APIs independentes**.

## Arquitetura

- **API de Produtos / Estoque** — `http://localhost:8080`. Cadastra, consulta e atualiza produtos.
- **API de Pedidos** — `http://localhost:8081`. Recebe pedidos, consulta a API de Produtos e, havendo estoque, solicita a baixa antes de confirmar.

Fluxo: `Cliente → API de Pedidos → GET API de Produtos → PATCH Estoque → confirmação`.

A API de Pedidos **aguarda cada resposta HTTP** antes de avançar, caracterizando a comunicação síncrona.

## Pré-requisitos

Node.js 18 ou superior. O projeto usa apenas módulos nativos, **sem dependências externas**, portanto não é necessário rodar `npm install`.

## Como executar

Abra **dois terminais** na pasta raiz.

Terminal 1:
```bash
npm run produtos
```

Terminal 2:
```bash
npm run pedidos
```

Servidores: `http://localhost:8080` e `http://localhost:8081`. Interrompa com `Ctrl + C`.

## Endpoints

| API | Método | Rota | Finalidade |
| --- | --- | --- | --- |
| Produtos | POST | `/produtos` | Cadastrar produto |
| Produtos | GET | `/produtos` | Listar produtos |
| Produtos | GET | `/produtos/1` | Consultar produto |
| Produtos | GET | `/produtos/1/estoque` | Consultar disponibilidade |
| Produtos | PATCH / PUT | `/produtos/1/estoque` | Descontar estoque |
| Pedidos | POST | `/pedidos` | Criar e confirmar pedido |
| Pedidos | GET | `/pedidos` | Listar pedidos |
| Pedidos | GET | `/pedidos/1` | Consultar pedido |

As duas APIs também disponibilizam `GET /health`.

## Teste prático (Postman)

Importe o arquivo **`Atividade-APIs.postman_collection.json`** no Postman e siga as requisições numeradas:

1. Cadastre o produto: `{"nome":"Teclado Gamer","preco":150,"quantidade":10}` → **201 Created**.
2. Consulte o produto / estoque → 10 unidades.
3. Crie pedido na API 8081: `{"cliente":"João","itens":[{"produtoId":1,"quantidade":3}]}` → **201 Created**.
4. Consulte novamente o estoque → **7 unidades**.
5. Solicite 99 unidades → **409 Conflict** (estoque insuficiente).
6. Interrompa **somente** a API de Produtos e tente criar pedido → **503 Service Unavailable**.

## Testes automatizados

Com os servidores normais desligados, execute:
```bash
npm run teste
```

Os testes verificam cadastro, pedido, baixa no estoque, falta de estoque, produto inexistente e listagem. Usam portas alternativas 18080 e 18081.

## Tratamento de erros

- `400`: dados inválidos.
- `404`: produto ou pedido não encontrado.
- `409`: estoque insuficiente.
- `422`: mais de um produto distinto no pedido.
- `502`: resposta inesperada da API de Produtos.
- `503`: serviço de Produtos indisponível ou sem resposta.

## Limitações didáticas

Os dados são mantidos **em memória**; reiniciar o serviço apaga os produtos e pedidos. Cada pedido aceita **um único produto distinto**, ainda que repetido em múltiplos itens. Não há banco de dados nem transação distribuída. A API de Produtos serializa as baixas de estoque de cada produto.

## Tecnologias

JavaScript • Node.js • HTTP • REST • JSON • Postman.
