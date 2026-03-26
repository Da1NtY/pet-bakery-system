const bcrypt = require('bcryptjs');
const { User, Role } = require('../models');
const { success, error, page } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

class UserController {
  /**
   * 获取用户列表
   */
  async list(req, res) {
    try {
      const { page, pageSize } = getPagination(req);
      const { keyword, status } = req.query;
      
      let where = {};
      if (status !== undefined) where.status = status;
      
      const result = await User.findPage(where, page, pageSize);
      
      // 处理数据，不返回密码
      result.list = result.list.map(user => ({
        id: user.id,
        username: user.username,
        realName: user.real_name,
        mobile: user.mobile,
        email: user.email,
        status: user.status,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at
      }));
      
      return page(res, result.list, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      });
    } catch (err) {
      return error(res, '获取用户列表失败');
    }
  }

  /**
   * 获取用户详情
   */
  async detail(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      
      if (!user) {
        return error(res, '用户不存在', 404, 404);
      }
      
      // 获取用户角色
      const pool = require('../config/database');
      const [roles] = await pool.execute(`
        SELECT r.id, r.name, r.code
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `, [id]);
      
      return success(res, {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        mobile: user.mobile,
        email: user.email,
        status: user.status,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        roles
      });
    } catch (err) {
      return error(res, '获取用户详情失败');
    }
  }

  /**
   * 创建用户
   */
  async create(req, res) {
    try {
      const { username, password, realName, mobile, email, status = 1, roleIds = [] } = req.body;
      
      // 检查用户名是否已存在
      const existing = await User.findByUsername(username);
      if (existing) {
        return error(res, '用户名已存在', 409, 409);
      }
      
      // 加密密码
      const passwordHash = await bcrypt.hash(password, 10);
      
      // 创建用户
      const user = await User.create({
        username,
        password_hash: passwordHash,
        real_name: realName,
        mobile,
        email,
        status,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // 分配角色
      if (roleIds.length > 0) {
        const pool = require('../config/database');
        const values = roleIds.map(roleId => [user.id, roleId, new Date()]);
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id, created_at) VALUES ?',
          [values]
        );
      }
      
      return success(res, { id: user.id }, '创建成功');
    } catch (err) {
      return error(res, '创建用户失败');
    }
  }

  /**
   * 更新用户
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { realName, mobile, email, status, roleIds } = req.body;
      
      const updateData = {
        real_name: realName,
        mobile,
        email,
        status,
        updated_at: new Date()
      };
      
      await User.update(id, updateData);
      
      // 更新角色
      if (roleIds && Array.isArray(roleIds)) {
        const pool = require('../config/database');
        await pool.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
        
        if (roleIds.length > 0) {
          const values = roleIds.map(roleId => [id, roleId, new Date()]);
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id, created_at) VALUES ?',
            [values]
          );
        }
      }
      
      return success(res, null, '更新成功');
    } catch (err) {
      return error(res, '更新用户失败');
    }
  }

  /**
   * 删除用户
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      // 不能删除自己
      if (parseInt(id) === req.user.id) {
        return error(res, '不能删除当前登录用户', 400, 400);
      }
      
      await User.delete(id);
      return success(res, null, '删除成功');
    } catch (err) {
      return error(res, '删除用户失败');
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await User.update(id, { password_hash: passwordHash });
      
      return success(res, null, '密码重置成功');
    } catch (err) {
      return error(res, '重置密码失败');
    }
  }
}

module.exports = new UserController();