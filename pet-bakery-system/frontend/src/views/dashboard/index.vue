<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #409EFF;">
            <el-icon><ShoppingCart /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.today?.orderCount || 0 }}</div>
            <div class="stat-label">今日订单</div>
          </div>
          <div class="stat-compare">
            较昨日 {{ stats.yesterday?.orderCount || 0 }}
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #67C23A;">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatMoney(stats.today?.salesAmount) }}</div>
            <div class="stat-label">今日销售额</div>
          </div>
          <div class="stat-compare">
            较昨日 {{ formatMoney(stats.yesterday?.salesAmount) }}
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #E6A23C;">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.today?.customerCount || 0 }}</div>
            <div class="stat-label">今日客户</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #F56C6C;">
            <el-icon><Bell /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pendingOrders || 0 }}</div>
            <div class="stat-label">待处理订单</div>
          </div>
          <div class="stat-compare" v-if="stats.lowStockCount > 0">
            <el-tag type="danger">{{ stats.lowStockCount }} 种原料库存不足</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 待办事项 -->
    <el-row :gutter="20" class="mt-20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>今日取货提醒</span>
              <el-tag type="success">{{ stats.todayPickup?.length || 0 }} 单</el-tag>
            </div>
          </template>
          
          <el-table :data="stats.todayPickup || []" v-if="stats.todayPickup?.length">
            <el-table-column prop="order_no" label="订单号" width="140" />
            <el-table-column prop="customer_name" label="客户" />
            <el-table-column prop="customer_mobile" label="电话" />
            <el-table-column prop="pickup_time" label="取货时间" width="100">
              <template #default="{ row }">
                {{ formatTime(row.pickup_time) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="primary" link @click="viewOrder(row.id)">
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <el-empty v-else description="今日暂无取货订单" />
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>热销商品 TOP5</span>
            </div>
          </template>
          
          <el-table :data="stats.hotProducts || []">
            <el-table-column type="index" width="50" />
            <el-table-column prop="sku_name" label="商品名称" />
            <el-table-column prop="total_quantity" label="销量" width="80" />
            <el-table-column prop="total_amount" label="销售额" width="100">
              <template #default="{ row }">
                {{ formatMoney(row.total_amount) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 销售趋势 -->
    <el-card class="mt-20">
      <template #header>
        <div class="card-header">
          <span>近7天销售趋势</span>
        </div>
      </template>
      
      <div ref="chartRef" style="height: 300px;"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getDashboard } from '@/api/stats'
import { formatMoney } from '@/utils/format'
import dayjs from 'dayjs'

const router = useRouter()
const stats = ref({})
const chartRef = ref()
let chartInstance = null

const formatTime = (time) => {
  return time ? dayjs(time).format('HH:mm') : '-'
}

const viewOrder = (id) => {
  router.push(`/order/detail/${id}`)
}

const loadData = async () => {
  const data = await getDashboard()
  stats.value = data
  
  // 渲染图表
  if (data.salesTrend) {
    renderChart(data.salesTrend)
  }
}

const renderChart = (trendData) => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  
  const dates = trendData.map(item => dayjs(item.date).format('MM-DD'))
  const amounts = trendData.map(item => item.sales_amount)
  const counts = trendData.map(item => item.order_count)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['销售额', '订单数']
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额',
        axisLabel: {
          formatter: '¥{value}'
        }
      },
      {
        type: 'value',
        name: '订单数'
      }
    ],
    series: [
      {
        name: '销售额',
        type: 'bar',
        data: amounts,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '订单数',
        type: 'line',
        yAxisIndex: 1,
        data: counts,
        itemStyle: { color: '#67C23A' }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', () => chartInstance?.resize())
})

onUnmounted(() => {
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.dashboard {
  .mt-20 {
    margin-top: 20px;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 10px;
  
  .stat-icon {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 28px;
    margin-right: 15px;
  }
  
  .stat-info {
    flex: 1;
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #303133;
    }
    
    .stat-label {
      color: #909399;
      margin-top: 5px;
    }
  }
  
  .stat-compare {
    color: #909399;
    font-size: 12px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: bold;
}
</style>