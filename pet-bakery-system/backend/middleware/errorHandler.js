const { error } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // 处理验证错误
  if (err.name === 'ValidationError') {
    return error(res, err.message, 400, 400);
  }
  
  // 处理 MySQL 错误
  if (err.code && err.code.startsWith('ER_')) {
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, '数据已存在，请勿重复添加', 409, 409);
    }
    return error(res, '数据库操作失败', 500, 500);
  }
  
  // 默认错误
  return error(res, err.message || '服务器内部错误', 500, 500);
};

module.exports = errorHandler;