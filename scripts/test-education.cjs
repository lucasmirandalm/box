// Unit tests of the actual TypeScript helpers and server actions using mocks.
// Run with pnpm test:education. Integration tests require the existing Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relativePath, imports = {}) {
  const filename = path.join(root, relativePath);
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  const resolve = name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  };
  new Function('require', 'module', 'exports', result.outputText)(resolve, module, module.exports);
  return module.exports;
}

class Redirect extends Error {
  constructor(url) { super(url); this.url = url; }
}
const navigation = { redirect(url) { throw new Redirect(url); } };
const roles = load('src/lib/account/roles.ts');
let user = { id: 'user-1' };
let role = 'student';
let rpcCalls = [];
let signup = null;
const supabase = {
  auth: {
    getUser: async () => ({ data: { user } }),
    signUp: async args => { signup = args; return { data: { session: null }, error: null }; },
  },
  from(table) {
    assert.equal(table, 'box_account_roles');
    return {
      select(column) {
        assert.equal(column, 'role');
        return { eq(key, value) {
          assert.equal(key, 'user_id'); assert.equal(value, user.id);
          return { maybeSingle: async () => ({ data: role ? { role } : null, error: null }) };
        } };
      },
    };
  },
  async rpc(name, args) {
    rpcCalls.push({ name, args });
    return { data: name === 'box_choose_account_role' ? args.p_role : 'ABC123', error: null };
  },
};
const client = { createClient: async () => supabase };
const server = load('src/lib/account/server.ts', {
  'next/navigation': navigation, '@/lib/supabase/server': client, './roles': roles,
});
const roomActions = load('src/lib/rooms/actions.ts', {
  'next/navigation': navigation, '@/lib/supabase/server': client, '@/lib/account/server': server,
});
const authActions = load('src/lib/auth/actions.ts', {
  'next/navigation': navigation, 'next/cache': { revalidatePath() {} },
  '@/lib/supabase/server': client, '@/lib/account/server': server, '@/lib/account/roles': roles,
});
const form = values => { const data = new FormData(); for (const [k, v] of Object.entries(values)) data.set(k, v); return data; };
const redirectsTo = (fn, url) => assert.rejects(fn, e => e instanceof Redirect && e.url.startsWith(url));

(async () => {
  assert.equal(roles.isAccountRole('teacher'), true);
  assert.equal(roles.isAccountRole('student'), true);
  for (const invalid of ['admin', 'Professor', null, undefined, '', {}, 1]) assert.equal(roles.isAccountRole(invalid), false);
  assert.equal(roles.accountRoleLabel('teacher'), 'Professor');
  assert.equal(roles.accountRoleLabel('student'), 'Aluno');
  assert.deepEqual(roles.parseClassroomRoles([{user_id:'a',role:'teacher'}, {user_id:'b',role:'student'}, {user_id:'c',role:'admin'}, null]), {a:'teacher',b:'student'});
  assert.deepEqual(roles.parseClassroomRoles(null), {});

  // Students cannot create even if the server action is called directly.
  await redirectsTo(() => roomActions.createRoom(form({ name: 'Perspectiva' })), '/entrar-na-sala?error=');
  assert.equal(rpcCalls.length, 0);
  // Both account types may join an existing room.
  await redirectsTo(() => roomActions.joinRoom(form({ code: 'abc123' })), '/sala/ABC123');
  assert.deepEqual(rpcCalls.pop(), { name: 'join_room', args: { p_code: 'ABC123' } });
  role = 'teacher';
  await redirectsTo(() => roomActions.createRoom(form({ name: 'Perspectiva' })), '/sala/ABC123');
  assert.deepEqual(rpcCalls.pop(), { name: 'create_room', args: { p_name: 'Perspectiva' } });
  await redirectsTo(() => roomActions.joinRoom(form({ code: 'abc123' })), '/sala/ABC123');
  assert.equal(rpcCalls.pop().name, 'join_room');
  await redirectsTo(() => roomActions.createRoom(form({ name: '' })), '/criar-sala?error=');
  assert.equal(rpcCalls.length, 0);

  // Existing roles cannot be changed through the onboarding action.
  role = 'student';
  await redirectsTo(() => authActions.chooseAccountRole(form({ role: 'teacher' })), '/');
  assert.equal(rpcCalls.length, 0);
  // Legacy accounts must select a role first.
  role = null;
  await redirectsTo(() => roomActions.createRoom(form({ name: 'Aula' })), '/definir-perfil');
  await redirectsTo(() => roomActions.joinRoom(form({ code: 'ABC123' })), '/definir-perfil');
  await redirectsTo(() => authActions.chooseAccountRole(form({ role: 'teacher' })), '/');
  assert.deepEqual(rpcCalls.pop(), { name: 'box_choose_account_role', args: { p_role: 'teacher' } });
  user = null;
  await redirectsTo(() => roomActions.createRoom(form({ name: 'Aula' })), '/entrar');
  assert.equal(rpcCalls.length, 0);

  // Signup rejects invalid/missing roles and passes the valid role to Auth.
  const credentials = { name: 'Teste', email: 'teste@example.com', password: 'password123', confirmPassword: 'password123' };
  await redirectsTo(() => authActions.register(form(credentials)), '/criar-conta?error=');
  assert.equal(signup, null);
  await redirectsTo(() => authActions.register(form({ ...credentials, role: 'admin' })), '/criar-conta?error=');
  assert.equal(signup, null);
  for (const value of ['teacher', 'student']) {
    await redirectsTo(() => authActions.register(form({ ...credentials, role: value })), '/entrar?message=');
    assert.equal(signup.options.data.box_role, value);
  }
  console.log('PASS: account roles, signup, onboarding, teacher-only creation, student/teacher joining, unauthenticated access (mocked server actions).');
})().catch(error => { console.error(error); process.exitCode = 1; });
