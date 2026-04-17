
User quer de volta os itens **Motoristas, Caminhões e Tipos de Caminhão** no menu lateral, dentro do grupo Portaria. As páginas e rotas já existem (`/motoristas`, `/caminhoes`, `/tipos-caminhao`) — só precisam ser religadas no `AppSidebar`.

## Plano

### `src/components/AppSidebar.tsx`
Adicionar 3 leaves ao grupo **Portaria** (logo após "Cadastros"):

- `{ to: "/motoristas", label: "Motoristas", icon: Contact, roles: ["admin","logistica","portaria"] }`
- `{ to: "/caminhoes", label: "Caminhões", icon: Truck, roles: ["admin","logistica"] }`
- `{ to: "/tipos-caminhao", label: "Tipos de Caminhão", icon: Truck, roles: ["admin","logistica"] }`

(Ícones `Contact` e `Truck` já estão importados no arquivo.)

### Sem mudanças em
- Rotas (`App.tsx` já registra as três).
- Páginas, hooks, banco.
