

# Revisao Final de Responsividade + PWA

## Problemas de Responsividade Restantes

### 1. `CarregamentoDialog.tsx` - Grid de produtos em mobile
- Linha 213: `grid-cols-2` em mobile com 5 campos (codigo, nome, qtd, peso, botao) nao distribui bem
- Solucao: `grid-cols-1` em mobile, empilhando cada campo com label visivel sempre

### 2. `Usuarios.tsx` - Dialog de criar usuario
- `DialogContent` sem classe de largura responsiva (`w-[calc(100vw-2rem)] sm:w-full`)

### 3. `Usuarios.tsx` - Tabela em mobile
- Email pode transbordar; coluna "Nivel" com `w-[180px]` pode comprimir em telas pequenas
- Adicionar mobile card view como no CarregamentoTable

### 4. `Filters.tsx` - Campo de busca
- Em mobile com `col-span-2 sm:col-span-1`, o input ainda tem `md:w-[200px]` que pode conflitar
- Garantir `w-full` sempre em mobile

### 5. `AppSidebar.tsx` - OK (sidebar com overlay mobile ja funciona)
### 6. `Auth.tsx` - OK (responsiva)
### 7. `KpiCards.tsx` - OK (grid responsivo)
### 8. `CarregamentoTable.tsx` - OK (mobile cards)

---

## PWA Setup

### Dependencia
- Instalar `vite-plugin-pwa`

### `vite.config.ts`
- Adicionar `VitePWA` plugin com manifest, icons, registerType auto, navigateFallbackDenylist para `/~oauth`

### `index.html`
- Adicionar meta tags para mobile: `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
- Link para manifest e apple-touch-icon

### Icones PWA
- Criar `public/pwa-192x192.png` e `public/pwa-512x512.png` (icones simples com as cores do app)
- `public/apple-touch-icon.png`

### Manifest (via plugin)
- name: "Expedição - Painel Logístico"
- short_name: "Expedição"
- theme_color: cor primaria do app
- background_color: branco
- display: standalone
- start_url: /
- icons 192 e 512

---

## Arquivos Alterados (5 arquivos)
1. `vite.config.ts` - PWA plugin
2. `index.html` - meta tags mobile
3. `src/components/dashboard/CarregamentoDialog.tsx` - grid produtos mobile
4. `src/pages/Usuarios.tsx` - dialog width + mobile cards
5. `src/components/dashboard/Filters.tsx` - busca w-full fix

