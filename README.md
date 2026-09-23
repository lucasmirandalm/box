# 🎨 Box

<p align="center">
  Uma aplicação web colaborativa para desenhar, criar e compartilhar ideias em tempo real.
</p>

<p align="center">
  <strong>Next.js • TypeScript • Tailwind CSS • Supabase • Canvas API</strong>
</p>

---

## ✨ Sobre o projeto

**Box** é uma aplicação web de desenho colaborativo desenvolvida como projeto de TCC.

A proposta é permitir que usuários criem salas privadas, convidem outras pessoas e desenhem juntos em um mesmo canvas em tempo real.

O editor é inspirado em softwares de desenho como o **Krita**, mas com uma interface simplificada e focada em colaboração.

No MVP, cada sala terá suporte para até **5 participantes simultâneos**.

---

## 🖼️ Preview

![Preview do Box](./public/images/demo-cover.webp)

A identidade visual do Box utiliza:

- Tema dark
- Cor principal `#ff1152`
- Fonte **M PLUS Rounded 1c**
- Interface arredondada e minimalista
- Editor inspirado em aplicações profissionais de desenho

---

## 🚀 Funcionalidades

### ✅ Implementado

#### Autenticação

- Criação de conta
- Login com e-mail e senha
- Sessão persistente
- Logout
- Proteção de páginas privadas
- Integração com Supabase Auth

#### Perfil

- Nome do usuário
- E-mail
- Alteração de senha
- Pronome
- Avatar com inicial do nome
- Estrutura preparada para foto de perfil

#### Landing page

- Interface responsiva
- Tema dark
- Estado diferente para usuários autenticados e não autenticados
- Menu de perfil
- Links para criação e entrada em salas
- Vídeo demonstrativo

#### Editor

- Canvas real com HTML Canvas API
- Brush
- Alteração do tamanho do brush
- Seleção de cor
- Borracha
- Alteração do tamanho da borracha
- Zoom com scroll do mouse
- Limites de zoom
- Interface inspirada em softwares como Krita

---

## 🛠️ Em desenvolvimento

- Criação real de salas
- Código único para cada sala
- Entrada em salas por código
- Limite de 5 participantes
- Sincronização de desenhos em tempo real
- Cursores dos participantes
- Lista de usuários conectados
- Convites por link
- Persistência dos desenhos
- Histórico de alterações
- Undo / Redo
- Ferramenta de mover canvas
- Camadas
- Upload de avatar
- Recuperação de senha
- Melhorias para dispositivos com caneta e tablet gráfico

---

## 🧠 Objetivo acadêmico

O Box busca explorar conceitos relacionados a aplicações web colaborativas em tempo real, incluindo:

- Comunicação bidirecional
- Sincronização de estado
- Concorrência entre usuários
- Eventos em tempo real
- Autenticação
- Persistência de dados
- Arquitetura cliente-servidor
- Experiência de usuário em aplicações colaborativas

Além da implementação da aplicação, o projeto poderá avaliar aspectos como:

- Latência na sincronização entre clientes
- Quantidade de eventos transmitidos
- Desempenho com múltiplos participantes
- Consistência do estado do canvas
- Comportamento da aplicação sob diferentes cargas

---

## 🧱 Tecnologias

### Frontend

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide](https://lucide.dev/)
- HTML Canvas API

### Backend

O próprio **Next.js** é utilizado para a lógica server-side da aplicação.

Atualmente utilizamos:

- Server Components
- Server Actions
- Route Handlers
- Cookies de sessão

### Autenticação e banco

- [Supabase](https://supabase.com/)
- Supabase Auth
- PostgreSQL

### Futuro tempo real

A camada colaborativa será implementada com comunicação em tempo real, provavelmente utilizando:

- WebSocket
- Socket.IO

---

## 🏗️ Arquitetura planejada

```text
                         BOX
                          │
                      Next.js
              ┌───────────┴───────────┐
              │                       │
          Interface                Backend
              │                       │
       React + Canvas          Server Actions
              │                       │
              ├───────────┬───────────┤
              │           │           │
          Supabase     PostgreSQL   WebSocket
              │                       │
      autenticação                 desenho
      usuários                     cursores
      perfis                       presença
      sessões                      eventos
      salas                        tempo real
```

---

## 📁 Estrutura do projeto

A estrutura poderá mudar durante o desenvolvimento.

```text
box/
├── public/
│   ├── images/
│   └── videos/
│
├── src/
│   ├── app/
│   │   ├── criar-conta/
│   │   ├── criar-sala/
│   │   ├── entrar/
│   │   ├── entrar-na-sala/
│   │   ├── perfil/
│   │   ├── sala/
│   │   │   └── [roomCode]/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   └── room/
│   │       └── room-editor.tsx
│   │
│   └── lib/
│       ├── auth/
│       │   └── actions.ts
│       ├── profile/
│       │   └── actions.ts
│       └── supabase/
│           ├── client.ts
│           └── server.ts
│
├── .env.local
├── package.json
├── pnpm-lock.yaml
└── README.md
```

---

## ⚙️ Como executar o projeto

### Pré-requisitos

Antes de começar, você precisa ter instalado:

- Node.js
- pnpm
- Git

Confira as versões:

```bash
node --version
pnpm --version
git --version
```

---

### 1. Clone o repositório

```bash
git clone git@github.com:SEU_USUARIO/box.git
```

Entre na pasta:

```bash
cd box
```

---

### 2. Instale as dependências

```bash
pnpm install
```

---

### 3. Configure o Supabase

Crie um projeto em:

https://supabase.com/

Depois crie o arquivo:

```text
.env.local
```

na raiz do projeto.

Adicione:

```env
NEXT_PUBLIC_SUPABASE_URL=SUA_PROJECT_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLISHABLE_KEY
```

Nunca envie chaves privadas ou `service_role` para o GitHub.

---

### 4. Execute o projeto

```bash
pnpm dev
```

Abra:

```text
http://localhost:3000
```

---

## 🔐 Autenticação

O Box utiliza **Supabase Auth**.

O fluxo atual é:

```text
Criar conta
      ↓
Supabase Auth
      ↓
Sessão
      ↓
Landing page autenticada
      ↓
Criar sala / Entrar em uma sala
```

As páginas privadas verificam a sessão antes de permitir o acesso.

---

## 🎨 Editor

O editor atualmente possui duas ferramentas principais.

### Brush

Permite:

- Desenhar no canvas
- Alterar a cor
- Alterar o tamanho

### Borracha

Permite:

- Apagar partes do desenho
- Alterar o tamanho da borracha

A borracha utiliza:

```text
globalCompositeOperation = destination-out
```

para remover realmente os pixels desenhados.

---

## 🔎 Zoom

O zoom é controlado pela roda do mouse.

```text
Scroll para cima
        ↓
Aumenta o zoom

Scroll para baixo
        ↓
Diminui o zoom
```

Limites atuais:

```text
25% → 300%
```

O cálculo das coordenadas do ponteiro considera o tamanho visual do canvas após a aplicação do zoom.

---

## 👥 Salas

O MVP será limitado a:

```text
5 participantes por sala
```

O fluxo planejado é:

```text
Usuário autenticado
        ↓
Criar sala
        ↓
Código gerado
        ↓
/sala/ABC123
        ↓
Compartilhar código ou link
        ↓
Outros participantes entram
```

---

## 🌐 Colaboração em tempo real

A arquitetura planejada para o multiplayer é:

```text
Usuário desenha
      ↓
Canvas
      ↓
evento de desenho
      ↓
WebSocket / Socket.IO
      ↓
Servidor
      ↓
Outros participantes
      ↓
Canvas atualizado
```

Eventos temporários, como movimentos do pincel e cursores, não devem ser armazenados diretamente no PostgreSQL a cada movimento.

---

## 🗄️ Persistência

O PostgreSQL será utilizado para informações persistentes, como:

```text
users
rooms
room_members
drawings
```

Exemplo planejado:

```text
rooms

id
name
code
owner_id
created_at
```

E:

```text
room_members

room_id
user_id
joined_at
```

---

## 🗺️ Roadmap

### Etapa 1 — Base do projeto

- [x] Next.js
- [x] TypeScript
- [x] Tailwind CSS
- [x] Identidade visual
- [x] Landing page

### Etapa 2 — Usuários

- [x] Cadastro
- [x] Login
- [x] Logout
- [x] Sessão
- [x] Perfil
- [x] Pronome
- [ ] Upload de avatar
- [ ] Recuperação de senha

### Etapa 3 — Editor

- [x] Canvas
- [x] Brush
- [x] Cor
- [x] Tamanho do brush
- [x] Borracha
- [x] Tamanho da borracha
- [x] Zoom
- [ ] Pan
- [ ] Undo
- [ ] Redo
- [ ] Rotação
- [ ] Camadas
- [ ] Novos brushes

### Etapa 4 — Salas

- [ ] Criar sala
- [ ] Gerar código
- [ ] Entrar por código
- [ ] Limite de participantes
- [ ] Dono da sala
- [ ] Convite por link

### Etapa 5 — Multiplayer

- [ ] WebSocket
- [ ] Socket.IO
- [ ] Desenho sincronizado
- [ ] Cursores em tempo real
- [ ] Entrada e saída de participantes
- [ ] Reconexão

### Etapa 6 — Persistência

- [ ] Salvar desenho
- [ ] Restaurar desenho
- [ ] Histórico
- [ ] Banco de salas
- [ ] Participantes

### Etapa 7 — TCC

- [ ] Testes de carga
- [ ] Testes de latência
- [ ] Avaliação de desempenho
- [ ] Diagramas
- [ ] Documentação
- [ ] Deploy
- [ ] Apresentação

---

## 🎯 MVP

O MVP do Box será considerado completo quando for possível:

1. Criar uma conta.
2. Fazer login.
3. Criar uma sala.
4. Compartilhar o código da sala.
5. Entrar em uma sala existente.
6. Ter até 5 participantes simultaneamente.
7. Desenhar no mesmo canvas em tempo real.
8. Utilizar brush e borracha.
9. Alterar cor e tamanho do brush.
10. Visualizar os participantes conectados.

---

## 🧪 Testes planejados

O projeto poderá ser testado com diferentes quantidades de clientes simultâneos:

```text
1 usuário
5 usuários
10 usuários
20 usuários
50 usuários
```

Mesmo que o MVP limite uma sala a 5 pessoas, quantidades maiores poderão ser utilizadas para testes experimentais de carga.

Métricas de interesse:

- Latência
- Eventos por segundo
- Consumo de memória
- Utilização de CPU
- Uso de rede
- Consistência entre clientes

---

## 📌 Status

> 🚧 Projeto em desenvolvimento.

O Box ainda está em fase de implementação e diversas funcionalidades descritas neste README fazem parte do roadmap.

---

## 🎓 Contexto

Este projeto está sendo desenvolvido como **Trabalho de Conclusão de Curso (TCC)** e também como projeto de portfólio.

O foco técnico principal é estudar e implementar uma aplicação web colaborativa de desenho em tempo real.

---

## 📄 Licença

A licença do projeto ainda será definida.

---

<p align="center">
  <strong>Box</strong>
  <br />
  Uma tela. Muitas ideias. Juntos.
</p>
