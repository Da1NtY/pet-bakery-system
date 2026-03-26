<template>
  <div class="order-page">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="订单号">
          <el-input v-model="searchForm.orderNo" placeholder="请输入订单号" clearable />
        </el-form-item>
        
        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
            <el-option 
              v-for="(item, key) in orderStatusMap" 
              :key="key" 
              :label="item.text" 
              :value="key" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <el-card class="mt-15">
      <template #header>
        <div class="card-header">
          <span>订单列表</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon> 新建订单
          </el-button>
        </div>
      </template>

      <!-- 表格 -->
      <el-table 
        :data="tableData" 
        v-loading="loading"
        @row-click="handleRowClick"
        highlight-current-row
      >
        <el-table-column prop="order_no" label="订单号" width="150" />
        
        <el-table-column label="客户信息" min-width="150">
          <template #default="{ row }">
            <div>{{ row.customer_name }}</div>
            <div class="text-gray">{{ row.customer_mobile }}</div>
          </template>
        </el-table-column>
        
        <el-table-column label="订单金额" width="120">
          <template #default="{ row }">
            <div class="text-danger">¥{{ row.total_amount }}</div>
            <div class="text-success" v-if="row.discount_amount > 0">
              优惠¥{{ row.discount_amount }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="orderStatusMap[row.status]?.type">
              {{ orderStatusMap[row.status]?.text }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="支付" width="100">
          <template #default="{ row }">
            <el-tag :type="paymentStatusMap[row.payment_status]?.type" size="small">
              {{ paymentStatusMap[row.payment_status]?.text }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="pickup_time" label="取货时间" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.pickup_time) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="创建时间" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click.stop="viewDetail(row.id)">
              详情
            </el-button>
            
            <el-dropdown @command="handleCommand($event, row)" @click.stop>
              <el-button type="primary" link>
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    command="confirm" 
                    v-if="row.status === 'pending'"
                  >
                    确认订单
                  </el-dropdown-item>
                  <el-dropdown-item 
                    command="produce" 
                    v-if="row.status === 'confirmed'"
                  >
                    开始制作
                  </el-dropdown-item>
                  <el-dropdown-item 
                    command="ready" 
                    v-if="row.status === 'producing'"
                  >
                    制作完成
                  </el-dropdown-item>
                  <el-dropdown-item 
                    command="complete" 
                    v-if="row.status === 'ready'"
                  >
                    完成订单
                  </el-dropdown-item>
                  <el-dropdown-item command="payment">
                    添加收款
                  </el-dropdown-item>
                  <el-dropdown-item 
                    command="cancel" 
                    divided
                    v-if="!['completed', 'cancelled'].includes(row.status)"
                  >
                    <span class="text-danger">取消订单</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 取消订单弹窗 -->
    <el-dialog v-model="cancelVisible" title="取消订单" width="400px">
      <el-form :model="cancelForm">
        <el-form-item label="取消原因" required>
          <el-input 
            v-model="cancelForm.reason" 
            type="textarea" 
            rows="3"
            placeholder="请输入取消原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmCancel">确认取消</el-button>
      </template>
    </el-dialog>

    <!-- 收款弹窗 -->
    <el-dialog v-model="paymentVisible" title="添加收款" width="400px">
      <el-form :model="paymentForm" label-width="80px">
        <el-form-item label="支付方式">
          <el-select v-model="paymentForm.paymentMethod" style="width: 100%">
            <el-option label="现金" value="cash" />
            <el-option label="微信支付" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="银行卡" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="收款金额">
          <el-input-number 
            v-model="paymentForm.amount" 
            :precision="2" 
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPayment">确认收款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderList, updateOrderStatus, cancelOrder, addPayment } from '@/api/order'
import { orderStatusMap, paymentStatusMap } from '@/utils/format'
import { formatDateTime } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const tableData = ref([])
const currentRow = ref(null)

const searchForm = reactive({
  orderNo: '',
  status: '',
  dateRange: []
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 取消订单
const cancelVisible = ref(false)
const cancelForm = reactive({
  orderId: null,
  reason: ''
})

// 收款
const paymentVisible = ref(false)
const paymentForm = reactive({
  orderId: null,
  paymentMethod: 'cash',
  amount: 0
})

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      orderNo: searchForm.orderNo,
      status: searchForm.status
    }
    
    if (searchForm.dateRange?.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const res = await getOrderList(params)
    tableData.value = res.list
    pagination.total = res.pagination.total
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  searchForm.orderNo = ''
  searchForm.status = ''
  searchForm.dateRange = []
  handleSearch()
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
  loadData()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  loadData()
}

const handleCreate = () => {
  router.push('/order/create')
}

const viewDetail = (id) => {
  router.push(`/order/detail/${id}`)
}

const handleRowClick = (row) => {
  // 行点击事件，可扩展
}

const handleCommand = (command, row) => {
  currentRow.value = row
  
  switch (command) {
    case 'confirm':
      handleStatusChange(row.id, 'confirmed', '确认订单')
      break
    case 'produce':
      handleStatusChange(row.id, 'producing', '开始制作')
      break
    case 'ready':
      handleStatusChange(row.id, 'ready', '制作完成')
      break
    case 'complete':
      handleStatusChange(row.id, 'completed', '完成订单')
      break
    case 'cancel':
      cancelForm.orderId = row.id
      cancelForm.reason = ''
      cancelVisible.value = true
      break
    case 'payment':
      paymentForm.orderId = row.id
      paymentForm.amount = row.total_amount - row.paid_amount
      paymentVisible.value = true
      break
  }
}

const handleStatusChange = async (id, status, actionName) => {
  try {
    await ElMessageBox.confirm(`确认${actionName}？`, '提示', {
      type: 'warning'
    })
    await updateOrderStatus(id, { status })
    ElMessage.success(`${actionName}成功`)
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

const confirmCancel = async () => {
  if (!cancelForm.reason.trim()) {
    ElMessage.warning('请输入取消原因')
    return
  }
  
  try {
    await cancelOrder(cancelForm.orderId, { reason: cancelForm.reason })
    ElMessage.success('订单已取消')
    cancelVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  }
}

const confirmPayment = async () => {
  if (paymentForm.amount <= 0) {
    ElMessage.warning('收款金额必须大于0')
    return
  }
  
  try {
    await addPayment(paymentForm.orderId, {
      paymentMethod: paymentForm.paymentMethod,
      amount: paymentForm.amount
    })
    ElMessage.success('收款记录已添加')
    paymentVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.order-page {
  .search-card {
    margin-bottom: 15px;
  }
  
  .mt-15 {
    margin-top: 15px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .text-gray {
    color: #909399;
    font-size: 12px;
  }
  
  .text-danger {
    color: #F56C6C;
    font-weight: bold;
  }
  
  .text-success {
    color: #67C23A;
    font-size: 12px;
  }
  
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>