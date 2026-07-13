# 🌱 Broto

Seu diário alimentar, metas, desafios e tarefas — num só lugar, com a mesma identidade visual do seu plano alimentar (verde/menta com toques de laranja, DM Sans + DM Serif Display).

Stack: **React + Vite + TypeScript + MUI + Supabase**, deploy na **Vercel**.

## 1. Rodar localmente

```bash
npm install
cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
npm run dev
```

## 2. Configurar o Supabase

1. Crie um projeto em https://supabase.com.
2. Vá em **SQL Editor** e rode o conteúdo de `supabase/schema.sql` — isso cria as tabelas e as políticas de segurança (RLS), garantindo que cada pessoa só veja os próprios dados.
3. Em **Project Settings → API**, copie a `Project URL` e a `anon public key` para o seu `.env`.
4. (Opcional) Em **Authentication → Providers**, você pode desativar a confirmação por e-mail se quiser testar mais rápido (Authentication → Settings → "Confirm email").

## 3. Estrutura do projeto

```
src/
  components/   Logo, Layout (navegação), ProtectedRoute
  contexts/      AuthContext (login/cadastro/sessão)
  lib/           cliente do Supabase
  pages/         Login, Dashboard, Diary (diário), GoalsChallenges, Tasks
  theme.ts       paleta e tipografia (identidade visual)
supabase/
  schema.sql     tabelas + RLS
```

## 4. Módulos incluídos

- **Diário** — registro de refeições (com tipo, descrição e calorias opcionais) e de água, com barra de progresso da meta diária (2.800 ml, mesma meta do seu plano).
- **Metas** — lista de metas com prazo e status (ativa/concluída).
- **Desafios** — desafios com check-in diário e barra de progresso (ex: "Caminhar após o almoço", 21 dias).
- **Tarefas** — lista simples com prioridade (alta/média/baixa) e prazo.
- **Painel** — resumo do dia: água, tarefas pendentes, desafios em andamento.

## 5. Deploy na Vercel

```bash
npm install -g vercel
vercel
```

Ou pelo painel da Vercel: importe o repositório, e nas variáveis de ambiente do projeto adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (as mesmas do seu `.env`). O `vercel.json` já está configurado para o roteamento de SPA funcionar corretamente.

## 6. Próximos passos sugeridos

- Adicionar gráficos de evolução (ex: água/calorias por semana) com `recharts`.
- Notificações/lembretes (ex: beber água, horário das refeições).
- Tela de perfil com foto e edição de metas de água/calorias.
- PWA (instalar no celular como app).

---

Identidade visual: paleta `#2D6A4F` (verde), `#52B788` (verde-claro), `#D8F3DC` (menta), `#F8F4EF` (creme), `#E07A3A` (laranja) — a mesma linha do seu plano alimentar, para manter tudo coeso.
