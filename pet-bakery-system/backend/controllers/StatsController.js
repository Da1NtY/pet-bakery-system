const { DailyBusinessStats } = require('../models');
const { success, error } = require('../utils/response');
const dayjs = require('dayjs');

class StatsController {
  /**
   * 获取每日经营统计
   */
  async getDailyStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate || dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      const end = endDate || dayjs().format('YYYY-MM-DD');
      
      const list = await DailyBusinessStats.findByDateRange(start, end);
      
      return success(res, list);
    } catch (err) {
      return error(res, '获取统计数据失败');
    }
  }

  /**
   * 获取仪表盘数据
   */
  async getDashboard(req, res) {
    try {
      const pool = require('../config/database');
      const today = dayjs().format('YYYY-MM-DD');
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      const thisMonthStart = dayjs().startOf('month').format('YYYY-MM-DD');
      
      // 今日数据
      const [todayStats] = await pool.execute(`
        SELECT 
          COUNT(*) as order_count,
          SUM(total_amount) as sales_amount,
          COUNT(DISTINCT customer_id) as customer_count
        FROM orders
        WHERE DATE(created_at) = ?
      `, [today]);
      
      // 昨日数据
      const [yesterdayStats] = await pool.execute(`
        SELECT 
          COUNT(*) as order_count,
          SUM(total_amount) as sales_amount
        FROM orders
        WHERE DATE(created_at) = ?
      `, [yesterday]);
      
      // 本月数据
      const [monthStats] = await pool.execute(`
        SELECT 
          COUNT(*) as order_count,
          SUM(total_amount) as sales_amount
        FROM orders
        WHERE DATE(created_at) >= ?
      `, [thisMonthStart]);
      
      // 待处理订单
      const [pendingOrders] = await pool.execute(`
        SELECT COUNT(*) as count FROM orders
        WHERE status IN ('pending', 'confirmed', 'producing')
      `);
      
      // 低库存原料
      const [lowStock] = await pool.execute(`
        SELECT COUNT(*) as count FROM ingredients
        WHERE stock_quantity <= safety_stock AND status = 1
      `);
      
      // 今日取货提醒
      const [todayPickup] = await pool.execute(`
        SELECT o.*, c.name as customer_name, c.mobile as customer_mobile
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE DATE(o.pickup_time) = ? AND o.status = 'ready'
        ORDER BY o.pickup_time
      `, [today]);
      
      // 销售趋势（最近7天）
      const [salesTrend] = await pool.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as order_count,
          SUM(total_amount) as sales_amount
        FROM orders
        WHERE created_at >= DATE_SUB(?, INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [today]);
      
      // 热销商品TOP5
      const [hotProducts] = await pool.execute(`
        SELECT 
          oi.sku_name,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.subtotal_amount) as total_amount
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed' AND o.created_at >= DATE_SUB(?, INTERVAL 30 DAY)
        GROUP BY oi.sku_id, oi.sku_name
        ORDER BY total_quantity DESC
        LIMIT 5
      `, [today]);
      
      return success(res, {
        today: {
          orderCount: todayStats[0].order_count || 0,
          salesAmount: todayStats[0].sales_amount || 0,
          customerCount: todayStats[0].customer_count || 0
        },
        yesterday: {
          orderCount: yesterdayStats[0].order_count || 0,
          salesAmount: yesterdayStats[0].sales_amount || 0
        },
        month: {
          orderCount: monthStats[0].order_count || 0,
          salesAmount: monthStats[0].sales_amount || 0
        },
        pendingOrders: pendingOrders[0].count,
        lowStockCount: lowStock[0].count,
        todayPickup: todayPickup,
        salesTrend: salesTrend,
        hotProducts: hotProducts
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      return error(res, '获取仪表盘数据失败');
    }
  }

  /**
   * 获取商品销售统计
   */
  async getProductStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const pool = require('../config/database');
      
      const [rows] = await pool.execute(`
        SELECT 
          p.name as product_name,
          ps.sku_name,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.subtotal_amount) as total_amount,
          COUNT(DISTINCT o.id) as order_count,
          AVG(oi.unit_price) as avg_price
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN product_skus ps ON oi.sku_id = ps.id
        WHERE o.status = 'completed'
          AND DATE(o.created_at) BETWEEN ? AND ?
        GROUP BY oi.sku_id, p.name, ps.sku_name
        ORDER BY total_quantity DESC
      `, [startDate || '1970-01-01', endDate || '2099-12-31']);
      
      return success(res, rows);
    } catch (err) {
      return error(res, '获取商品统计失败');
    }
  }

  /**
   * 获取客户消费统计
   */
  async getCustomerStats(req, res) {
    try {
      const pool = require('../config/database');
      
      const [rows] = await pool.execute(`
        SELECT 
          c.name,
          c.mobile,
          c.total_order_count,
          c.total_spent_amount,
          c.last_order_at,
          COUNT(DISTINCT p.id) as pet_count
        FROM customers c
        LEFT JOIN pets p ON c.id = p.customer_id
        ORDER BY c.total_spent_amount DESC
        LIMIT 50
      `);
      
      return success(res, rows);
    } catch (err) {
      return error(res, '获取客户统计失败');
    }
  }
}

module.exports = new StatsController();