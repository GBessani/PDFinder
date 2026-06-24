# PDFinder

Lista de desejos + notificacao automatica via WhatsApp.
Cliente cadastra produtos e contatos; ao subir um PDF (nota fiscal / lista de
artigos), o sistema identifica quais produtos chegaram, cruza com as listas de
desejo e avisa no WhatsApp quem queria cada item.

## Estrutura

    PDFinder/
    ├── wa-worker/   # processo Node que conversa com o WhatsApp (Baileys)
    └── app-web/     # app Next.js (frontend + API + banco)

Os dois sao independentes e se falam por HTTP. O worker NAO vai pra Vercel
(precisa ficar sempre ligado); roda no Railway/Render ou numa maquina local.

## wa-worker  (ja pronto)

    cd wa-worker
    npm install
    copy .env.example .env      # preencha o AUTH_TOKEN
    npm start                   # abra http://localhost:3001/qr e escaneie

## app-web  (em construcao)

Este pacote ja traz a FUNDACAO (lib/, schema, middleware). Os arquivos de
config do Next (package.json, next.config, tsconfig, tailwind) NAO estao aqui
de proposito: gere-os com o create-next-app e junte com esta pasta.

    # 1) crie o projeto Next na MESMA pasta (mesma stack do FinaceBit)
    npx create-next-app@latest app-web --typescript --tailwind --app --eslint
    cd app-web
    npm install @supabase/supabase-js @supabase/ssr
    npx shadcn@latest init

    # 2) os arquivos de lib/, supabase/ e o middleware.ts ja estao no lugar
    #    (se o create-next-app perguntar p/ sobrescrever, mantenha os daqui)

    # 3) variaveis de ambiente
    copy .env.local.example .env.local   # preencha URL + anon key do Supabase

    # 4) rode o schema no Supabase
    #    cole supabase/migrations/001_baseline_schema.sql no SQL Editor

    npm run dev

## O que ja esta feito

- lib/supabase/{client,server,middleware}.ts  -> clientes Supabase
- middleware.ts                               -> sessao + guarda de rota
- lib/database.types.ts / lib/types.ts        -> tipos do schema
- lib/queries.ts                              -> CRUD de produtos/contatos/wishlist
- supabase/migrations/001_baseline_schema.sql -> banco (4 tabelas + RLS)

## Proximos passos (pastas vazias esperando os arquivos)

- app/(app)/produtos      -> tela de produtos
- app/(app)/contatos      -> tela de contatos + wishlist
- app/(app)/importar      -> upload do PDF + revisao + disparo
- app/(app)/notificacoes  -> historico de avisos
- app/api/importar        -> le o PDF e cruza com o Groq
- app/api/disparar        -> chama o worker (/send)
- lib/{pdf,groq,wa}.ts    -> extracao, match e cliente do worker
