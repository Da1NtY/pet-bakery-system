const { Ingredient, IngredientStockRecord } = require('../models');
const { success, error, page } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

class IngredientController {
  /**
   * 获取原料列表
   */
  async list(req, res) {
    try {
      const { page, pageSize } = getPagination(req);
      const { keyword, type, status } = req.query;
      
      let where = {};
      if (status !== undefined) where.status = status;
      if (type) where.ingredient_type = type;
      
      const result = await Ingredient.findPage(where, page, pageSize);
      
      return page(res, result.list, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      });
    } catch (err) {
      return error(res, '获取原料列表失败');
    }
  }

  /**
   * 获取原料详情
   */
  async detail(req, res) {
    try {
      const { id } = req.params;
      const ingredient = await Ingredient.findById(id);
      
      if (!ingredient) {
        return error(res, '原料不存在', 404, 404);
      }
      
      // 获取最近库存记录
      const pool = require('../config/database');
      const [records] = await pool.execute(`
        SELECT r.*, u.real_name as operator_name
        FROM ingredient_stock_records r
        LEFT JOIN users u ON r.operator_id = u.id
        WHERE r.ingredient_id = ?
        ORDER BY r.created_at DESC
        LIMIT 20
      `, [id]);
      
      return success(res, {
        ...ingredient,
        recentRecords: records
      });
    } catch (err) {
      return error(res, '获取原料详情失败');
    }
  }

  /**
   * 创建原料
   */
  async create(req, res) {
    try {
      const {
        name, code, ingredientType, unit,
        stockQuantity = 0, safetyStock, purchasePrice,
        expiryWarningDays
      } = req.body;
      
      // 检查编码
      const pool = require('../config/database');
      const [existing] = await pool.execute(
        'SELECT id FROM ingredients WHERE code = ?',
        [code]
      );
      if (existing.length > 0) {
        return error(res, '原料编码已存在', 409, 409);
      }
      
      const ingredient = await Ingredient.create({
        name,
        code,
        ingredient_type: ingredientType,
        unit,
        stock_quantity: stockQuantity,
        safety_stock: safetyStock,
        purchase_price: purchasePrice,
        status: 1,
        expiry_warning_days: expiryWarningDays,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // 如果有初始库存，记录流水
      if (stockQuantity > 0) {
        await IngredientStockRecord.record({
          ingredient_id: ingredient.id,
          change_type: 'stock_in',
          change_quantity: stockQuantity,
          before_quantity: 0,
          after_quantity: stockQuantity,
          biz_type: 'manual',
          operator_id: req.user.id,
          remark: '初始入库',
          created_at: new Date()
        });
      }
      
      return success(res, { id: ingredient.id }, '创建成功');
    } catch (err) {
      return error(res, '创建原料失败');
    }
  }

  /**
   * 更新原料
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        name, ingredientType, unit, safetyStock,
        purchasePrice, status, expiryWarningDays
      } = req.body;
      
      await Ingredient.update(id, {
        name,
        ingredient_type: ingredientType,
        unit,
        safety_stock: safetyStock,
        purchase_price: purchasePrice,
        status,
        expiry_warning_days: expiryWarningDays,
        updated_at: new Date()
      });
      
      return success(res, null, '更新成功');
    } catch (err) {
      return error(res, '更新原料失败');
    }
  }

  /**
   * 库存调整
   */
  async adjustStock(req, res) {
    try {
      const { id } = req.params;
      const { changeQuantity, reason } = req.body;
      
      const ingredient = await Ingredient.findById(id);
      if (!ingredient) {
        return error(res, '原料不存在', 404, 404);
      }
      
      const beforeQty = parseFloat(ingredient.stock_quantity);
      const afterQty = beforeQty + parseFloat(changeQuantity);
      
      if (afterQty < 0) {
        return error(res, '库存不能为负数', 400, 400);
      }
      
      // 更新库存
      await Ingredient.update(id, {
        stock_quantity: afterQty,
        updated_at: new Date()
      });
      
      // 记录流水
      await IngredientStockRecord.record({
        ingredient_id: id,
        change_type: changeQuantity > 0 ? 'stock_in' : 'stock_out',
        change_quantity: Math.abs(changeQuantity),
        before_quantity: beforeQty,
        after_quantity: afterQty,
        biz_type: 'adjustment',
        operator_id: req.user.id,
        remark: reason,
        created_at: new Date()
      });
      
      return success(res, { currentStock: afterQty }, '库存调整成功');
    } catch (err) {
      return error(res, '库存调整失败');
    }
  }

  /**
   * 获取低库存预警
   */
  async getLowStock(req, res) {
    try {
      const list = await Ingredient.findLowStock();
      return success(res, list);
    } catch (err) {
      return error(res, '获取低库存列表失败');
    }
  }
}

module.exports = new IngredientController();