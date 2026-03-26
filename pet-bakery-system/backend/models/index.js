const BaseModel = require('./BaseModel');

// 用户权限模块
class UserModel extends BaseModel {
  constructor() {
    super('users');
  }

  async findByUsername(username) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  }

  async updateLastLogin(id) {
    return this.update(id, { last_login_at: new Date() });
  }
}

class RoleModel extends BaseModel {
  constructor() {
    super('roles');
  }
}

class PermissionModel extends BaseModel {
  constructor() {
    super('permissions');
  }
}

// 商品模块
class CategoryModel extends BaseModel {
  constructor() {
    super('categories');
  }

  async getTree() {
    const [rows] = await this.pool.execute(
      'SELECT * FROM categories WHERE status = 1 ORDER BY parent_id, sort'
    );
    
    // 构建树形结构
    const map = {};
    const tree = [];
    
    rows.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });
    
    rows.forEach(item => {
      if (item.parent_id === 0) {
        tree.push(map[item.id]);
      } else if (map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.id]);
      }
    });
    
    return tree;
  }
}

class ProductModel extends BaseModel {
  constructor() {
    super('products');
  }

  async findWithSkus(id) {
    const [product] = await this.pool.execute(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [id]
    );
    
    if (product.length === 0) return null;
    
    const [skus] = await this.pool.execute(
      'SELECT * FROM product_skus WHERE product_id = ? AND status = 1',
      [id]
    );
    
    const [images] = await this.pool.execute(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort',
      [id]
    );
    
    return {
      ...product[0],
      skus,
      images
    };
  }

  async findPageWithCategory(where = {}, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    let countSql = 'SELECT COUNT(*) as total FROM products p';
    const values = [];
    
    const conditions = Object.entries(where);
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.map(([key]) => {
        if (key.startsWith('p.')) {
          values.push(where[key]);
          return `${key} = ?`;
        }
        values.push(where[key]);
        return `p.${key} = ?`;
      }).join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }
    
    sql += ` ORDER BY p.sort, p.id DESC LIMIT ? OFFSET ?`;
    
    const [rows] = await this.pool.execute(sql, [...values, pageSize, offset]);
    const [countResult] = await this.pool.execute(countSql, values);
    
    return {
      list: rows,
      total: countResult[0].total,
      page,
      pageSize
    };
  }
}

class ProductSkuModel extends BaseModel {
  constructor() {
    super('product_skus');
  }

  async findByCode(skuCode) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM product_skus WHERE sku_code = ?',
      [skuCode]
    );
    return rows[0] || null;
  }
}

// 原料模块
class IngredientModel extends BaseModel {
  constructor() {
    super('ingredients');
  }

  async updateStock(id, quantity) {
    const [result] = await this.pool.execute(
      'UPDATE ingredients SET stock_quantity = stock_quantity + ? WHERE id = ?',
      [quantity, id]
    );
    return result.affectedRows > 0;
  }

  async findLowStock() {
    const [rows] = await this.pool.execute(
      'SELECT * FROM ingredients WHERE stock_quantity <= safety_stock AND status = 1'
    );
    return rows;
  }
}

class IngredientStockRecordModel extends BaseModel {
  constructor() {
    super('ingredient_stock_records');
  }

  async record(params) {
    return this.create({
      ...params,
      created_at: new Date()
    });
  }
}

// BOM模块
class SkuBomTemplateModel extends BaseModel {
  constructor() {
    super('sku_bom_templates');
  }

  async findBySkuId(skuId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM sku_bom_templates WHERE sku_id = ? AND status = 1 ORDER BY version DESC LIMIT 1',
      [skuId]
    );
    return rows[0] || null;
  }

  async findWithItems(id) {
    const [template] = await this.pool.execute(
      'SELECT * FROM sku_bom_templates WHERE id = ?',
      [id]
    );
    
    if (template.length === 0) return null;
    
    const [items] = await this.pool.execute(`
      SELECT bi.*, i.name as ingredient_name, i.unit as ingredient_unit 
      FROM sku_bom_items bi
      JOIN ingredients i ON bi.ingredient_id = i.id
      WHERE bi.bom_id = ?
    `, [id]);
    
    return {
      ...template[0],
      items
    };
  }
}

// 客户模块
class CustomerModel extends BaseModel {
  constructor() {
    super('customers');
  }

  async findByMobile(mobile) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM customers WHERE mobile = ?',
      [mobile]
    );
    return rows[0] || null;
  }

  async findByOpenid(openid) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM customers WHERE openid = ?',
      [openid]
    );
    return rows[0] || null;
  }

  async updateStats(id, orderAmount) {
    await this.pool.execute(`
      UPDATE customers 
      SET total_order_count = total_order_count + 1,
          total_spent_amount = total_spent_amount + ?,
          last_order_at = NOW()
      WHERE id = ?
    `, [orderAmount, id]);
  }
}

class PetModel extends BaseModel {
  constructor() {
    super('pets');
  }

  async findByCustomer(customerId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM pets WHERE customer_id = ?',
      [customerId]
    );
    return rows;
  }
}

// 订单模块
class OrderModel extends BaseModel {
  constructor() {
    super('orders');
  }

  async findWithDetails(id) {
    const [order] = await this.pool.execute(`
      SELECT o.*, c.name as customer_name, c.mobile as customer_mobile,
             p.name as pet_name, p.pet_type, p.breed
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN pets p ON o.pet_id = p.id
      WHERE o.id = ?
    `, [id]);
    
    if (order.length === 0) return null;
    
    const [items] = await this.pool.execute(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [id]);
    
    const [logs] = await this.pool.execute(`
      SELECT osl.*, u.real_name as operator_name
      FROM order_status_logs osl
      LEFT JOIN users u ON osl.operator_id = u.id
      WHERE osl.order_id = ?
      ORDER BY osl.created_at
    `, [id]);
    
    const [payments] = await this.pool.execute(
      'SELECT * FROM payments WHERE order_id = ?',
      [id]
    );
    
    return {
      ...order[0],
      items,
      statusLogs: logs,
      payments
    };
  }

  async findPageWithCustomer(where = {}, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    let sql = `
      SELECT o.*, c.name as customer_name, c.mobile as customer_mobile
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
    `;
    let countSql = 'SELECT COUNT(*) as total FROM orders o';
    const values = [];
    
    // 构建查询条件
    const conditions = [];
    if (where.status) {
      conditions.push('o.status = ?');
      values.push(where.status);
    }
    if (where.customerId) {
      conditions.push('o.customer_id = ?');
      values.push(where.customerId);
    }
    if (where.orderNo) {
      conditions.push('o.order_no LIKE ?');
      values.push(`%${where.orderNo}%`);
    }
    if (where.startDate && where.endDate) {
      conditions.push('o.created_at BETWEEN ? AND ?');
      values.push(where.startDate, where.endDate);
    }
    
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }
    
    sql += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    
    const [rows] = await this.pool.execute(sql, [...values, pageSize, offset]);
    const [countResult] = await this.pool.execute(countSql, values);
    
    return {
      list: rows,
      total: countResult[0].total,
      page,
      pageSize
    };
  }

  async generateOrderNo() {
    const date = new Date();
    const prefix = date.getFullYear().toString().substr(2) +
                   String(date.getMonth() + 1).padStart(2, '0') +
                   String(date.getDate()).padStart(2, '0');
    
    // 查询当天订单数
    const today = date.toISOString().split('T')[0];
    const [result] = await this.pool.execute(
      "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?",
      [today]
    );
    
    const seq = String(result[0].count + 1).padStart(4, '0');
    return `PB${prefix}${seq}`; // PB = Pet Bakery
  }
}

class OrderItemModel extends BaseModel {
  constructor() {
    super('order_items');
  }
}

class OrderStatusLogModel extends BaseModel {
  constructor() {
    super('order_status_logs');
  }
}

class PaymentModel extends BaseModel {
  constructor() {
    super('payments');
  }

  async findByOrderId(orderId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at',
      [orderId]
    );
    return rows;
  }
}

// 统计模块
class DailyBusinessStatsModel extends BaseModel {
  constructor() {
    super('daily_business_stats');
  }

  async findByDateRange(startDate, endDate) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM daily_business_stats WHERE biz_date BETWEEN ? AND ? ORDER BY biz_date',
      [startDate, endDate]
    );
    return rows;
  }

  async getOrCreate(bizDate) {
    const [existing] = await this.pool.execute(
      'SELECT * FROM daily_business_stats WHERE biz_date = ?',
      [bizDate]
    );
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    return this.create({
      biz_date: bizDate,
      order_count: 0,
      completed_order_count: 0,
      sales_amount: 0,
      refund_amount: 0,
      customer_count: 0,
      new_customer_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
}

module.exports = {
  User: new UserModel(),
  Role: new RoleModel(),
  Permission: new PermissionModel(),
  Category: new CategoryModel(),
  Product: new ProductModel(),
  ProductSku: new ProductSkuModel(),
  Ingredient: new IngredientModel(),
  IngredientStockRecord: new IngredientStockRecordModel(),
  SkuBomTemplate: new SkuBomTemplateModel(),
  Customer: new CustomerModel(),
  Pet: new PetModel(),
  Order: new OrderModel(),
  OrderItem: new OrderItemModel(),
  OrderStatusLog: new OrderStatusLogModel(),
  Payment: new PaymentModel(),
  DailyBusinessStats: new DailyBusinessStatsModel()
};