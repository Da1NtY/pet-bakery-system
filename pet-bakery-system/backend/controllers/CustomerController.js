const { Customer, Pet } = require('../models');
const { success, error, page } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

class CustomerController {
  /**
   * 获取客户列表
   */
  async list(req, res) {
    try {
      const { page, pageSize } = getPagination(req);
      const { keyword, source } = req.query;
      
      let where = {};
      if (source) where.source = source;
      
      const pool = require('../config/database');
      let sql = `
        SELECT c.*, 
          (SELECT COUNT(*) FROM pets WHERE customer_id = c.id) as pet_count
        FROM customers c
      `;
      let countSql = 'SELECT COUNT(*) as total FROM customers c';
      const values = [];
      
      if (keyword) {
        sql += ' WHERE (c.name LIKE ? OR c.mobile LIKE ?)';
        countSql += ' WHERE (c.name LIKE ? OR c.mobile LIKE ?)';
        values.push(`%${keyword}%`, `%${keyword}%`);
      }
      
      if (source) {
        const connector = values.length > 0 ? ' AND' : ' WHERE';
        sql += `${connector} c.source = ?`;
        countSql += `${connector} c.source = ?`;
        values.push(source);
      }
      
      sql += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
      
      const [rows] = await pool.execute(sql, [...values, pageSize, (page - 1) * pageSize]);
      const [countResult] = await pool.execute(countSql, values);
      
      return page(res, rows, {
        page,
        pageSize,
        total: countResult[0].total
      });
    } catch (err) {
      return error(res, '获取客户列表失败');
    }
  }

  /**
   * 获取客户详情
   */
  async detail(req, res) {
    try {
      const { id } = req.params;
      const customer = await Customer.findById(id);
      
      if (!customer) {
        return error(res, '客户不存在', 404, 404);
      }
      
      // 获取宠物列表
      const pets = await Pet.findByCustomer(id);
      
      // 获取最近订单
      const pool = require('../config/database');
      const [orders] = await pool.execute(`
        SELECT o.*, 
          (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as item_count
        FROM orders o
        WHERE o.customer_id = ?
        ORDER BY o.created_at DESC
        LIMIT 10
      `, [id]);
      
      return success(res, {
        ...customer,
        pets,
        recentOrders: orders
      });
    } catch (err) {
      return error(res, '获取客户详情失败');
    }
  }

  /**
   * 创建客户
   */
  async create(req, res) {
    try {
      const {
        name, mobile, wechatNickname, source = 'manual',
        pets = []
      } = req.body;
      
      // 检查手机号
      if (mobile) {
        const existing = await Customer.findByMobile(mobile);
        if (existing) {
          return error(res, '该手机号已存在', 409, 409);
        }
      }
      
      const customer = await Customer.create({
        name,
        mobile,
        wechat_nickname: wechatNickname,
        source,
        total_order_count: 0,
        total_spent_amount: 0,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // 创建宠物
      if (pets.length > 0) {
        const pool = require('../config/database');
        const petValues = pets.map(pet => [
          customer.id,
          pet.name,
          pet.petType,
          pet.breed,
          pet.gender,
          pet.birthday,
          pet.weight,
          pet.allergyNotes,
          pet.dietaryNotes,
          new Date(),
          new Date()
        ]);
        
        await pool.query(`
          INSERT INTO pets (customer_id, name, pet_type, breed, gender, birthday,
            weight, allergy_notes, dietary_notes, created_at, updated_at)
          VALUES ?
        `, [petValues]);
      }
      
      return success(res, { id: customer.id }, '创建成功');
    } catch (err) {
      return error(res, '创建客户失败');
    }
  }

  /**
   * 更新客户
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, mobile, wechatNickname } = req.body;
      
      await Customer.update(id, {
        name,
        mobile,
        wechat_nickname: wechatNickname,
        updated_at: new Date()
      });
      
      return success(res, null, '更新成功');
    } catch (err) {
      return error(res, '更新客户失败');
    }
  }

  /**
   * 添加宠物
   */
  async addPet(req, res) {
    try {
      const { customerId } = req.params;
      const {
        name, petType, breed, gender, birthday,
        weight, allergyNotes, dietaryNotes
      } = req.body;
      
      const pet = await Pet.create({
        customer_id: customerId,
        name,
        pet_type: petType,
        breed,
        gender,
        birthday,
        weight,
        allergy_notes: allergyNotes,
        dietary_notes: dietaryNotes,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return success(res, { id: pet.id }, '添加宠物成功');
    } catch (err) {
      return error(res, '添加宠物失败');
    }
  }

  /**
   * 更新宠物
   */
  async updatePet(req, res) {
    try {
      const { petId } = req.params;
      const {
        name, petType, breed, gender, birthday,
        weight, allergyNotes, dietaryNotes
      } = req.body;
      
      await Pet.update(petId, {
        name,
        pet_type: petType,
        breed,
        gender,
        birthday,
        weight,
        allergy_notes: allergyNotes,
        dietary_notes: dietaryNotes,
        updated_at: new Date()
      });
      
      return success(res, null, '更新宠物成功');
    } catch (err) {
      return error(res, '更新宠物失败');
    }
  }

  /**
   * 删除宠物
   */
  async deletePet(req, res) {
    try {
      const { petId } = req.params;
      await Pet.delete(petId);
      return success(res, null, '删除成功');
    } catch (err) {
      return error(res, '删除宠物失败');
    }
  }
}

module.exports = new CustomerController();