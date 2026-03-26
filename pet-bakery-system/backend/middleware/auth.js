const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

/**
 * 验证 JWT Token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, '请先登录', 401, 401);
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 验证用户是否存在且启用
    const [users] = await pool.execute(
      'SELECT id, username, real_name, status FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return error(res, '用户不存在', 401, 401);
    }
    
    if (users[0].status !== 1) {
      return error(res, '账号已被禁用', 403, 403);
    }
    
    req.user = users[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, '登录已过期，请重新登录', 401, 401);
    }
    return error(res, '无效的登录凭证', 401, 401);
  }
};

/**
 * 检查权限
 */
const requirePermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // 查询用户权限
      const [permissions] = await pool.execute(`
        SELECT p.code 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ?
      `, [userId]);
      
      const hasPermission = permissions.some(p => p.code === permissionCode);
      
      if (!hasPermission) {
        return error(res, '没有操作权限', 403, 403);
      }
      
      next();
    } catch (err) {
      return error(res, '权限验证失败');
    }
  };
};

module.exports = {
  authenticate,
  requirePermission
};