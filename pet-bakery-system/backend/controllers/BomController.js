const { SkuBomTemplate } = require('../models');
const { success, error } = require('../utils/response');

class BomController {
  /**
   * 获取SKU的BOM配方
   */
  async getBySkuId(req, res) {
    try {
      const { skuId } = req.params;
      
      const pool = require('../config/database');
      const [bom] = await pool.execute(`
        SELECT bt.*, ps.sku_name, p.name as product_name
        FROM sku_bom_templates bt
        JOIN product_skus ps ON bt.sku_id = ps.id
        JOIN products p ON ps.product_id = p.id
        WHERE bt.sku_id = ? AND bt.status = 1
        ORDER BY bt.version DESC
        LIMIT 1
      `, [skuId]);
      
      if (bom.length === 0) {
        return success(res, null);
      }
      
      // 获取配方明细
      const [items] = await pool.execute(`
        SELECT bi.*, i.name as ingredient_name, i.unit as ingredient_unit, i.purchase_price
        FROM sku_bom_items bi
        JOIN ingredients i ON bi.ingredient_id = i.id
        WHERE bi.bom_id = ?
        ORDER BY bi.sort
      `, [bom[0].id]);
      
      // 计算成本
      let totalCost = 0;
      items.forEach(item => {
        const qty = parseFloat(item.quantity);
        const price = parseFloat(item.purchase_price || 0);
        const lossRate = parseFloat(item.loss_rate || 0);
        const actualQty = qty * (1 + lossRate / 100);
        item.cost = (actualQty * price).toFixed(4);
        totalCost += parseFloat(item.cost);
      });
      
      return success(res, {
        ...bom[0],
        items,
        totalCost: totalCost.toFixed(2)
      });
    } catch (err) {
      return error(res, '获取配方失败');
    }
  }

  /**
   * 创建/更新BOM配方
   */
  async save(req, res) {
    const pool = require('../config/database');
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const { skuId, items = [] } = req.body;
      
      // 检查SKU是否存在
      const [sku] = await conn.execute(
        'SELECT id FROM product_skus WHERE id = ?',
        [skuId]
      );
      if (sku.length === 0) {
        throw new Error('SKU不存在');
      }
      
      // 停用旧版本
      await conn.execute(`
        UPDATE sku_bom_templates SET status = 0, updated_at = NOW()
        WHERE sku_id = ?
      `, [skuId]);
      
      // 计算总成本
      let totalCost = 0;
      for (const item of items) {
        const [ingredient] = await conn.execute(
          'SELECT purchase_price FROM ingredients WHERE id = ?',
          [item.ingredientId]
        );
        const price = ingredient[0]?.purchase_price || 0;
        const qty = parseFloat(item.quantity);
        const lossRate = parseFloat(item.lossRate || 0);
        const actualQty = qty * (1 + lossRate / 100);
        totalCost += actualQty * price;
      }
      
      // 创建新版本
      const [versionResult] = await conn.execute(`
        SELECT COALESCE(MAX(version), 0) + 1 as new_version
        FROM sku_bom_templates
        WHERE sku_id = ?
      `, [skuId]);
      
      const newVersion = versionResult[0].new_version;
      
      const [bomResult] = await conn.execute(`
        INSERT INTO sku_bom_templates (sku_id, version, status, total_cost, created_at, updated_at)
        VALUES (?, ?, 1, ?, NOW(), NOW())
      `, [skuId, newVersion, totalCost.toFixed(2)]);
      
      const bomId = bomResult.insertId;
      
      // 创建配方明细
      if (items.length > 0) {
        const itemValues = items.map((item, index) => [
          bomId,
          item.ingredientId,
          item.quantity,
          item.unit,
          item.lossRate || 0,
          index,
          new Date(),
          new Date()
        ]);
        
        await conn.query(`
          INSERT INTO sku_bom_items (bom_id, ingredient_id, quantity, unit, loss_rate, sort, created_at, updated_at)
          VALUES ?
        `, [itemValues]);
      }
      
      // 更新SKU的成本价
      await conn.execute(`
        UPDATE product_skus SET cost_price = ?, updated_at = NOW()
        WHERE id = ?
      `, [totalCost.toFixed(2), skuId]);
      
      await conn.commit();
      return success(res, { bomId, version: newVersion, totalCost: totalCost.toFixed(2) }, '保存成功');
      
    } catch (err) {
      await conn.rollback();
      return error(res, err.message || '保存配方失败', 400, 400);
    } finally {
      conn.release();
    }
  }

  /**
   * 获取BOM历史版本
   */
  async getHistory(req, res) {
    try {
      const { skuId } = req.params;
      
      const pool = require('../config/database');
      const [rows] = await pool.execute(`
        SELECT bt.*, u.real_name as creator_name
        FROM sku_bom_templates bt
        LEFT JOIN users u ON bt.created_by = u.id
        WHERE bt.sku_id = ?
        ORDER BY bt.version DESC
      `, [skuId]);
      
      return success(res, rows);
    } catch (err) {
      return error(res, '获取历史版本失败');
    }
  }
}

module.exports = new BomController();