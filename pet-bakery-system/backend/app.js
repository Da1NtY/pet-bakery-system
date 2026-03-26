const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config();

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== 测试路由放这里（在所有路由之前）==========
app.get('/api/test-db', async (req, res) => {
  try {
    const pool = require('./config/database');
    const [rows] = await pool.execute('SELECT 1 as test, NOW() as time');
    const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
    
    res.json({
      dbConnected: true,
      serverTime: rows[0].time,
      userCount: users[0].count,
      dbHost: process.env.DB_HOST
    });
  } catch (err) {
    res.json({
      dbConnected: false,
      error: err.message,
      dbHost: process.env.DB_HOST
    });
  }
});
// 路由
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use(errorHandler);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
    timestamp: Date.now()
  });
});



app.listen(PORT, () => {
  console.log(`
🚀 宠物烘焙店后台管理系统已启动
📡 服务地址: http://localhost:${PORT}
📚 API地址: http://localhost:${PORT}/api
💓 健康检查: http://localhost:${PORT}/health
  `);
});

module.exports = app;