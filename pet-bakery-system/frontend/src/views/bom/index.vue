<template>
  <div class="bom-page">
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="商品名称">
          <el-input v-model="searchForm.keyword" placeholder="请输入商品名称" clearable />
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
          <span>配方管理</span>
          <span class="text-gray">选择商品查看或编辑BOM配方</span>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" row-key="id">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="sku-list">
              <el-table :data="row.skus" :border="true">
                <el-table-column prop="sku_code" label="SKU编码" width="150" />
                <el-table-column prop="sku_name" label="规格名称" width="150" />
                <el-table-column prop="spec_json" label="规格" width="150">
                  <template #default="{ row: sku }">
                    {{ formatSpec(sku.spec_json) }}
                  </template>
                </el-table-column>
                <el-table-column prop="sale_price" label="售价" width="100">
                  <template #default="{ row: sku }">
                    ¥{{ sku.sale_price }}
                  </template>
                </el-table-column>
                <el-table-column label="配方状态" width="100">
                  <template #default="{ row: sku }">
                    <el-tag :type="sku.has_bom ? 'success' : 'warning'">
                      {{ sku.has_bom ? '已配置' : '未配置' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="理论成本" width="120">
                  <template #default="{ row: sku }">
                    <span v-if="sku.cost_price">¥{{ sku.cost_price }}</span>
                    <span v-else class="text-gray">-</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="150">
                  <template #default="{ row: sku }">
                    <el-button type="primary" link @click="handleEditBom(row, sku)">
                      {{ sku.has_bom ? '编辑配方' : '配置配方' }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="商品信息" min-width="250">
          <template #default="{ row }">
            <div class="product-info">
              <el-image :src="row.cover_image || '/placeholder.png'" class="product-image" fit="cover" />
              <div class="product-detail">
                <div class="product-name">{{ row.name }}</div>
                <div class="product-code">{{ row.code }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="category_name" label="分类" width="120" />
        
        <el-table-column label="规格数量" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.sku_count || 0 }} 个SKU</el-tag>
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

    <!-- BOM配方编辑弹窗 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="`编辑配方 - ${currentSku?.sku_name}`" 
      width="800px"
      destroy-on-close
    >
      <div class="bom-header">
        <div class="bom-info">
          <span>SKU：{{ currentSku?.sku_code }}</span>
          <span>售价：¥{{ currentSku?.sale_price }}</span>
          <span class="text-danger">理论成本：¥{{ totalCost.toFixed(2) }}</span>
          <span class="text-success">毛利率：{{ profitRate }}%</span>
        </div>
        <el-button type="primary" link @click="addIngredient">
          <el-icon><Plus /></el-icon> 添加原料
        </el-button>
      </div>

      <el-table :data="bomItems" v-loading="bomLoading">
        <el-table-column type="index" width="50" />
        
        <el-table-column label="原料" min-width="200">
          <template #default="{ row, $index }">
            <el-select 
              v-model="row.ingredientId" 
              placeholder="选择原料"
              filterable
              style="width: 100%"
              @change="(val) => handleIngredientChange(val, $index)"
            >
              <el-option 
                v-for="ing in ingredientList" 
                :key="ing.id" 
                :label="`${ing.name} (${ing.unit})`" 
                :value="ing.id"
              />
            </el-select>
          </template>
        </el-table-column>
        
        <el-table-column label="用量" width="150">
          <template #default="{ row }">
            <el-input-number 
              v-model="row.quantity" 
              :min="0" 
              :precision="3"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="单位" width="100">
          <template #default="{ row }">
            <span>{{ row.unit }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="损耗率(%)" width="120">
          <template #default="{ row }">
            <el-input-number 
              v-model="row.lossRate" 
              :min="0" 
              :max="100"
              :precision="2"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="成本" width="120">
          <template #default="{ row }">
            <span v-if="row.cost">¥{{ row.cost.toFixed(4) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="80">
          <template #default="{ $index }">
            <el-button type="danger" link @click="removeIngredient($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveBom" :loading="saving">
          保存配方
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getProductList } from '@/api/product'
import { getIngredientList } from '@/api/ingredient'

const loading = ref(false)
const bomLoading = ref(false)
const tableData = ref([])
const ingredientList = ref([])

const searchForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// BOM编辑
const dialogVisible = ref(false)
const currentProduct = ref(null)
const currentSku = ref(null)
const bomItems = ref([])
const saving = ref(false)

const totalCost = computed(() => {
  return bomItems.value.reduce((sum, item) => sum + (item.cost || 0), 0)
})

const profitRate = computed(() => {
  if (!currentSku.value?.sale_price || totalCost.value === 0) return 0
  const rate = ((currentSku.value.sale_price - totalCost.value) / currentSku.value.sale_price * 100)
  return rate.toFixed(1)
})

const formatSpec = (spec) => {
  if (!spec) return '-'
  if (typeof spec === 'string') {
    try {
      spec = JSON.parse(spec)
    } catch {
      return spec
    }
  }
  return Object.entries(spec).map(([k, v]) => `${k}:${v}`).join(' / ')
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await getProductList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword
    })
    
    // 为每个商品加载SKU和BOM信息
    const products = res.list || []
    for (const product of products) {
      // 这里简化处理，实际应该后端返回sku_count
      product.sku_count = product.sku_count || 0
    }
    
    tableData.value = products
    pagination.total = res.pagination.total
  } finally {
    loading.value = false
  }
}

const loadIngredients = async () => {
  const res = await getIngredientList({ pageSize: 1000 })
  ingredientList.value = res.list || []
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  searchForm.keyword = ''
  handleSearch()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  loadData()
}

const handleEditBom = async (product, sku) => {
  currentProduct.value = product
  currentSku.value = sku
  
  bomLoading.value = true
  dialogVisible.value = true
  
  try {
    // 加载现有BOM
    const { getBomBySkuId } = await import('@/api/bom')
    const bom = await getBomBySkuId(sku.id)
    
    if (bom && bom.items) {
      bomItems.value = bom.items.map(item => ({
        ingredientId: item.ingredient_id,
        quantity: item.quantity,
        unit: item.unit,
        lossRate: item.loss_rate,
        cost: item.cost,
        purchasePrice: item.purchase_price
      }))
    } else {
      bomItems.value = []
    }
  } catch (error) {
    bomItems.value = []
  } finally {
    bomLoading.value = false
  }
}

const handleIngredientChange = (val, index) => {
  const ingredient = ingredientList.value.find(i => i.id === val)
  if (ingredient) {
    bomItems.value[index].unit = ingredient.unit
    bomItems.value[index].purchasePrice = ingredient.purchase_price
    calculateItemCost(index)
  }
}

const calculateItemCost = (index) => {
  const item = bomItems.value[index]
  if (!item.quantity || !item.purchasePrice) {
    item.cost = 0
    return
  }
  
  const lossRate = item.lossRate || 0
  const actualQty = item.quantity * (1 + lossRate / 100)
  item.cost = actualQty * item.purchasePrice
}

const addIngredient = () => {
  bomItems.value.push({
    ingredientId: null,
    quantity: 0,
    unit: '',
    lossRate: 0,
    cost: 0,
    purchasePrice: 0
  })
}

const removeIngredient = (index) => {
  bomItems.value.splice(index, 1)
}

const handleSaveBom = async () => {
  // 验证
  for (const item of bomItems.value) {
    if (!item.ingredientId || item.quantity <= 0) {
      ElMessage.warning('请完善原料信息')
      return
    }
  }
  
  saving.value = true
  try {
    const { saveBom } = await import('@/api/bom')
    await saveBom({
      skuId: currentSku.value.id,
      items: bomItems.value.map(item => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        lossRate: item.lossRate
      }))
    })
    
    ElMessage.success('配方保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadData()
  loadIngredients()
})
</script>

<style scoped lang="scss">
.bom-page {
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
    font-weight: bold;
  }
  
  .sku-list {
    padding: 20px;
    background: #f5f7fa;
  }
  
  .product-info {
    display: flex;
    align-items: center;
    
    .product-image {
      width: 50px;
      height: 50px;
      border-radius: 4px;
      margin-right: 12px;
    }
    
    .product-detail {
      .product-name {
        font-weight: bold;
      }
      
      .product-code {
        font-size: 12px;
        color: #909399;
      }
    }
  }
  
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  
  .bom-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 4px;
    
    .bom-info {
      display: flex;
      gap: 20px;
    }
  }
}
</style>