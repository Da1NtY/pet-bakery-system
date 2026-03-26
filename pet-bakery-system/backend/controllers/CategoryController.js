const { Category } = require('../models');
const { success, error } = require('../utils/response');

class CategoryController {
  /**
   * 获取分类树
   */
  async tree(req, res) {
    try {
      const tree = await Category.getTree();
      return success(res, tree);
    } catch (err) {
      return error(res, '获取分类失败');
    }
  }

  /**
   * 获取列表（平铺）
   */
  async list(req, res) {
    try {
      const { status } = req.query;
      let where = {};
      if (status !== undefined) where.status = status;
      
      const list = await Category.findAll(where, 'sort ASC');
      return success(res, list);
    } catch (err) {
      return error(res, '获取分类列表失败');
    }
  }

  /**
   * 创建分类
   */
  async create(req, res) {
    try {
      const { name, parentId = 0, sort = 0, status = 1 } = req.body;
      
      const category = await Category.create({
        name,
        parent_id: parentId,
        sort,
        status,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return success(res, { id: category.id }, '创建成功');
    } catch (err) {
      return error(res, '创建分类失败');
    }
  }

  /**
   * 更新分类
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, parentId, sort, status } = req.body;
      
      await Category.update(id, {
        name,
        parent_id: parentId,
        sort,
        status,
        updated_at: new Date()
      });
      
      return success(res, null, '更新成功');
    } catch (err) {
      return error(res, '更新分类失败');
    }
  }

  /**
   * 删除分类
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      // 检查是否有子分类
      const pool = require('../config/database');
      const [children] = await pool.execute(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
        [id]
      );
      
      if (children[0].count > 0) {
        return error(res, '该分类下存在子分类，无法删除', 400, 400);
      }
      
      // 检查是否有关联商品
      const [products] = await pool.execute(
        'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
        [id]
      );
      
      if (products[0].count > 0) {
        return error(res, '该分类下存在商品，无法删除', 400, 400);
      }
      
      await Category.delete(id);
      return success(res, null, '删除成功');
    } catch (err) {
      return error(res, '删除分类失败');
    }
  }
}

module.exports = new CategoryController();