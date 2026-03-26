/**
 * 成功响应
 */
const success = (res, data = null, message = '操作成功') => {
  return res.json({
    code: 200,
    message,
    data,
    timestamp: Date.now()
  });
};

/**
 * 错误响应
 */
const error = (res, message = '操作失败', code = 500, statusCode = 200) => {
  return res.status(statusCode).json({
    code,
    message,
    data: null,
    timestamp: Date.now()
  });
};

/**
 * 分页响应
 */
const page = (res, list, pagination) => {
  return res.json({
    code: 200,
    message: '查询成功',
    data: {
      list,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.pageSize)
      }
    },
    timestamp: Date.now()
  });
};

module.exports = {
  success,
  error,
  page
};