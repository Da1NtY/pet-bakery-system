<template>
  <div class="ingredient-page">
    <!-- 预警提示 -->
    <el-alert
      v-if="lowStockList.length > 0"
      :title="`有 ${lowStockList.length} 种原料库存不足，请及时补货`"
      type="warning"
      show-icon
      :closable="false"
      class="mb-15"
    />

    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="原料名称">
          <el-input v-model="searchForm.keyword" placeholder="请输入" clearable />
        </el-form-item>
        
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable>
            <el-option label="原材料" value="material" />
            <el-option label="包装材料" value="package" />
            <el-option label="装饰材料" value="decor" />
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt-15">
      <template #header>
        <div class="card-header">
          <span>原料列表</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon> 新增原料
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="name" label="原料名称" min-width="150" />
        
        <el-table-column prop="code" label="编码" width="120" />
        
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            {{ formatType(row.ingredient_type) }}
          </template>
        </el-table-column>
        
        <el-table-column label="库存" width="150">
          <template #default="{ row }">
            <div :class="{ 'text-danger': isLowStock(row) }">
              {{ row.stock_quantity }} {{ row.unit }}
            </div>
            <div class="text-gray" v-if="row.safety_stock > 0">
              安全库存: {{ row.safety_stock }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="purchase_price" label="采购单价" width="120">
          <template #default="{ row }">
            ¥{{ row.purchase_price }}/{{ row.unit }}
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="primary" link @click="handleAdjust(row)">库存调整</el-button>
            <el-button type="primary" link @click="handleRecords(row)">流水</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, prev, pager, next"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 原料表单 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑原料' : '新增原料'" 
      width="500px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="原料名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        
        <el-form-item label="原料编码" prop="code">
          <el-input v-model="form.code" :disabled="isEdit" />
        </el-form-item>
        
        <el-form-item label="类型" prop="ingredientType">
          <el-select v-model="form.ingredientType" style="width: 100%">
            <el-option label="原材料" value="material" />
            <el-option label="包装材料" value="package" />
            <el-option label="装饰材料" value="decor" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="单位" prop="unit">
          <el-select v-model="form.unit" style="width: 100%">
            <el-option label="克 (g)" value="g" />
            <el-option label="千克 (kg)" value="kg" />
            <el-option label="毫升 (ml)" value="ml" />
            <el-option label="个 (piece)" value="piece" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="初始库存" prop="stockQuantity" v-if="!isEdit">
          <el-input-number v-model="form.stockQuantity" :min="0" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="安全库存">
          <el-input-number v-model="form.safetyStock" :min="0" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="采购单价">
          <el-input-number 
            v-model="form.purchasePrice" 
            :min="0" 
            :precision="4"
            style="width: 100%" 
          />
        </el-form-item>
        
        <el-form-item label="临期预警(天)">
          <el-input-number v-model="form.expiryWarningDays" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 库存调整 -->
    <el-dialog v-model="adjustVisible" title="库存调整" width="400px">
      <el-form :model="adjustForm" label-width="80px">
        <el-form-item label="当前库存">
          <el-input :model-value="currentStock" disabled />
        </el-form-item>
        
        <el-form-item label="调整数量" required>
          <el-input-number 
            v-model="adjustForm.changeQuantity" 
            style="width: 100%"
            placeholder="正数为入库，负数为出库"
          />
        </el-form-item>
        
        <el-form-item label="调整原因" required>
          <el-input 
            v-model="adjustForm.reason" 
            type="textarea" 
            rows="3"
            placeholder="请输入调整原因"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAdjust" :loading="adjusting">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 库存流水 -->
    <el-dialog v-model="recordsVisible" title="库存流水" width="700px">
      <el-table :data="recordsData" max-height="400">
        <el-table-column prop="created_at" label="时间" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="change_type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getChangeTypeType(row.change_type)">
              {{ getChangeTypeText(row.change_type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="change_quantity" label="数量" width="100">
          <template #default="{ row }">
            <span :class="row.change_type === 'stock_in' ? 'text-success' : 'text-danger'">
              {{ row.change_type === 'stock_in' ? '+' : '-' }}{{ row.change_quantity }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="after_quantity" label="调整后库存" width="100" />
        
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getIngredientList, createIngredient, updateIngredient, adjustStock, getLowStock } from '@/api/ingredient'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const tableData = ref([])
const lowStockList = ref([])
const recordsData = ref([])

const searchForm = reactive({
  keyword: '',
  type: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 表单
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const form = reactive({
  id: null,
  name: '',
  code: '',
  ingredientType: 'material',
  unit: 'g',
  stockQuantity: 0,
  safetyStock: 0,
  purchasePrice: 0,
  expiryWarningDays: 7
})

const rules = {
  name: [{ required: true, message: '请输入原料名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入原料编码', trigger: 'blur' }],
  ingredientType: [{ required: true, message: '请选择类型', trigger: 'change' }],
  unit: [{ required: true, message: '请选择单位', trigger: 'change' }]
}

// 库存调整
const adjustVisible = ref(false)
const adjusting = ref(false)
const currentStock = ref(0)
const adjustForm = reactive({
  ingredientId: null,
  changeQuantity: 0,
  reason: ''
})

// 流水
const recordsVisible = ref(false)

const formatType = (type) => {
  const map = {
    'material': '原材料',
    'package': '包装材料',
    'decor': '装饰材料'
  }
  return map[type] || type
}

const isLowStock = (row) => {
  return parseFloat(row.stock_quantity) <= parseFloat(row.safety_stock)
}

const getChangeTypeText = (type) => {
  const map = {
    'stock_in': '入库',
    'stock_out': '出库',
    'order_deduct': '订单扣减',
    'adjustment': '调整',
    'wastage': '损耗'
  }
  return map[type] || type
}

const getChangeTypeType = (type) => {
  const map = {
    'stock_in': 'success',
    'order_deduct': 'warning',
    'adjustment': 'info'
  }
  return map[type] || ''
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await getIngredientList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      type: searchForm.type
    })
    tableData.value = res.list
    pagination.total = res.pagination.total
    
    // 加载低库存预警
    const lowStockRes = await getLowStock()
    lowStockList.value = lowStockRes || []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.type = ''
  handleSearch()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  loadData()
}

const handleCreate = () => {
  isEdit.value = false
  Object.assign(form, {
    id: null,
    name: '',
    code: '',
    ingredientType: 'material',
    unit: 'g',
    stockQuantity: 0,
    safetyStock: 0,
    purchasePrice: 0,
    expiryWarningDays: 7
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    ingredientType: row.ingredient_type,
    unit: row.unit,
    safetyStock: row.safety_stock,
    purchasePrice: row.purchase_price,
    expiryWarningDays: row.expiry_warning_days
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    const data = {
      name: form.name,
      code: form.code,
      ingredientType: form.ingredientType,
      unit: form.unit,
      stockQuantity: form.stockQuantity,
      safetyStock: form.safetyStock,
      purchasePrice: form.purchasePrice,
      expiryWarningDays: form.expiryWarningDays
    }
    
    if (isEdit.value) {
      await updateIngredient(form.id, data)
    } else {
      await createIngredient(data)
    }
    
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

const handleAdjust = (row) => {
  currentStock.value = row.stock_quantity
  adjustForm.ingredientId = row.id
  adjustForm.changeQuantity = 0
  adjustForm.reason = ''
  adjustVisible.value = true
}

const confirmAdjust = async () => {
  if (adjustForm.changeQuantity === 0) {
    ElMessage.warning('调整数量不能为0')
    return
  }
  if (!adjustForm.reason.trim()) {
    ElMessage.warning('请输入调整原因')
    return
  }
  
  adjusting.value = true
  try {
    await adjustStock(adjustForm.ingredientId, {
      changeQuantity: adjustForm.changeQuantity,
      reason: adjustForm.reason
    })
    ElMessage.success('库存调整成功')
    adjustVisible.value = false
    loadData()
  } finally {
    adjusting.value = false
  }
}

const handleRecords = async (row) => {
  // 从详情接口获取流水
  const { getIngredientDetail } = await import('@/api/ingredient')
  const detail = await getIngredientDetail(row.id)
  recordsData.value = detail.recentRecords || []
  recordsVisible.value = true
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.ingredient-page {
  .mb-15 {
    margin-bottom: 15px;
  }
  
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
  
  .text-danger {
    color: #F56C6C;
    font-weight: bold;
  }
  
  .text-success {
    color: #67C23A;
  }
  
  .text-gray {
    color: #909399;
    font-size: 12px;
  }
  
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>