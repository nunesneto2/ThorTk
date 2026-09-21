# ThorTk

Lançador independente de campanhas de catálogo no TikTok Ads, estruturado para orçamento no nível de ad group (ABO).

## O que já existe

- Fluxo de configuração: conexão, ativos, catálogo, criativo, estrutura ABO e revisão.
- Conversão explícita entre a moeda informada e a moeda da conta de anúncio.
- Cálculo do potencial diário: orçamento por grupo × quantidade total de grupos.
- OAuth do TikTok com `state` assinado, nonce em cookie HTTP-only e tokens criptografados com AES-256-GCM.
- Esquema isolado de Supabase para conexões, jobs e logs de lançamento.

## Configuração inicial

1. Crie um projeto Supabase exclusivo e execute `database-schema.sql`.
2. Copie `.env.example` para `.env.local` e preencha as credenciais desse novo projeto.
3. Crie um novo App no TikTok for Business, solicite as permissões de Marketing API necessárias e configure o callback:
   `https://SEU-DOMINIO/api/tiktok/callback`
4. Rode `pnpm dev`.

## Segurança

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, `TIKTOK_APP_SECRET` ou `TIKTOK_TOKEN_ENCRYPTION_KEY` ao navegador.
- O catálogo é somente selecionado; o ThorTk não altera feed, XML ou produtos.
- A publicação deve ser implementada em worker/fila, com pré-validação de ativos, confirmação humana do gasto e logs por campanha, grupo e anúncio.
