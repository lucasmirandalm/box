# Box — Ensino de desenho digital

Ambiente web colaborativo para apoiar a interação entre professores e alunos durante atividades de desenho digital. O Box é o artefato computacional de uma pesquisa aplicada em Sistemas de Informação, com foco em sistemas colaborativos, IHC e informática na educação.

**Proposta acadêmica:** Desenvolvimento e avaliação de um sistema web de desenho colaborativo em tempo real para apoio ao ensino de desenho digital.

## Funcionalidades desta versão

- Cadastro e login com Supabase Auth. O usuário escolhe Professor (`teacher`) ou Aluno (`student`).
- Contas antigas definem seu papel uma única vez após entrar, sem precisar criar outra conta.
- Página inicial e ações de acordo com o papel. Somente professores criam aulas; ambos os perfis podem participar por código.
- A aula possui tema, código de seis caracteres e limite original de cinco participantes no total.
- Identificação do professor responsável e dos papéis dos participantes no editor; o responsável possui botão para copiar o código da aula.
- Quadro compartilhado em tempo real, pincel, borracha, roda de cores, camadas, zoom, pan, desfazer e exportação PNG, preservados do código anterior.
- O professor pode demonstrar técnicas e orientar visualmente os alunos desenhando no quadro compartilhado. Ainda não há camadas de feedback exclusivas, quadro individual por aluno, gestão de atividades ou encerramento forçado da aula.

## Tecnologias

Next.js, React, TypeScript, Tailwind CSS, Lucide, HTML Canvas API, Supabase Auth, PostgreSQL e Supabase Realtime. Identidade visual dark theme, `#ff1152` e M PLUS Rounded 1c.

## Atualização do projeto existente (obrigatória)

Esta entrega é uma atualização do projeto BOX que já usa o Supabase. O ZIP original não contém o SQL completo do banco. A migração incluída pressupõe as tabelas `public.rooms` (id, code, owner_id, name, max_participants) e `public.room_members` (room_id, user_id), as funções RPC existentes e as políticas Realtime originais. Não é um instalador de banco do zero.

1. Faça backup do código e do banco. Se possível, use um ambiente de teste e aguarde as aulas antigas expirarem antes de migrar.
2. No Supabase Dashboard, abra **SQL Editor > New query**. Cole e execute todo o arquivo `supabase/migrations/202611180001_education_roles.sql`. A migração é transacional; se houver erro, não publique o novo código antes de corrigir o problema. Não remova as tabelas nem as funções antigas.
3. Copie o conteúdo deste projeto para a pasta do BOX (preserve seu `.env.local` e `.git`). O ZIP não inclui segredos.
4. Instale as dependências e inicie:

```bash
pnpm install
pnpm test:education
pnpm dev
```

O `.env.local` existente deve conter:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

Para verificar a compilação completa antes de publicar:

```bash
pnpm exec tsc --noEmit
pnpm build
```

## Permissões e decisões de implementação

A tabela `box_account_roles` é a fonte de autorização. O papel escolhido no cadastro é gravado por um trigger de inserção em `auth.users`; mudanças posteriores em `user_metadata` não alteram a autorização. O usuário autenticado pode consultar apenas seu próprio papel diretamente e não pode gravá-lo ou alterá-lo. A RPC `box_choose_account_role` permite uma única escolha para contas antigas sem papel. A RPC `box_classroom_roles` permite que membros de uma aula consultem os papéis dos demais membros. O servidor verifica a associação à aula e as permissões antes de renderizar o editor.

A criação é verificada em três pontos: página `/criar-sala`, Server Action `createRoom` e trigger `box_guard_room_owner` na tabela `rooms`. O trigger exige que o proprietário seja o usuário autenticado e que tenha papel de professor, inclusive quando a inserção ocorre pela RPC `create_room` existente. Alterações do proprietário também são bloqueadas. O trigger não modifica a lógica de código, limite, sessões ou expiração. Ele impede inserções administrativas sem um usuário autenticado; se for necessário criar salas por processos administrativos, revise esse fluxo com cuidado.

A escolha Professor/Aluno é autodeclarada, conforme a proposta do protótipo. Não existe verificação de vínculo institucional. Um aluno não pode promover sua conta existente, mas pode criar uma nova conta e escolher Professor. Para uma implantação institucional, considere validação de professores ou aprovação administrativa.

O botão de copiar código aparece apenas para o professor responsável. Isso é uma conveniência de interface, não uma restrição de compartilhamento: quem entra por código já conhece esse código. O sistema mantém a colaboração original; os rótulos dos participantes não são utilizados para autorizar eventos Realtime. Uma política de edição exclusiva por professor exigirá validação adicional dos eventos e das camadas.

### Contas existentes

Após o login, a conta antiga é direcionada para `/definir-perfil`. Escolha Professor ou Aluno. Depois disso, o papel não pode ser modificado pelo formulário de perfil. As contas antigas não são apagadas. Aulas antigas não são removidas pela migração e seguem as regras de expiração já existentes.

Se um administrador precisar corrigir uma escolha feita por engano, pode executar no SQL Editor, substituindo o e-mail e o papel pelos valores corretos:

```sql
update public.box_account_roles
set role = 'teacher'
where user_id = (select id from auth.users where email = 'professor@exemplo.com');
```

Esse comando é administrativo, não deve ser exposto no cliente. Use `'student'` para reverter o papel, e recarregue a aplicação após a alteração.

## Testes de integração recomendados

Os testes unitários em `scripts/test-education.cjs` usam mocks para verificar as Server Actions. Eles não substituem os testes com Supabase real.

1. Crie duas contas de teste, uma Professor e uma Aluno, e confirme os e-mails conforme sua configuração de Auth.
2. Entre como Professor, crie uma aula com tema e copie o código.
3. Entre como Aluno em outro navegador/perfil. Confirme que não há botão Criar aula e que `/criar-sala` redireciona com aviso.
4. Confirme que a RPC `create_room` chamada diretamente com a sessão do aluno é rejeitada pelo banco (`TEACHER_ONLY` ou erro equivalente), sem criar uma sala. Confirme também que a RPC `box_choose_account_role` rejeita uma segunda escolha.
5. Entre na aula pelo código. Confira o tema, a identificação dos participantes, a sincronização de traços e o limite de cinco participantes.
6. Teste roda de cores, camadas, desfazer, zoom, toque e exportação PNG. Confira a expiração da sala após a saída dos participantes.
7. Entre com uma conta antiga sem papel. Confirme a tela de escolha única e que o login seguinte não solicita novamente.
8. Teste o acesso a uma aula sem ser membro. A RPC `box_classroom_roles` deve rejeitar a consulta.

## Próximas etapas acadêmicas

Levantamento de requisitos com professores e estudantes; camada de correção docente sem alterar o desenho original; modo demonstração; persistência de atividades; avaliação de usabilidade, latência e clareza do feedback visual. A pesquisa deverá distinguir resultados técnicos e utilidade percebida de evidências de melhora na aprendizagem.
