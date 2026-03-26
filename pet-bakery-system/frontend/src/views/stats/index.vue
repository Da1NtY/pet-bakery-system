<template>
  <div class="stats-page">
    <!-- 日期筛选 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="loadData">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon> 导出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 经营概览 -->
    <el-row :gutter="15" class="mt-15">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #409EFF;">
            <el-icon><ShoppingCart /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ overview.orderCount || 0 }}</div>
            <div class="stat-label">订单总数</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #67C23A;">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatMoney(overview.salesAmount) }}</div>
            <div class="stat-label">销售总额</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #E6A23C;">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ overview.customerCount || 0 }}</div>
            <div class="stat-label">消费客户</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #F56C6C;">
            <el-icon><Goods /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ overview.avgOrderAmount || '¥0.00' }}</div>
            <div class="stat-label">客单价</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 销售趋势 -->
    <el-card class="mt-15">
      <template #header>
        <div class="card-header">
          <span>销售趋势</span>
          <el-radio-group v-model="chartType" size="small">
            <el-radio-button label="amount">销售额</el-radio-button>
            <el-radio-button label="count">订单数</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div ref="trendChartRef" style="height: 350px;"></div>
    </el-card>

    <!-- 商品销售排行 & 客户消费排行 -->
    <el-row :gutter="15" class="mt-15">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>商品销售TOP10</span>
          </template>
          <el-table :data="productStats" max-height="400">
            <el-table-column type="index" width="50" />
            <el-table-column prop="sku_name" label="商品名称" show-overflow-tooltip />
            <el-table-column prop="total_quantity" label="销量" width="80" />
            <el-table-column prop="total_amount" label="销售额" width="120">
              <template #default="{ row }">
                {{ formatMoney(row.total_amount) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>客户消费TOP10</span>
          </template>
          <el-table :data="customerStats" max-height="400">
            <el-table-column type="index" width="50" />
            <el-table-column prop="name" label="客户姓名" />
            <el-table-column prop="mobile" label="手机号" width="120" />
            <el-table-column prop="total_order_count" label="订单数" width="80" />
            <el-table-column prop="total_spent_amount" label="消费金额" width="120">
              <template #default="{ row }">
                {{ formatMoney(row.total_spent_amount) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 每日明细 -->
    <el-card class="mt-15">
      <template #header>
        <span>每日经营明细</span>
      </template>
      <el-table :data="dailyStats">
        <el-table-column prop="biz_date" label="日期" width="120" />
        <el-table-column prop="order_count" label="订单数" width="100" />
        <el-table-column prop="completed_order_count" label="已完成" width="100" />
        <el-table-column prop="sales_amount" label="销售额" width="120">
          <template #default="{ row }">
            {{ formatMoney(row.sales_amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="refund_amount" label="退款额" width="120">
          <template #default="{ row }">
            <span v-if="row.refund_amount > 0" class="text-danger">
              {{ formatMoney(row.refund_amount) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="customer_count" label="消费客户" width="100" />
        <el-table-column prop="new_customer_count" label="新增客户" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { getDailyStats, getProductStats, getCustomerStats } from '@/api/stats'
import { formatMoney } from '@/utils/format'

const filterForm = reactive({
  dateRange: [
    dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD')
  ]
})

const overview = ref({})
const dailyStats = ref([])
const productStats = ref([])
const customerStats = ref([])

const chartType = ref('amount')
const trendChartRef = ref()
let trendChart = null

const initTrendChart = () => {
  if (!trendChartRef.value) return
  
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

const updateTrendChart = () => {
  if (!trendChart || !dailyStats.value.length) return
  
  const dates = dailyStats.value.map(item => dayjs(item.biz_date).format('MM-DD'))
  const values = chartType.value === 'amount' 
    ? dailyStats.value.map(item => item.sales_amount)
    : dailyStats.value.map(item => item.order_count)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      name: chartType.value === 'amount' ? '销售额(元)' : '订单数'
    },
    series: [{
      name: chartType.value === 'amount' ? '销售额' : '订单数',
      type: 'bar',
      barWidth: '60%',
      data: values,
      itemStyle: {
        color: chartType.value === 'amount' ? '#409EFF' : '#67C23A'
      }
    }]
  }
  
  trendChart.setOption(option)
}

watch(chartType, () => {
  updateTrendChart()
})

const loadData = async () => {
  const params = {
    startDate: filterForm.dateRange?.[0],
    endDate: filterForm.dateRange?.[1]
  }
  
  // 并行加载数据
  const [dailyRes, productRes, customerRes] = await Promise.all([
    getDailyStats(params),
    getProductStats(params),
    getCustomerStats()
  ])
  
  dailyStats.value = dailyRes || []
  productStats.value = (productRes || []).slice(0, 10)
  customerStats.value = (customerRes || []).slice(0, 10)
  
  // 计算概览数据
  const total = dailyStats.value.reduce((acc, item) => ({
    orderCount: acc.orderCount + (item.order_count || 0),
    salesAmount: acc.salesAmount + parseFloat(item.sales_amount || 0),
    customerCount: acc.customerCount + (item.customer_count || 0)
  }), { orderCount: 0, salesAmount: 0, customerCount: 0 })
  
  overview.value = {
    ...total,
    salesAmount: total.salesAmount,
    avgOrderAmount: total.orderCount > 0 
      ? '¥' + (total.salesAmount / total.orderCount).toFixed(2)
      : '¥0.00'
  }
  
  updateTrendChart()
}

const handleReset = () => {
  filterForm.dateRange = [
    dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD')
  ]
  loadData()
}

const handleExport = () => {
  // 导出CSV
  const headers = ['日期', '订单数', '已完成', '销售额', '退款额', '消费客户', '新增客户']
  const rows = dailyStats.value.map(item => [
    item.biz_date,
    item.order_count,
    item.completed_order_count,
    item.sales_amount,
    item.refund_amount,
    item.customer_count,
    item.new_customer_count
  ])
  
  const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `经营报表_${dayjs().format('YYYY-MM-DD')}.csv`
  link.click()
}

onMounted(() => {
  loadData()
  initTrendChart()
  window.addEventListener('resize', () => trendChart?.resize())
})

onUnmounted(() => {
  trendChart?.dispose()
})
</script>

<style scoped lang="scss">
.stats-page {
  .filter-card {
    margin-bottom: 15px;
  }
  
  .mt-15 {
    margin-top: 15px;
  }
  
  .stat-card {
    display: flex;
    align-items: center;
    padding: 10px;
    
    .stat-icon {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 24px;
      margin-right: 15px;
    }
    
    .stat-info {
      .stat-value {
        font-size: 20px;
        font-weight: bold;
        color: #303133;
      }
      
      .stat-label {
        color: #909399;
        margin-top: 5px;
        font-size: 12px;
      }
    }
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .text-danger {
    color: #F56C6C;
  }
}
</style>