/**
 * 获取分页参数
 */
const getPagination = (req) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;
  
  return {
    page,
    pageSize,
    offset,
    limit: pageSize
  };
};

/**
 * 构建分页查询
 */
const buildPageQuery = (baseQuery, params, countQuery) => {
  const { page, pageSize, offset, limit } = params;
  
  return {
    dataQuery: `${baseQuery} LIMIT ${limit} OFFSET ${offset}`,
    countQuery: countQuery || baseQuery.replace(/SELECT.*?FROM/i, 'SELECT COUNT(*) as total FROM'),
    page,
    pageSize
  };
};

module.exports = {
  getPagination,
  buildPageQuery
};