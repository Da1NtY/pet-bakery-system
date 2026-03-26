const pool = require('../config/database');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  /**
   * 根据ID查询
   */
  async findById(id) {
    const [rows] = await this.pool.execute(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * 查询所有
   */
  async findAll(where = {}, orderBy = 'id DESC') {
    let sql = `SELECT * FROM ${this.tableName}`;
    const values = [];
    
    const conditions = Object.entries(where);
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.map(([key]) => {
        values.push(where[key]);
        return `${key} = ?`;
      }).join(' AND ');
    }
    
    sql += ` ORDER BY ${orderBy}`;
    
    const [rows] = await this.pool.execute(sql, values);
    return rows;
  }

  /**
   * 分页查询
   */
  async findPage(where = {}, page = 1, pageSize = 10, orderBy = 'id DESC') {
    const offset = (page - 1) * pageSize;
    let sql = `SELECT * FROM ${this.tableName}`;
    let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const values = [];
    
    const conditions = Object.entries(where);
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.map(([key]) => {
        values.push(where[key]);
        return `${key} = ?`;
      }).join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }
    
    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    
    const [rows] = await this.pool.execute(sql, [...values, pageSize, offset]);
    const [countResult] = await this.pool.execute(countSql, values);
    
    return {
      list: rows,
      total: countResult[0].total,
      page,
      pageSize
    };
  }

  /**
   * 创建
   */
  async create(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(',');
    
    const [result] = await this.pool.execute(
      `INSERT INTO ${this.tableName} (${fields.join(',')}) VALUES (${placeholders})`,
      values
    );
    
    return {
      id: result.insertId,
      ...data
    };
  }

  /**
   * 更新
   */
  async update(id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    const [result] = await this.pool.execute(
      `UPDATE ${this.tableName} SET ${fields.map(f => `${f} = ?`).join(',')} WHERE id = ?`,
      [...values, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * 删除
   */
  async delete(id) {
    const [result] = await this.pool.execute(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 软删除（如果有status字段）
   */
  async softDelete(id) {
    return this.update(id, { status: 0 });
  }
}

module.exports = BaseModel;