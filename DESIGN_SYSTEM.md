# ThorTk Design System

## Princípios

- **Operacional primeiro:** informação e ação devem ser encontradas sem decoração excessiva.
- **Tempestade como identidade, não ruído:** azul elétrico indica seleção ou foco; dourado é apenas acento.
- **Um significado por estado:** verde para confirmação, vermelho para bloqueio, azul para seleção e dourado para ação principal.

## Tipografia

- **UI operacional:** `Sora`. Obrigatória em tabelas, formulários, filtros, navegação, métricas, IDs, logs e textos longos.
- **Display de identidade:** `Asgard`, `Asgard Wide` ou `God of Thunder` caso a fonte licenciada seja adicionada ao projeto; enquanto isso, `Cinzel` é o fallback carregado.
- A classe `thor-title` é reservada a logo, títulos de etapa, onboarding, estados vazios relevantes, preparação e confirmação de lançamento.
- `thor-title--storm` aplica o destaque azul elétrico; `thor-title--asgard` é reservado a conclusão/lançamento.

## Tokens

- Canvas: `--thor-canvas`
- Surface: `--thor-surface`
- Surface elevada: `--thor-surface-raised`
- Borda: `--thor-line`
- Texto: `--thor-text` e `--thor-muted`
- Ações: `--thor-blue`, `--thor-gold`, `--thor-success`, `--thor-danger`
- Raios: `--thor-radius-sm`, `--thor-radius-md`, `--thor-radius-lg`
- Altura de controles: `--thor-control-height`

## Componentes-base

- `rocket-card` / `rocket-section`: contêineres de conteúdo.
- `rocket-input`: campos e selects.
- `rocket-dark-button`: ação secundária.
- `rocket-launch-button`: ação principal e irreversível.
- `journey-icon`: ícone PNG circular da navegação.

## Estados

- Selecionado: azul elétrico com borda e brilho sutis.
- Principal: dourado envelhecido.
- Sucesso: verde.
- Bloqueio: vermelho.
- Desabilitado: opacidade reduzida, sem fingir que a ação foi executada.
