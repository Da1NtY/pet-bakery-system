const { Order, OrderItem, OrderStatusLog, Payment, ProductSku, Customer, Ingredient, IngredientStockRecord, SkuBomTemplate, DailyBusinessStats } = require('../models');
const { success, error, page } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../config/constants');

class OrderController {
  /**
   * 获取订单列表
   */
  async list(req, res) {
    try {
      const { page, pageSize } = getPagination(req);
      const { status, customerId, orderNo, startDate, endDate } = req.query;
      
      const where = {};
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;
      if (orderNo) where.orderNo = orderNo;
      if (startDate && endDate) {
        where.startDate = startDate;
        where.endDate = endDate;
      }
      
      const result = await Order.findPageWithCustomer(where, page, pageSize);
      
      return page(res, result.list, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      });
    } catch (err) {
      return error(res, '获取订单列表失败');
    }
  }

  /**
   * 获取订单详情
   */
  async detail(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findWithDetails(id);
      
      if (!order) {
        return error(res, '订单不存在', 404, 404);
      }
      
      return success(res, order);
    } catch (err) {
      return error(res, '获取订单详情失败');
    }
  }

  /**
   * 创建订单
   */
  async create(req, res) {
    const pool = require('../config/database');
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const {
        customerId, petId, orderSource = 'manual', orderType = 'normal',
        items = [], deliveryType = 'self_pickup',
        receiverName, receiverMobile, receiverAddress,
        customMessage, customRequirements, customerNote,
        productionDate, pickupTime, discountAmount = 0
      } = req.body;
      
      // 生成订单号
      const orderNo = await Order.generateOrderNo();
      
      // 计算金额
      let totalAmount = 0;
      let totalCost = 0;
      
      // 处理订单明细
      const orderItems = [];
      for (const item of items) {
        const sku = await ProductSku.findById(item.skuId);
        if (!sku || sku.status !== 1) {
          throw new Error(`SKU不存在或已停用: ${item.skuId}`);
        }
        
        const subtotal = sku.sale_price * item.quantity;
        totalAmount += subtotal;
        
        // 计算成本
        const costPrice = sku.cost_price || 0;
        totalCost += costPrice * item.quantity;
        
        orderItems.push({
          sku_id: item.skuId,
          product_id: sku.product_id,
          sku_name: sku.sku_name,
          spec_snapshot: sku.spec_json,
          unit_price: sku.sale_price,
          quantity: item.quantity,
          subtotal_amount: subtotal,
          cost_price_snapshot: costPrice,
          custom_requirements: item.customRequirements || ''
        });
      }
      
      const paidAmount = totalAmount - discountAmount;
      
      // 创建订单
      const [orderResult] = await conn.execute(`
        INSERT INTO orders (order_no, customer_id, pet_id, order_source, order_type,
          status, payment_status, total_amount, discount_amount, paid_amount,
          production_date, pickup_time, delivery_type, receiver_name, receiver_mobile,
          receiver_address, custom_message, custom_requirements, customer_note,
          created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [orderNo, customerId, petId, orderSource, orderType, totalAmount, discountAmount,
          paidAmount, productionDate, pickupTime, deliveryType, receiverName,
          receiverMobile, receiverAddress, customMessage, customRequirements, customerNote]);
      
      const orderId = orderResult.insertId;
      
      // 创建订单明细
      if (orderItems.length > 0) {
        const itemValues = orderItems.map(item => [
          orderId, item.product_id, item.sku_id, item.sku_name,
          JSON.stringify(item.spec_snapshot), item.unit_price, item.quantity,
          item.subtotal_amount, item.cost_price_snapshot, item.custom_requirements,
          new Date(), new Date()
        ]);
        
        await conn.query(`
          INSERT INTO order_items (order_id, product_id, sku_id, sku_name, spec_snapshot,
            unit_price, quantity, subtotal_amount, cost_price_snapshot, custom_requirements,
            created_at, updated_at)
          VALUES ?
        `, [itemValues]);
      }
      
      // 记录状态变更
      await conn.execute(`
        INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, remark, created_at)
        VALUES (?, NULL, 'pending', ?, '创建订单', NOW())
      `, [orderId, req.user.id]);
      
      // 更新客户统计
      await conn.execute(`
        UPDATE customers 
        SET total_order_count = total_order_count + 1,
            last_order_at = NOW()
        WHERE id = ?
      `, [customerId]);
      
      await conn.commit();
      
      return success(res, { 
        orderId, 
        orderNo,
        totalAmount,
        discountAmount,
        paidAmount
      }, '订单创建成功');
      
    } catch (err) {
      await conn.rollback();
      console.error('Create order error:', err);
      return error(res, err.message || '创建订单失败', 400, 400);
    } finally {
      conn.release();
    }
  }

  /**
   * 确认订单
   */
  async confirm(req, res) {
    const pool = require('../config/database');
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const { id } = req.params;
      const { remark } = req.body;
      
      const [order] = await conn.execute(
        'SELECT * FROM orders WHERE id = ?',
        [id]
      );
      
      if (order.length === 0) {
        throw new Error('订单不存在');
      }
      
      if (order[0].status !== 'pending') {
        throw new Error('订单状态不正确');
      }
      
      // 更新订单状态
      await conn.execute(`
        UPDATE orders SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [id]);
      
      // 记录状态变更
      await conn.execute(`
        INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, remark, created_at)
        VALUES (?, 'pending', 'confirmed', ?, ?, NOW())
      `, [id, req.user.id, remark || '确认订单']);
      
      // 扣减原料库存（如果SKU配置的是原料扣减）
      await this.deductIngredientStock(conn, id, req.user.id);
      
      await conn.commit();
      return success(res, null, '订单确认成功');
      
    } catch (err) {
      await conn.rollback();
      return error(res, err.message || '确认订单失败', 400, 400);
    } finally {
      conn.release();
    }
  }

  /**
   * 扣减原料库存
   */
  async deductIngredientStock(conn, orderId, operatorId) {
    // 获取订单明细
    const [items] = await conn.execute(`
      SELECT oi.*, ps.stock_type, ps.id as sku_id
      FROM order_items oi
      JOIN product_skus ps ON oi.sku_id = ps.id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    for (const item of items) {
      if (item.stock_type !== 'ingredient_deduct') continue;
      
      // 获取BOM配方
      const [bom] = await conn.execute(`
        SELECT * FROM sku_bom_templates 
        WHERE sku_id = ? AND status = 1 
        ORDER BY version DESC LIMIT 1
      `, [item.sku_id]);
      
      if (bom.length === 0) continue;
      
      // 获取配方明细
      const [bomItems] = await conn.execute(`
        SELECT bi.*, i.stock_quantity, i.unit as ingredient_unit
        FROM sku_bom_items bi
        JOIN ingredients i ON bi.ingredient_id = i.id
        WHERE bi.bom_id = ?
      `, [bom[0].id]);
      
      for (const bomItem of bomItems) {
        // 计算实际用量（考虑损耗）
        const lossRate = bomItem.loss_rate || 0;
        const baseQty = parseFloat(bomItem.quantity) * item.quantity;
        const actualQty = baseQty * (1 + lossRate / 100);
        
        const beforeQty = parseFloat(bomItem.stock_quantity);
        const afterQty = beforeQty - actualQty;
        
        if (afterQty < 0) {
          throw new Error(`原料"${bomItem.name}"库存不足`);
        }
        
        // 更新原料库存
        await conn.execute(`
          UPDATE ingredients SET stock_quantity = ?, updated_at = NOW()
          WHERE id = ?
        `, [afterQty, bomItem.ingredient_id]);
        
        // 记录库存流水
        await conn.execute(`
          INSERT INTO ingredient_stock_records 
          (ingredient_id, change_type, change_quantity, before_quantity, after_quantity,
           biz_type, biz_id, operator_id, remark, created_at)
          VALUES (?, 'order_deduct', ?, ?, ?, 'order', ?, ?, ?, NOW())
        `, [bomItem.ingredient_id, actualQty, beforeQty, afterQty, orderId, operatorId, 
            `订单${orderId}扣减，SKU:${item.sku_name}`]);
      }
    }
  }

  /**
   * 更新订单状态
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, remark } = req.body;
      
      const order = await Order.findById(id);
      if (!order) {
        return error(res, '订单不存在', 404, 404);
      }
      
      const oldStatus = order.status;
      
      // 状态流转验证
      const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['producing', 'cancelled'],
        'producing': ['ready', 'cancelled'],
        'ready': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
      };
      
      if (!validTransitions[oldStatus].includes(status)) {
        return error(res, `不能从${oldStatus}变更为${status}`, 400, 400);
      }
      
      const pool = require('../config/database');
      
      // 更新状态
      let updateSql = 'UPDATE orders SET status = ?, updated_at = NOW()';
      const values = [status];
      
      if (status === 'completed') {
        updateSql += ', completed_at = NOW()';
      }
      if (status === 'cancelled') {
        updateSql += ', cancelled_at = NOW()';
      }
      
      updateSql += ' WHERE id = ?';
      values.push(id);
      
      await pool.execute(updateSql, values);
      
      // 记录状态变更
      await OrderStatusLog.create({
        order_id: id,
        from_status: oldStatus,
        to_status: status,
        operator_id: req.user.id,
        remark: remark || '',
        created_at: new Date()
      });
      
      // 如果完成订单，更新经营统计
      if (status === 'completed') {
        await this.updateBusinessStats(order);
      }
      
      return success(res, null, '状态更新成功');
    } catch (err) {
      return error(res, err.message || '更新状态失败');
    }
  }

  /**
   * 更新经营统计
   */
  async updateBusinessStats(order) {
    const bizDate = new Date().toISOString().split('T')[0];
    const stats = await DailyBusinessStats.getOrCreate(bizDate);
    
    await DailyBusinessStats.update(stats.id, {
      completed_order_count: stats.completed_order_count + 1,
      sales_amount: parseFloat(stats.sales_amount) + parseFloat(order.paid_amount),
      updated_at: new Date()
    });
  }

  /**
   * 添加支付记录
   */
  async addPayment(req, res) {
    try {
      const { id } = req.params;
      const { paymentMethod, amount } = req.body;
      
      const order = await Order.findById(id);
      if (!order) {
        return error(res, '订单不存在', 404, 404);
      }
      
      // 生成支付单号
      const paymentNo = 'PAY' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
      
      await Payment.create({
        order_id: id,
        payment_no: paymentNo,
        payment_method: paymentMethod,
        amount,
        status: 'success',
        paid_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // 更新订单支付状态
      const pool = require('../config/database');
      const [payments] = await pool.execute(
        'SELECT SUM(amount) as total FROM payments WHERE order_id = ? AND status = ?',
        [id, 'success']
      );
      
      const paidTotal = parseFloat(payments[0].total || 0);
      const orderAmount = parseFloat(order.paid_amount);
      
      let paymentStatus = 'pending';
      if (paidTotal >= orderAmount) {
        paymentStatus = 'paid';
      } else if (paidTotal > 0) {
        paymentStatus = 'partial';
      }
      
      await pool.execute(
        'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
        [paymentStatus, id]
      );
      
      return success(res, { paymentNo, paidTotal, paymentStatus }, '支付记录添加成功');
    } catch (err) {
      return error(res, '添加支付记录失败');
    }
  }

  /**
   * 获取订单统计
   */
  async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const pool = require('../config/database');
      
      // 订单统计
      const [orderStats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
          SUM(CASE WHEN status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as processing_count,
          SUM(total_amount) as total_amount,
          SUM(paid_amount) as paid_amount
        FROM orders
        WHERE DATE(created_at) BETWEEN ? AND ?
      `, [startDate || '1970-01-01', endDate || '2099-12-31']);
      
      // 今日待处理订单
      const today = new Date().toISOString().split('T')[0];
      const [todayPending] = await pool.execute(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE DATE(production_date) = ? AND status IN ('confirmed', 'producing')
      `, [today]);
      
      // 今日取货订单
      const [todayPickup] = await pool.execute(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE DATE(pickup_time) = ? AND status = 'ready'
      `, [today]);
      
      return success(res, {
        orderStats: orderStats[0],
        todayPending: todayPending[0].count,
        todayPickup: todayPickup[0].count
      });
    } catch (err) {
      return error(res, '获取订单统计失败');
    }
  }

  /**
   * 取消订单
   */
  async cancel(req, res) {
    const pool = require('../config/database');
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const { id } = req.params;
      const { reason } = req.body;
      
      const [order] = await conn.execute(
        'SELECT * FROM orders WHERE id = ?',
        [id]
      );
      
      if (order.length === 0) {
        throw new Error('订单不存在');
      }
      
      if (['completed', 'cancelled'].includes(order[0].status)) {
        throw new Error('订单已完结，无法取消');
      }
      
      // 如果已确认，需要回滚原料库存
      if (order[0].status !== 'pending') {
        await this.rollbackIngredientStock(conn, id, req.user.id);
      }
      
      // 更新订单状态
      await conn.execute(`
        UPDATE orders 
        SET status = 'cancelled', cancel_reason = ?, cancelled_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [reason, id]);
      
      // 记录状态变更
      await conn.execute(`
        INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, remark, created_at)
        VALUES (?, ?, 'cancelled', ?, ?, NOW())
      `, [id, order[0].status, req.user.id, `取消订单: ${reason}`]);
      
      await conn.commit();
      return success(res, null, '订单已取消');
      
    } catch (err) {
      await conn.rollback();
      return error(res, err.message || '取消订单失败', 400, 400);
    } finally {
      conn.release();
    }
  }

  /**
   * 回滚原料库存
   */
  async rollbackIngredientStock(conn, orderId, operatorId) {
    // 获取该订单的原料扣减记录
    const [records] = await conn.execute(`
      SELECT * FROM ingredient_stock_records
      WHERE biz_type = 'order' AND biz_id = ? AND change_type = 'order_deduct'
    `, [orderId]);
    
    for (const record of records) {
      const [ingredient] = await conn.execute(
        'SELECT stock_quantity FROM ingredients WHERE id = ?',
        [record.ingredient_id]
      );
      
      if (ingredient.length === 0) continue;
      
      const beforeQty = parseFloat(ingredient[0].stock_quantity);
      const afterQty = beforeQty + parseFloat(record.change_quantity);
      
      // 恢复库存
      await conn.execute(`
        UPDATE ingredients SET stock_quantity = ?, updated_at = NOW()
        WHERE id = ?
      `, [afterQty, record.ingredient_id]);
      
      // 记录回滚流水
      await conn.execute(`
        INSERT INTO ingredient_stock_records 
        (ingredient_id, change_type, change_quantity, before_quantity, after_quantity,
         biz_type, biz_id, operator_id, remark, created_at)
        VALUES (?, 'stock_in', ?, ?, ?, 'order_cancel', ?, ?, ?, NOW())
      `, [record.ingredient_id, record.change_quantity, beforeQty, afterQty, 
          orderId, operatorId, `订单取消回滚`]);
    }
  }
}

module.exports = new OrderController();