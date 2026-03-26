const { Product, ProductSku, Category } = require('../models');
const { success, error, page } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

class ProductController {
  /**
   * 获取商品列表
   */
  async list(req, res) {
    try {
      const { page, pageSize } = getPagination(req);
      const { keyword, categoryId, status, productType } = req.query;
      
      let where = {};
      if (status !== undefined) where.status = status;
      if (categoryId) where.category_id = categoryId;
      if (productType) where.product_type = productType;
      
      const result = await Product.findPageWithCategory(where, page, pageSize);
      
      return page(res, result.list, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      });
    } catch (err) {
      return error(res, '获取商品列表失败');
    }
  }

  /**
   * 获取商品详情
   */
  async detail(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findWithSkus(id);
      
      if (!product) {
        return error(res, '商品不存在', 404, 404);
      }
      
      return success(res, product);
    } catch (err) {
      return error(res, '获取商品详情失败');
    }
  }

  /**
   * 创建商品
   */
  async create(req, res) {
    const pool = require('../config/database');
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const {
        name, code, categoryId, productType, coverImage,
        description, isCustomizable, storageType, shelfLifeDays,
        skus = [], images = []
      } = req.body;
      
      // 检查编码是否重复
      const [existing] = await conn.execute(
        'SELECT id FROM products WHERE code = ?',
        [code]
      );
      if (existing.length > 0) {
        throw new Error('商品编码已存在');
      }
      
      // 创建商品
      const [productResult] = await conn.execute(`
        INSERT INTO products (name, code, category_id, product_type, cover_image,
          description, status, is_customizable, storage_type, shelf_life_days, sort, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, NOW(), NOW())
      `, [name, code, categoryId, productType, coverImage, description, isCustomizable, storageType, shelfLifeDays]);
      
      const productId = productResult.insertId;
      
      // 创建SKU
      if (skus.length > 0) {
        const skuValues = skus.map((sku, index) => [
          productId,
          sku.skuCode,
          sku.skuName,
          JSON.stringify(sku.specJson || {}),
          sku.salePrice,
          sku.costPrice,
          sku.stockType || 'ingredient_deduct',
          sku.weightValue,
          sku.weightUnit,
          1,
          new Date(),
          new Date()
        ]);
        
        await conn.query(`
          INSERT INTO product_skus (product_id, sku_code, sku_name, spec_json, sale_price,
            cost_price, stock_type, weight_value, weight_unit, status, created_at, updated_at)
          VALUES ?
        `, [skuValues]);
      }
      
      // 创建图片
      if (images.length > 0) {
        const imageValues = images.map((img, index) => [
          productId,
          img.imageUrl,
          img.imageType || 'detail',
          index,
          new Date()
        ]);
        
        await conn.query(`
          INSERT INTO product_images (product_id, image_url, image_type, sort, created_at)
          VALUES ?
        `, [imageValues]);
      }
      
      await conn.commit();
      return success(res, { id: productId }, '创建成功');
      
    } catch (err) {
      await conn.rollback();
      return error(res, err.message || '创建商品失败', 400, 400);
    } finally {
      conn.release();
    }
  }

  /**
   * 更新商品
   */
  async update(req, res) {
    const pool = require('../config/database');
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const { id } = req.params;
      const {
        name, categoryId, coverImage, description, status,
        isCustomizable, storageType, shelfLifeDays
      } = req.body;
      
      await conn.execute(`
        UPDATE products SET name = ?, category_id = ?, cover_image = ?,
          description = ?, status = ?, is_customizable = ?,
          storage_type = ?, shelf_life_days = ?, updated_at = NOW()
        WHERE id = ?
      `, [name, categoryId, coverImage, description, status, isCustomizable, storageType, shelfLifeDays, id]);
      
      await conn.commit();
      return success(res, null, '更新成功');
      
    } catch (err) {
      await conn.rollback();
      return error(res, '更新商品失败');
    } finally {
      conn.release();
    }
  }

  /**
   * 删除商品
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      // 检查是否有未完成的订单
      const pool = require('../config/database');
      const [orders] = await pool.execute(`
        SELECT COUNT(*) as count FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ? AND o.status NOT IN ('completed', 'cancelled')
      `, [id]);
      
      if (orders[0].count > 0) {
        return error(res, '该商品存在未完成订单，无法删除', 400, 400);
      }
      
      await Product.update(id, { status: 0 });
      return success(res, null, '删除成功');
    } catch (err) {
      return error(res, '删除商品失败');
    }
  }
}

module.exports = new ProductController();