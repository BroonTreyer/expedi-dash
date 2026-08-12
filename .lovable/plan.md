# Reduzir consumo de memória (erro "insuficiência de memória")

O aviso do print é o Chrome derrubando a aba por falta de memória — acontece principalmente nos tablets/celulares da portaria. Levantei os pontos do sistema que mais pesam e o que muda em cada um.

## O que está pesando hoje (verificado no código)

1. **Fotos enviadas em resolução cheia.** Em `uploadFotoMovimentacao` a foto vai para o storage exatamente como saiu da câmera (8–12 MP, 4–10 MB). Antes disso ela ainda é exibida na tela em `<img>` de 192px de altura — o navegador precisa descomprimir a imagem inteira na memória (uma foto de 12MP ocupa ~48 MB de RAM). Com 3–4 fotos por registro (placa, documento, painel, nota) a aba estoura.
2. **Pré-visualizações sem limite de tamanho.** `CapturaFoto`, `MovimentoDetailsDialog`, `PhotoViewerDialog` e `ComprovantePortariaDialog` carregam a imagem original, sem versão reduzida e sem `loading="lazy"`.
3. **Consultas grandes na portaria.** `useMovimentacoes` e `useMovimentacoesAtivasPatio` fazem `select("*")` (todas as ~50 colunas) sem limite de linhas, com atualização automática a cada 15s em 4 hooks de veículos esperados simultâneos. Cada refetch cria um novo array na memória e o cache guarda tudo por 5 minutos.
4. **Cache do React Query segurando dados antigos** (`gcTime` de 5 min) somado a atualização em segundo plano mesmo com a aba escondida.

## O que vou fazer

**Fotos (maior ganho)**
- Comprimir e redimensionar toda foto no próprio aparelho antes de enviar: no máximo 1600px no lado maior, JPEG qualidade ~0,7 (fica em 200–500 KB). Usa `createImageBitmap` + canvas e libera o bitmap logo depois.
- Usar essa versão reduzida tanto no upload quanto na pré-visualização, sempre revogando o object URL ao trocar/fechar.
- Adicionar `loading="lazy"` e `decoding="async"` nas imagens de detalhe/comprovante, e liberar a imagem quando o diálogo fecha.

**Consultas da portaria**
- Trocar `select("*")` por lista explícita de colunas nos hooks de movimentações (histórico e pátio) — corta o volume de dados por linha.
- Limitar a janela do histórico e aplicar `limit` de segurança nas consultas de pátio/histórico.
- Pausar as atualizações automáticas de 15s quando a aba não está visível (`refetchIntervalInBackground: false` + checagem de `document.hidden`).

**Cache**
- Reduzir `gcTime` para ~2 min e manter `staleTime` atual, para o navegador soltar dados que não estão em tela.

## Detalhes técnicos
- Novo helper `src/lib/image-compress.ts` (`comprimirImagem(file, { maxLado: 1600, qualidade: 0.7 })`), com fallback para o arquivo original se o canvas falhar.
- `src/components/portaria/CapturaFoto.tsx`: comprime no `handleChange`/paste e entrega o File reduzido em `onCapture`.
- `src/hooks/useMovimentacoesPortaria.ts`: `uploadFotoMovimentacao` comprime antes do `storage.upload`; colunas explícitas nos dois hooks de query; `limit` de segurança.
- `src/hooks/useVeiculosEsperados.ts` e `SolicitacoesPendentesPanel.tsx` / `useCargasDiaExpedicao.ts`: `refetchIntervalInBackground: false`.
- `src/components/portaria/MovimentoDetailsDialog.tsx`, `PhotoViewerDialog.tsx`, `ComprovantePortariaDialog.tsx`: `loading="lazy"`, `decoding="async"`, imagem desmontada ao fechar.
- `src/App.tsx`: `gcTime: 2 * 60 * 1000`.

Nada muda no fluxo operacional nem nos dados já gravados — as fotos antigas continuam como estão; só as novas passam a ser mais leves.
