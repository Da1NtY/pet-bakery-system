<template>
  <div class="order-detail" v-loading="loading">
    <!-- 操作栏 -->
    <el-card class="mb-15">
      <div class="header-actions">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        
        <div class="actions">
          <el-button 
            type="primary" 
            v-if="order.status === 'pending'"
            @click="handleConfirm"
          >
            确认订单
          </el-button>
          <el-button 
            type="success" 
            v-if="order.status === 'ready'"
            @click="handleComplete"
          >
            完成订单
          </el-button>
          <el-button 
            type="danger" 
            plain
            v-if="!['completed', 'cancelled'].includes(order.status)"
            @click="handleCancel"
          >
            取消订单
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 订单基本信息 -->
    <el-row :gutter="15">
      <el-col :span="16">
        <el-card class="mb-15">
          <template #header>
            <div class="card-header">
              <span>订单信息</span>
              <div>
                <el-tag :type="orderStatusMap[order.status]?.type" size="large">
                  {{ orderStatusMap[order.status]?.text }}
                </el-tag>
                <el-tag :type="paymentStatusMap[order.payment_status]?.type" size="large" class="ml-10">
                  {{ paymentStatusMap[order.payment_status]?.text }}
                </el-tag>
              </div>
            </div>
          </template>
          
          <el-descriptions :column="2" border>
            <el-descriptions-item label="订单号">{{ order.order_no }}</el-descriptions-item>
            <el-descriptions-item label="订单来源">{{ order.order_source }}</el-descriptions-item>
            <el-descriptions-item label="订单类型">{{ order.order_type === 'custom' ? '定制' : '普通' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(order.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="客户姓名">{{ order.customer_name }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ order.customer_mobile }}</el-descriptions-item>
            <el-descriptions-item label="宠物信息" :span="2">
              {{ order.pet_name }} {{ order.pet_type ? `(${petTypeMap[order.pet_type]})` : '' }}
            </el-descriptions-item>
            <el-descriptions-item label="制作日期">{{ order.production_date }}</el-descriptions-item>
            <el-descriptions-item label="取货时间">{{ formatDateTime(order.pickup_time) }}</el-descriptions-item>
            <el-descriptions-item label="交付方式">{{ order.delivery_type === 'delivery' ? '配送' : '自提' }}</el-descriptions-item>
            <el-descriptions-item label="收货地址" :span="2" v-if="order.delivery_type === 'delivery'">
              {{ order.receiver_address }}
            </el-descriptions-item>
            <el-descriptions-item label="祝福语" :span="2" v-if="order.custom_message">
              {{ order.custom_message }}
            </el-descriptions-item>
            <el-descriptions-item label="定制要求" :span="2" v-if="order.custom_requirements">
              {{ order.custom_requirements }}
            </el-descriptions-item>
            <el-descriptions-item label="客户备注" :span="2" v-if="order.customer_note">
              {{ order.customer_note }}
            </el-descriptions-item>
            <el-descriptions-item label="取消原因" :span="2" v-if="order.cancel_reason">
              <span class="text-danger">{{ order.cancel_reason }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 订单商品 -->
        <el-card class="mb-15">
          <template #header>
            <span>订单商品</span>
          </template>
          
          <el-table :data="order.items || []">
            <el-table-column prop="sku_name" label="商品名称" min-width="150" />
            <el-table-column prop="spec_snapshot" label="规格" width="150">
              <template #default="{ row }">
                {{ formatSpec(row.spec_snapshot) }}
              </template>
            </el-table-column>
            <el-table-column prop="unit_price" label="单价" width="100">
              <template #default="{ row }">
                ¥{{ row.unit_price }}
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column prop="subtotal_amount" label="小计" width="100">
              <template #default="{ row }">
                <strong>¥{{ row.subtotal_amount }}</strong>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="order-amount">
            <div class="amount-row">
              <span>商品总额：</span>
              <span>¥{{ order.total_amount }}</span>
            </div>
            <div class="amount-row" v-if="order.discount_amount > 0">
              <span>优惠金额：</span>
              <span class="text-success">-¥{{ order.discount_amount }}</span>
            </div>
            <div class="amount-row total">
              <span>实付金额：</span>
              <span class="text-danger">¥{{ order.paid_amount }}</span>
            </div>
          </div>
        </el-card>

        <!-- 状态流水 -->
        <el-card>
          <template #header>
            <span>订单日志</span>
          </template>
          
          <el-timeline>
            <el-timeline-item
              v-for="log in order.statusLogs || []"
              :key="log.id"
              :type="log.to_status === 'cancelled' ? 'danger' : 'primary'"
              :timestamp="formatDateTime(log.created_at)"
            >
              {{ getStatusChangeText(log) }}
              <div v-if="log.operator_name" class="log-operator">
                操作人：{{ log.operator_name }}
              </div>
              <div v-if="log.remark" class="log-remark">
                备注：{{ log.remark }}
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>

      <!-- 右侧信息 -->
      <el-col :span="8">
        <!-- 支付记录 -->
        <el-card class="mb-15">
          <template #header>
            <div class="card-header">
              <span>支付记录</span>
              <el-button type="primary" link @click="showPaymentDialog">
                添加收款
              </el-button>
            </div>
          </template>
          
          <div v-if="order.payments?.length" class="payment-list">
            <div 
              v-for="payment in order.payments" 
              :key="payment.id"
              class="payment-item"
            >
              <div class="payment-info">
                <div>{{ formatPaymentMethod(payment.payment_method) }}</div>
                <div class="payment-time">{{ formatDateTime(payment.created_at) }}</div>
              </div>
              <div class="payment-amount">¥{{ payment.amount }}</div>
            </div>
          </div>
          
          <el-empty v-else description="暂无支付记录" />
          
          <div class="payment-summary" v-if="order.payments?.length">
            <div>已支付：¥{{ getPaidAmount() }}</div>
            <div v-if="getUnpaidAmount() > 0" class="text-danger">
              待支付：¥{{ getUnpaidAmount() }}
            </div>
          </div>
        </el-card>

        <!-- 快捷操作 -->
        <el-card>
          <template #header>
            <span>快捷操作</span>
          </template>
          
          <div class="quick-actions">
            <el-button type="primary" plain @click="printOrder">
              <el-icon><Printer /></el-icon> 打印订单
            </el-button>
            <el-button type="success" plain @click="copyOrderInfo">
              <el-icon><DocumentCopy /></el-icon> 复制信息
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

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
            :max="getUnpaidAmount()"
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
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderDetail, updateOrderStatus, cancelOrder, addPayment, confirmOrder } from '@/api/order'
import { orderStatusMap, paymentStatusMap, petTypeMap } from '@/utils/format'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const order = ref({})

const paymentVisible = ref(false)
const paymentForm = reactive({
  paymentMethod: 'cash',
  amount: 0
})

const loadData = async () => {
  loading.value = true
  try {
    const id = route.params.id
    const data = await getOrderDetail(id)
    order.value = data
  } finally {
    loading.value = false
  }
}

const formatSpec = (spec) => {
  if (!spec) return '-'
  if (typeof spec === 'string') {
    try {
      spec = JSON.parse(spec)
    } catch {
      return spec
    }
  }
  return Object.values(spec).join(' / ')
}

const getStatusChangeText = (log) => {
  if (!log.from_status) return `创建订单，状态：${orderStatusMap[log.to_status]?.text}`
  return `${orderStatusMap[log.from_status]?.text} → ${orderStatusMap[log.to_status]?.text}`
}

const formatPaymentMethod = (method) => {
  const map = {
    'cash': '现金',
    'wechat': '微信支付',
    'alipay': '支付宝',
    'bank': '银行卡'
  }
  return map[method] || method
}

const getPaidAmount = () => {
  return order.value.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0
}

const getUnpaidAmount = () => {
  return parseFloat(order.value.paid_amount || 0) - getPaidAmount()
}

const handleConfirm = async () => {
  try {
    await ElMessageBox.confirm('确认接收此订单？确认后将扣减原料库存', '提示')
    await confirmOrder(order.value.id, {})
    ElMessage.success('订单已确认')
    loadData()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const handleComplete = async () => {
  try {
    await ElMessageBox.confirm('确认完成此订单？', '提示')
    await updateOrderStatus(order.value.id, { status: 'completed' })
    ElMessage.success('订单已完成')
    loadData()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const handleCancel = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入取消原因', '取消订单', {
      confirmButtonText: '确认取消',
      cancelButtonText: '返回',
      inputValidator: (val) => !!val || '请输入取消原因',
      type: 'warning'
    })
    
    await cancelOrder(order.value.id, { reason: value })
    ElMessage.success('订单已取消')
    loadData()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const showPaymentDialog = () => {
  paymentForm.paymentMethod = 'cash'
  paymentForm.amount = getUnpaidAmount()
  paymentVisible.value = true
}

const confirmPayment = async () => {
  try {
    await addPayment(order.value.id, {
      paymentMethod: paymentForm.paymentMethod,
      amount: paymentForm.amount
    })
    ElMessage.success('收款成功')
    paymentVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  }
}

const printOrder = () => {
  window.print()
}

const copyOrderInfo = () => {
  const text = `订单号：${order.value.order_no}
客户：${order.value.customer_name}
电话：${order.value.customer_mobile}
金额：¥${order.value.paid_amount}
取货时间：${formatDateTime(order.value.pickup_time)}`
  
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('订单信息已复制')
  })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.order-detail {
  .mb-15 {
    margin-bottom: 15px;
  }
  
  .ml-10 {
    margin-left: 10px;
  }
  
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
  }
  
  .text-danger {
    color: #F56C6C;
  }
  
  .text-success {
    color: #67C23A;
  }
  
  .order-amount {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed #DCDFE6;
    text-align: right;
    
    .amount-row {
      margin-bottom: 10px;
      color: #606266;
      
      &.total {
        font-size: 18px;
        font-weight: bold;
        color: #303133;
      }
    }
  }
  
  .log-operator, .log-remark {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
  }
  
  .payment-list {
    .payment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #EBEEF5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .payment-time {
        font-size: 12px;
        color: #909399;
        margin-top: 4px;
      }
      
      .payment-amount {
        font-size: 16px;
        font-weight: bold;
        color: #67C23A;
      }
    }
  }
  
  .payment-summary {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #EBEEF5;
    text-align: right;
    font-size: 14px;
  }
  
  .quick-actions {
    display: flex;
    gap: 10px;
    
    .el-button {
      flex: 1;
    }
  }
}

@media print {
  .header-actions, .el-card__header, .quick-actions {
    display: none !important;
  }
}
</style>