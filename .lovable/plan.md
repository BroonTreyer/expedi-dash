

# Paleta de Cores Fricó para o Sistema

A marca Fricó tem como cores dominantes o **vermelho vivo**, **verde** (detalhe do logo) e **branco**. Vou criar uma paleta profissional para o sistema de expedição inspirada nessas cores.

## Paleta Proposta

```text
┌─────────────────────────────────────────────┐
│  PRIMARY (vermelho Fricó)   #D42027         │
│  Sidebar / Header escuro    #2D1215         │
│  Accent (verde Fricó)       #4CAF50         │
│  Background claro           #FBF5F5         │
│  Cards                      #FFFFFF         │
│  Texto principal            #1A1A1A         │
│  Muted/Secondary            #F5EDED         │
│  Borders                    #E8D5D5         │
└─────────────────────────────────────────────┘
```

## Alterações

### 1. `src/index.css` - Variáveis CSS
Atualizar todas as variáveis `:root` e `.dark` com a nova paleta:
- **Primary**: vermelho Fricó (#D42027) → `0 76% 48%`
- **Background**: tom rosado muito sutil
- **Sidebar**: tom escuro avermelhado (#2D1215)
- **Sidebar primary**: vermelho vibrante
- **Accent/Secondary**: tons neutros com leve toque quente
- **Status colors**: mantidos (funcionais), mas com ajuste leve no "carregado" para usar o verde Fricó

### 2. `tailwind.config.ts`
Sem alterações estruturais — as cores já usam variáveis CSS.

### 3. `src/components/AppSidebar.tsx`
Trocar o ícone de cor do título para usar o vermelho da marca (já via variável).

### Resultado
Sistema com identidade visual Fricó: sidebar escura avermelhada, botões e destaques em vermelho, acentos em verde, mantendo legibilidade e profissionalismo para uso operacional.

