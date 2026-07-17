# Aula 07 — Atividade: Módulo Usuário (NestJS)

Atividade da Aula 07 de Programação IV: dentro do projeto Nest.JS, criar
rotas CRUD para o módulo Usuário, service que atende as rotas CRUD, e
DTOs + entity de Usuário.

## Estrutura criada

```
src/usuario/
├── dto/
│   ├── create-usuario.dto.ts   # nome, email, senha
│   └── update-usuario.dto.ts   # PartialType(CreateUsuarioDto)
├── entities/
│   └── usuario.entity.ts       # id, nome, email, senha
├── usuario.controller.ts       # rotas CRUD
├── usuario.service.ts          # lógica (lista, busca único, cria, atualiza, remove)
└── usuario.module.ts           # registrado no AppModule
```

## Rotas

| Método | Rota          | Ação                     |
|--------|---------------|--------------------------|
| POST   | /usuario      | Cria usuário             |
| GET    | /usuario      | Lista todos              |
| GET    | /usuario/:id  | Busca usuário único      |
| PATCH  | /usuario/:id  | Atualiza (parcial)       |
| DELETE | /usuario/:id  | Remove usuário           |

IDs inexistentes retornam 404 (`NotFoundException`).

## Rodar

```bash
npm install
npm run start:dev
```

## Testar (curl ou Insomnia)

```bash
curl -X POST localhost:3000/usuario -H 'Content-Type: application/json' \
  -d '{"nome":"Guilherme","email":"gui@ufmt.br","senha":"123456"}'

curl localhost:3000/usuario          # lista
curl localhost:3000/usuario/1        # único

curl -X PATCH localhost:3000/usuario/1 -H 'Content-Type: application/json' \
  -d '{"senha":"novaSenha"}'

curl -X DELETE localhost:3000/usuario/1
```
