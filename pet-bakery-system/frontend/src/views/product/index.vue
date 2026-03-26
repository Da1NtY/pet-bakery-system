<template>
  <div class="product-page">
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="商品名称">
          <el-input v-model="searchForm.keyword" placeholder="请输入商品名称" clearable />
        </el-form-item>
        
        <el-form-item label="商品分类">
          <el-cascader
            v-model="searchForm.categoryId"
            :options="categoryOptions"
            :props="{ value: 'id', label: 'name', checkStrictly: true }"
            placeholder="请选择分类"
            clearable
          />
        </el-form-item>
        
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="上架" :value="1" />
            <el-option label="下架" :value="0" />
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
          <span>商品列表</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon> 新增商品
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading">
        <el-table-column label="商品信息" min-width="200">
          <template #default="{ row }">
            <div class="product-info">
              <el-image 
                :src="row.cover_image || '/placeholder.png'" 
                class="product-image"
                fit="cover"
              />
              <div class="product-detail">
                <div class="product-name">{{ row.name }}</div>
                <div class="product-code">编码：{{ row.code }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="category_name" label="分类" width="120" />
        
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            {{ productTypeMap[row.product_type] }}
          </template>
        </el-table-column>
        
        <el-table-column label="价格区间" width="150">
          <template #default="{ row }">
            <div v-if="row.min_price && row.max_price">
              ¥{{ row.min_price }} - ¥{{ row.max_price }}
            </div>
            <div v-else>-</div>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="primary" link @click="handleBom(row)">配方</el-button>
            <el-button 
              type="danger" 
              link 
              @click="handleDelete(row)"
              v-if="row.status === 0"
            >
              删除
            </el-button>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProductList, deleteProduct } from '@/api/product'
import { productTypeMap } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const tableData = ref([])
const categoryOptions = ref([])

const searchForm = reactive({
  keyword: '',
  categoryId: null,
  status: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      status: searchForm.status
    }
    
    if (searchForm.categoryId) {
      params.categoryId = Array.isArray(searchForm.categoryId) 
        ? searchForm.categoryId[searchForm.categoryId.length - 1]
        : searchForm.categoryId
    }
    
    const res = await getProductList(params)
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
  searchForm.keyword = ''
  searchForm.categoryId = null
  searchForm.status = null
  handleSearch()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  loadData()
}

const handleCreate = () => {
  router.push('/product/form')
}

const handleEdit = (row) => {
  router.push(`/product/form?id=${row.id}`)
}

const handleBom = (row) => {
  router.push(`/bom?skuId=${row.id}`)
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确认删除该商品？', '提示', { type: 'warning' })
    await deleteProduct(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.product-page {
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
  
  .product-info {
    display: flex;
    align-items: center;
    
    .product-image {
      width: 60px;
      height: 60px;
      border-radius: 4px;
      margin-right: 12px;
    }
    
    .product-detail {
      .product-name {
        font-weight: bold;
        margin-bottom: 4px;
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
}
</style>