# ThorTk × referência Rocket — paridade funcional

| Etapa | ThorTk atual | Situação |
| --- | --- | --- |
| Conectar | OAuth, token criptografado, reconexão e atualização | Implementado |
| Contas | Listar, buscar, filtrar, selecionar conta, pixel e identity autorizados | Implementado |
| Catálogo | Listar por Business Center, selecionar catálogo e modo de catálogo | Implementado para todos os produtos |
| Product Sets | Modo selecionável, sem consulta de sets no TikTok | Endpoint pendente |
| Criativos | Texto, CTA, complemento e uso dinâmico do texto do catálogo | Implementado como configuração |
| Vídeo/creative asset | Seleção de vídeo vertical e criação de asset | Endpoint pendente |
| Estrutura ABO | Volume, orçamento, conversão, AIGC, CPA, atribuição, idade, SO, país, idioma e regiões | Implementado como configuração |
| Proxy | Escolha de rota e URL de proxy dedicado | Configuração pronta; execução de rede pendente |
| Lançar | Pré-flight e revisão de todos os ativos obrigatórios | Implementado |
| Campanha, ad group e ads | Criação, fila, retry, logs e monitoramento real | Endpoint/worker pendente |

## Regra de segurança

Enquanto a última linha não existir, o botão final deve continuar sendo **pré-lançamento**. Ele não pode informar que publicou campanha, grupo ou anúncio.

## Próxima implementação para paridade real

1. Criar um job assinado no servidor a partir da revisão.
2. Validar conta, catálogo, pixel, identity, localização e moeda contra a API.
3. Criar campanha, depois ad groups ABO e anúncios em fila com idempotência.
4. Persistir cada retorno do TikTok em `launch_jobs` e `launch_logs`.
5. Consultar o status após a publicação e exibir somente dados reais.
