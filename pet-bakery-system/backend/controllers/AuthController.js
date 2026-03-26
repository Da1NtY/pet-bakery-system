const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 获取用户权限的独立函数
async function getUserPermissions(userId) {
  const pool = require('../config/database');
  const [rows] = await pool.execute(`
    SELECT DISTINCT p.code, p.module
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ?
  `, [userId]);
  return rows;
}

class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      console.log('【登录】收到请求:', username);
      
      if (!username || !password) {
        return error(res, '用户名和密码不能为空', 400, 400);
      }
      
      // 查找用户
      const user = await User.findByUsername(username);
      console.log('【登录】找到用户:', user?.id);
      
      if (!user) {
        return error(res, '用户名或密码错误', 401, 401);
      }
      
      if (user.status !== 1) {
        return error(res, '账号已被禁用', 403, 403);
      }
      
      // 验证密码
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log('【登录】密码验证:', isValid);
      
      if (!isValid) {
        return error(res, '用户名或密码错误', 401, 401);
      }
      
      // 更新登录时间
      await User.updateLastLogin(user.id);
      
      // 生成 Token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // 获取权限
      const permissions = await getUserPermissions(user.id);
      console.log('【登录】权限数量:', permissions.length);
      
      return success(res, {
        token,
        user: {
          id: user.id,
          username: user.username,
          realName: user.real_name,
          mobile: user.mobile,
          email: user.email
        },
        permissions
      }, '登录成功');
      
    } catch (err) {
      console.error('【登录】异常:', err);
      console.error('【登录】堆栈:', err.stack);
      return error(res, '登录失败: ' + err.message);
    }
  }

  async getCurrentUser(req, res) {
    try {
      const user = req.user;
      const permissions = await getUserPermissions(user.id);
      
      return success(res, {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        permissions
      });
    } catch (err) {
      console.error('获取用户信息错误:', err);
      return error(res, '获取用户信息失败: ' + err.message);
    }
  }

  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      const user = await User.findById(userId);
      
      const isValid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isValid) {
        return error(res, '原密码错误', 400, 400);
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.update(userId, { password_hash: hashedPassword });
      
      return success(res, null, '密码修改成功');
    } catch (err) {
      console.error('修改密码错误:', err);
      return error(res, '修改密码失败: ' + err.message);
    }
  }

  async register(req, res) {
    const pool = require('../config/database');
    
    try {
      const { username, password, realName, mobile } = req.body;
      
      const [existingUsers] = await pool.execute('SELECT COUNT(*) as count FROM users');
      if (existingUsers[0].count > 0) {
        return error(res, '系统已初始化，请联系管理员添加账号', 403, 403);
      }
      
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      if (existing.length > 0) {
        return error(res, '用户名已存在', 409, 409);
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      const [roles] = await pool.execute(
        "SELECT id FROM roles WHERE code = 'admin'"
      );
      
      let roleId;
      if (roles.length === 0) {
        const [roleResult] = await pool.execute(`
          INSERT INTO roles (name, code, status, description, created_at, updated_at)
          VALUES ('管理员', 'admin', 1, '系统管理员', NOW(), NOW())
        `);
        roleId = roleResult.insertId;
        
        const permissions = [
          { name: '用户管理', code: 'user:manage', module: 'system' },
          { name: '商品管理', code: 'product:manage', module: 'product' },
          { name: '订单管理', code: 'order:manage', module: 'order' },
          { name: '客户管理', code: 'customer:manage', module: 'customer' },
          { name: '原料管理', code: 'ingredient:manage', module: 'ingredient' },
          { name: '配方管理', code: 'bom:manage', module: 'bom' },
          { name: '统计查看', code: 'stats:view', module: 'stats' }
        ];
        
        for (const perm of permissions) {
          const [permResult] = await pool.execute(`
            INSERT INTO permissions (name, code, module, created_at, updated_at)
            VALUES (?, ?, ?, NOW(), NOW())
          `, [perm.name, perm.code, perm.module]);
          
          await pool.execute(`
            INSERT INTO role_permissions (role_id, permission_id, created_at)
            VALUES (?, ?, NOW())
          `, [roleId, permResult.insertId]);
        }
      } else {
        roleId = roles[0].id;
      }
      
      const [userResult] = await pool.execute(`
        INSERT INTO users (username, password_hash, real_name, mobile, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, NOW(), NOW())
      `, [username, passwordHash, realName, mobile]);
      
      const userId = userResult.insertId;
      
      await pool.execute(`
        INSERT INTO user_roles (user_id, role_id, created_at)
        VALUES (?, ?, NOW())
      `, [userId, roleId]);
      
      const token = jwt.sign(
        { userId, username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      return success(res, {
        token,
        user: {
          id: userId,
          username,
          realName
        }
      }, '注册成功');
      
    } catch (err) {
      console.error('注册错误:', err);
      return error(res, '注册失败: ' + err.message);
    }
  }
}

module.exports = new AuthController();