import './setupEnv';
import request from 'supertest';
import {
  cleanupTestDatabase,
  getTestDbPath,
} from './setupEnv';
import createTestApp from './testApp';
import { authHeaders, ADMIN_USER_ID, NO_PERM_USER_ID } from './helpers';
import { shutdownDatabasePool, initDatabase, getDb } from '../src/database';
import { DatabaseSync } from 'node:sqlite';

describe('用户管理 API 测试', () => {
  let app: ReturnType<typeof createTestApp>;
  let db: DatabaseSync;

  beforeAll(() => {
    process.env.TEST_DB_PATH = getTestDbPath();
    initDatabase();
    db = getDb() as DatabaseSync;
    app = createTestApp();
  });

  afterAll(() => {
    shutdownDatabasePool();
    cleanupTestDatabase();
  });

  beforeEach(() => {
    db.exec('BEGIN TRANSACTION');
    db.exec('DELETE FROM operation_logs');
    db.exec('DELETE FROM import_history');
    db.exec('DELETE FROM messages');
    db.exec('DELETE FROM user_roles');
    db.exec('DELETE FROM role_permissions');
    db.exec('DELETE FROM users WHERE id > 10');
    db.exec('DELETE FROM roles WHERE id > 4');
    db.exec('DELETE FROM permissions WHERE id > 8');

    const insertUser = db.prepare(
      'INSERT INTO users (id, name, email, phone, status) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, phone=excluded.phone, status=excluded.status'
    );
    const users = [
      [1, '张三', 'zhangsan@example.com', '13800138001', 'active'],
      [2, '李四', 'lisi@example.com', '13800138002', 'active'],
      [3, '王五', 'wangwu@example.com', '13800138003', 'inactive'],
      [4, '赵六', 'zhaoliu@example.com', '13800138004', 'active'],
      [5, '钱七', 'qianqi@example.com', '13900138005', 'active'],
      [6, '孙八', 'sunba@example.com', '13900138006', 'active'],
      [7, '周九', 'zhoujiu@example.com', '13900138007', 'inactive'],
      [8, '吴十', 'wushi@example.com', '13900138008', 'active'],
      [9, '测试管理员', 'admin@test.com', '13811112222', 'active'],
      [10, '测试无权限用户', 'noperm@test.com', '13833334444', 'active'],
    ];
    for (const user of users) {
      insertUser.run(...user);
    }

    const assignRolePerm = db.prepare(
      'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
    );
    for (let i = 1; i <= 7; i++) {
      assignRolePerm.run(1, i);
    }
    for (let i = 1; i <= 5; i++) {
      assignRolePerm.run(2, i);
    }
    assignRolePerm.run(3, 1);
    assignRolePerm.run(3, 2);

    const insertUserRole = db.prepare(
      'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)'
    );
    insertUserRole.run(9, 1);
    insertUserRole.run(1, 2);
    insertUserRole.run(2, 3);
    insertUserRole.run(10, 4);

    db.exec('COMMIT');
  });

  describe('GET /api/users - 用户列表查询', () => {
    it('应该成功获取用户列表（默认分页）', async () => {
      const res = await request(app)
        .get('/api/users')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.filteredTotal).toBeGreaterThan(0);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('email');
      expect(res.body.data[0]).toHaveProperty('status');
    });

    it('应该支持分页功能 - 自定义 page 和 pageSize', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ page: 1, pageSize: 20 })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(10);
      expect(res.body.total).toBe(10);
    });

    it('应该验证 pageSize 只接受有效值（10, 20, 50, 100）', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ page: 1, pageSize: 3 })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(10);
    });

    it('应该处理无效的分页参数', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ page: -1, pageSize: -5 })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
    });

    it('应该支持按姓名搜索', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ search: '张三' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.filteredTotal).toBe(1);
      expect(res.body.data[0].name).toBe('张三');
    });

    it('应该支持按邮箱搜索', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ search: 'zhangsan@example.com' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].email).toContain('zhangsan');
    });

    it('应该支持按状态过滤 - active', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ statuses: 'active' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((user: any) => {
        expect(user.status).toBe('active');
      });
    });

    it('应该支持按状态过滤 - inactive', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ statuses: 'inactive' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((user: any) => {
        expect(user.status).toBe('inactive');
      });
    });

    it('应该支持按状态过滤 - 多状态', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ statuses: 'active,inactive' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.filteredTotal).toBe(res.body.total);
    });

    it('应该忽略无效的状态值（混合有效和无效状态）', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ statuses: 'active,invalid_status' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      if (res.body.data && res.body.data.list) {
        expect(res.body.data.list.length).toBeGreaterThan(0);
      }
    });

    it('应该处理全是无效状态值的情况（返回空列表）', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ statuses: 'invalid1,invalid2' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该支持按手机号前缀过滤', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ phone_prefix: '139' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((user: any) => {
        expect(user.phone).toMatch(/^139/);
      });
    });

    it('应该支持按创建时间范围过滤', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const res = await request(app)
        .get('/api/users')
        .query({
          created_at_start: yesterday.toISOString().split('T')[0],
          created_at_end: tomorrow.toISOString().split('T')[0],
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('应该支持排序 - 按姓名升序', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ sortBy: 'name', sortOrder: 'asc' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const names = res.body.data.map((u: any) => u.name);
      for (let i = 1; i < names.length; i++) {
        expect(names[i - 1] <= names[i]).toBe(true);
      }
    });

    it('应该支持排序 - 按创建时间降序（默认）', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ sortBy: 'created_at', sortOrder: 'desc' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const dates = res.body.data.map((u: any) => u.created_at);
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1] >= dates[i]).toBe(true);
      }
    });

    it('应该处理无效的排序字段', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ sortBy: 'invalid_field', sortOrder: 'asc' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该处理无效的排序顺序', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ sortBy: 'name', sortOrder: 'invalid' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝无效的用户 ID', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('x-user-id', 'invalid');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝权限不足的用户', async () => {
      const res = await request(app)
        .get('/api/users')
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('应该返回用户的角色信息', async () => {
      const res = await request(app)
        .get('/api/users')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const adminUser = res.body.data.find((u: any) => u.id === ADMIN_USER_ID);
      expect(adminUser).toBeDefined();
      expect(Array.isArray(adminUser.roles)).toBe(true);
    });
  });

  describe('GET /api/users/:id - 获取单个用户', () => {
    it('应该成功获取用户详情', async () => {
      const res = await request(app)
        .get('/api/users/1')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.email).toBeDefined();
      expect(Array.isArray(res.body.data.roles)).toBe(true);
    });

    it('应该处理无效的用户 ID', async () => {
      const res = await request(app)
        .get('/api/users/invalid')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该返回 404 当用户不存在时', async () => {
      const res = await request(app)
        .get('/api/users/99999')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).get('/api/users/1');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users - 新增用户', () => {
    it('应该成功创建用户', async () => {
      const userData = {
        name: '测试用户',
        email: 'testuser@example.com',
        phone: '13812345678',
        status: 'active' as const,
      };

      const res = await request(app)
        .post('/api/users')
        .send(userData)
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(userData.name);
      expect(res.body.data.email).toBe(userData.email);
      expect(res.body.data.phone).toBe(userData.phone);
      expect(res.body.data.status).toBe(userData.status);
      expect(res.body.message).toBe('用户创建成功');
    });

    it('应该成功创建用户并分配角色', async () => {
      const userData = {
        name: '测试角色用户',
        email: 'testrole@example.com',
        phone: '13812345679',
        status: 'active' as const,
        role_ids: [2, 3],
      };

      const res = await request(app)
        .post('/api/users')
        .send(userData)
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.roles)).toBe(true);
      expect(res.body.data.roles.length).toBeGreaterThan(0);
    });

    it('应该拒绝空姓名', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: '',
          email: 'noname@example.com',
          status: 'active',
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('姓名');
    });

    it('应该拒绝空格姓名', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: '   ',
          email: 'spacename@example.com',
          status: 'active',
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝空邮箱', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: '无邮箱用户',
          email: '',
          status: 'active',
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('邮箱');
    });

    it('应该拒绝格式不正确的邮箱', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: '错误邮箱',
          email: 'invalid-email',
          status: 'active',
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('邮箱格式');
    });

    it('应该拒绝格式不正确的手机号', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: '错误手机',
          email: 'badphone@example.com',
          phone: '12345',
          status: 'active',
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('手机号');
    });

    it('应该拒绝无效的状态值', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: '无效状态',
          email: 'badstatus@example.com',
          status: 'invalid',
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('状态');
    });

    it('应该拒绝重复的邮箱', async () => {
      const userData = {
        name: '重复邮箱',
        email: 'zhangsan@example.com',
        status: 'active' as const,
      };

      const res = await request(app)
        .post('/api/users')
        .send(userData)
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('邮箱已存在');
    });

    it('应该允许空手机号', async () => {
      const userData = {
        name: '无手机用户',
        email: 'nophone@example.com',
        phone: '',
        status: 'active' as const,
      };

      const res = await request(app)
        .post('/api/users')
        .send(userData)
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('应该使用默认状态 active 当未指定时', async () => {
      const userData = {
        name: '默认状态',
        email: 'defaultstatus@example.com',
      };

      const res = await request(app)
        .post('/api/users')
        .send(userData)
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).post('/api/users').send({
        name: '未授权',
        email: 'unauth@example.com',
      });
      expect(res.status).toBe(401);
    });

    it('应该拒绝权限不足的用户', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: '无权限',
          email: 'noperm@example.com',
        })
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id - 编辑用户', () => {
    it('应该成功更新用户姓名', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({ name: '张三修改版' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('张三修改版');
      expect(res.body.message).toBe('用户更新成功');
    });

    it('应该成功更新用户邮箱', async () => {
      const res = await request(app)
        .put('/api/users/2')
        .send({ email: 'newemail@example.com' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('newemail@example.com');
    });

    it('应该成功更新用户状态', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({ status: 'inactive' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('inactive');
    });

    it('应该成功更新用户角色', async () => {
      const res = await request(app)
        .put('/api/users/3')
        .send({ role_ids: [1, 2] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该成功清空用户角色', async () => {
      const res = await request(app)
        .put('/api/users/3')
        .send({ role_ids: [] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该成功清空手机号', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({ phone: '' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe('');
    });

    it('应该处理无效的用户 ID', async () => {
      const res = await request(app)
        .put('/api/users/invalid')
        .send({ name: 'test' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该返回 404 当用户不存在时', async () => {
      const res = await request(app)
        .put('/api/users/99999')
        .send({ name: 'test' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝空姓名', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({ name: '' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝格式不正确的邮箱', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({ email: 'bad-email' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝格式不正确的手机号', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({ phone: '123' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝无效的状态值', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({ status: 'invalid' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该允许仅更新部分字段', async () => {
      const originalRes = await request(app)
        .get('/api/users/1')
        .set(authHeaders(ADMIN_USER_ID));
      const originalEmail = originalRes.body.data.email;

      const res = await request(app)
        .put('/api/users/1')
        .send({ name: '部分更新测试' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('部分更新测试');
      expect(res.body.data.email).toBe(originalEmail);
    });

    it('应该成功更新用户头像字段', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({
          avatar: '/api/avatars/test-avatar.png',
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avatar).toBe('/api/avatars/test-avatar.png');
    });

    it('应该成功清空用户头像（设置为 null）', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({
          avatar: null,
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).put('/api/users/1').send({ name: 'test' });
      expect(res.status).toBe(401);
    });

    it('应该拒绝权限不足的用户', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({ name: 'test' })
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id - 删除用户', () => {
    it('应该成功删除用户', async () => {
      const res = await request(app)
        .delete('/api/users/5')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('用户删除成功');

      const checkRes = await request(app)
        .get('/api/users/5')
        .set(authHeaders(ADMIN_USER_ID));
      expect(checkRes.status).toBe(404);
    });

    it('应该处理无效的用户 ID', async () => {
      const res = await request(app)
        .delete('/api/users/invalid')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该返回 404 当用户不存在时', async () => {
      const res = await request(app)
        .delete('/api/users/99999')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).delete('/api/users/1');
      expect(res.status).toBe(401);
    });

    it('应该拒绝权限不足的用户', async () => {
      const res = await request(app)
        .delete('/api/users/1')
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
    });

    it('删除用户时应该同时删除用户角色关联', async () => {
      const res = await request(app)
        .delete('/api/users/2')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const rolesRes = await request(app)
        .get('/api/users/2/roles')
        .set(authHeaders(ADMIN_USER_ID));
      expect(rolesRes.status).toBe(404);
    });
  });

  describe('POST /api/users/batch - 批量操作', () => {
    it('应该成功批量删除用户', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'delete', ids: [6, 7, 8] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(3);
      expect(res.body.data.fail).toBe(0);
    });

    it('应该成功批量启用用户', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'enable', ids: [3, 7] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(2);
      expect(res.body.data.fail).toBe(0);
    });

    it('应该成功批量禁用用户', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'disable', ids: [2, 4] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(2);
      expect(res.body.data.fail).toBe(0);
    });

    it('应该拒绝无效的操作类型', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'invalid', ids: [1, 2] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('操作类型');
    });

    it('应该拒绝空的 ID 列表', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'delete', ids: [] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('选择');
    });

    it('应该拒绝非数组的 IDs', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'delete', ids: 'not-array' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该处理无效的用户 ID 格式', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'delete', ids: ['invalid', 'abc'] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该回滚操作当部分 ID 不存在时（批量删除）', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'delete', ids: [1, 99999] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.data.fail).toBeGreaterThan(0);
      expect(res.body.message).toContain('回滚');

      const checkRes = await request(app)
        .get('/api/users/1')
        .set(authHeaders(ADMIN_USER_ID));
      expect(checkRes.status).toBe(200);
    });

    it('应该拒绝权限不足的用户执行批量删除', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'delete', ids: [1, 2] })
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝权限不足的用户执行批量启用', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'enable', ids: [1, 2] })
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'delete', ids: [1, 2] });

      expect(res.status).toBe(401);
    });

    it('应该处理重复的 ID', async () => {
      const res = await request(app)
        .post('/api/users/batch')
        .send({ action: 'disable', ids: [1, 1, 2, 2] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
    });
  });

  describe('GET /api/users/:id/roles - 获取用户角色', () => {
    it('应该成功获取用户角色', async () => {
      const res = await request(app)
        .get('/api/users/9/roles')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.roles)).toBe(true);
      expect(Array.isArray(res.body.data.role_ids)).toBe(true);
      expect(res.body.data.role_ids.length).toBeGreaterThan(0);
    });

    it('应该处理无效的用户 ID', async () => {
      const res = await request(app)
        .get('/api/users/invalid/roles')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该返回 404 当用户不存在时', async () => {
      const res = await request(app)
        .get('/api/users/99999/roles')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id/roles - 分配用户角色', () => {
    it('应该成功分配用户角色', async () => {
      const res = await request(app)
        .put('/api/users/4/roles')
        .send({ role_ids: [1, 2] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('角色分配成功');

      const checkRes = await request(app)
        .get('/api/users/4/roles')
        .set(authHeaders(ADMIN_USER_ID));
      expect(checkRes.body.data.role_ids).toContain(1);
      expect(checkRes.body.data.role_ids).toContain(2);
    });

    it('应该成功清空用户角色', async () => {
      const res = await request(app)
        .put('/api/users/2/roles')
        .send({ role_ids: [] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get('/api/users/2/roles')
        .set(authHeaders(ADMIN_USER_ID));
      expect(checkRes.body.data.role_ids.length).toBe(0);
    });

    it('应该处理无效的用户 ID', async () => {
      const res = await request(app)
        .put('/api/users/invalid/roles')
        .send({ role_ids: [1] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该返回 404 当用户不存在时', async () => {
      const res = await request(app)
        .put('/api/users/99999/roles')
        .send({ role_ids: [1] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝非数组的 role_ids', async () => {
      const res = await request(app)
        .put('/api/users/1/roles')
        .send({ role_ids: 'not-array' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id/detail - 获取用户详情（含操作日志）', () => {
    it('应该成功获取用户详情', async () => {
      const res = await request(app)
        .get('/api/users/1/detail')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBe(1);
      expect(Array.isArray(res.body.data.operationLogs)).toBe(true);
    });

    it('应该处理无效的用户 ID', async () => {
      const res = await request(app)
        .get('/api/users/invalid/detail')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该返回 404 当用户不存在时', async () => {
      const res = await request(app)
        .get('/api/users/99999/detail')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).get('/api/users/1/detail');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users/export - 导出用户', () => {
    it('应该成功导出所有用户', async () => {
      const res = await request(app)
        .post('/api/users/export')
        .send({})
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.downloadUrl).toBeDefined();
      expect(res.body.data.fileName).toBeDefined();
      expect(res.body.data.count).toBeGreaterThan(0);
    });

    it('应该成功按搜索条件导出用户', async () => {
      const res = await request(app)
        .post('/api/users/export')
        .send({ search: '张三' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
    });

    it('应该成功按状态过滤导出', async () => {
      const res = await request(app)
        .post('/api/users/export')
        .send({ statuses: ['inactive'] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBeGreaterThan(0);
    });

    it('应该成功按 ID 列表导出', async () => {
      const res = await request(app)
        .post('/api/users/export')
        .send({ ids: [1, 2, 3] })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(3);
    });

    it('应该支持按创建时间范围导出', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const res = await request(app)
        .post('/api/users/export')
        .send({
          created_at_start: yesterday.toISOString().split('T')[0],
          created_at_end: tomorrow.toISOString().split('T')[0],
        })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该支持按手机号前缀导出', async () => {
      const res = await request(app)
        .post('/api/users/export')
        .send({ phone_prefix: '139' })
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).post('/api/users/export').send({});
      expect(res.status).toBe(401);
    });

    it('应该拒绝权限不足的用户', async () => {
      const res = await request(app)
        .post('/api/users/export')
        .send({})
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users/export/template - 获取导入模板', () => {
    it('应该成功生成导入模板', async () => {
      const res = await request(app)
        .get('/api/users/export/template')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.downloadUrl).toBeDefined();
      expect(res.body.data.fileName).toBeDefined();
      expect(res.body.message).toBe('模板生成成功');
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).get('/api/users/export/template');
      expect(res.status).toBe(401);
    });

    it('应该拒绝权限不足的用户', async () => {
      const res = await request(app)
        .get('/api/users/export/template')
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users/import/history - 获取导入历史', () => {
    it('应该成功获取导入历史', async () => {
      const res = await request(app)
        .get('/api/users/import/history')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).get('/api/users/import/history');
      expect(res.status).toBe(401);
    });

    it('应该拒绝权限不足的用户', async () => {
      const res = await request(app)
        .get('/api/users/import/history')
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/users/import - 导入用户', () => {
    it('应该拒绝未上传文件', async () => {
      const res = await request(app)
        .post('/api/users/import')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('文件');
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).post('/api/users/import');
      expect(res.status).toBe(401);
    });

    it('应该拒绝权限不足的用户', async () => {
      const res = await request(app)
        .post('/api/users/import')
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/users/:id/avatar - 上传用户头像', () => {
    it('应该拒绝未上传头像文件', async () => {
      const res = await request(app)
        .post('/api/users/1/avatar')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('头像');
    });

    it('应该处理无效的用户 ID', async () => {
      const res = await request(app)
        .post('/api/users/invalid/avatar')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该返回 404 当用户不存在时', async () => {
      const res = await request(app)
        .post('/api/users/99999/avatar')
        .set(authHeaders(ADMIN_USER_ID));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('应该拒绝未授权的访问', async () => {
      const res = await request(app).post('/api/users/1/avatar');
      expect(res.status).toBe(401);
    });

    it('应该拒绝权限不足的用户', async () => {
      const res = await request(app)
        .post('/api/users/1/avatar')
        .set(authHeaders(NO_PERM_USER_ID));

      expect(res.status).toBe(403);
    });
  });

  describe('工具函数验证', () => {
    it('应该验证 validateEmail 函数的正确性', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .send({
          name: 'Email Test',
          email: 'test+tag@domain.co.uk',
          status: 'active',
        })
        .set(authHeaders(ADMIN_USER_ID));
      expect(createRes.status).toBe(201);
    });

    it('应该验证 validatePhone 函数的正确性', async () => {
      const invalidPhones = ['12345678901', '12800138000', '1380013800', '138001380001'];
      for (const phone of invalidPhones) {
        const res = await request(app)
          .post('/api/users')
          .send({
            name: `Phone Test ${phone}`,
            email: `phone${phone}@test.com`,
            phone,
            status: 'active',
          })
          .set(authHeaders(ADMIN_USER_ID));
        expect(res.status).toBe(400);
      }
    });
  });
});
