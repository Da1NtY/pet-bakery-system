<template>
  <div class="customer-page">
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="客户信息">
          <el-input 
            v-model="searchForm.keyword" 
            placeholder="姓名/手机号" 
            clearable 
            style="width: 200px"
          />
        </el-form-item>
        
        <el-form-item label="来源">
          <el-select v-model="searchForm.source" placeholder="全部" clearable>
            <el-option label="手动录入" value="manual" />
            <el-option label="微信小程序" value="wechat" />
            <el-option label="电话" value="phone" />
            <el-option label="门店" value="store" />
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
          <span>客户列表</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon> 新增客户
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="name" label="客户姓名" width="120" />
        
        <el-table-column prop="mobile" label="手机号" width="130" />
        
        <el-table-column prop="wechat_nickname" label="微信昵称" width="130">
          <template #default="{ row }">
            {{ row.wechat_nickname || '-' }}
          </template>
        </el-table-column>
        
        <el-table-column label="宠物数量" width="100">
          <template #default="{ row }">
            <el-tag type="info">{{ row.pet_count || 0 }} 只</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="消费统计" min-width="200">
          <template #default="{ row }">
            <div>订单数：{{ row.total_order_count }} 单</div>
            <div class="text-danger">累计消费：¥{{ row.total_spent_amount }}</div>
          </template>
        </el-table-column>
        
        <el-table-column prop="source" label="来源" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ formatSource(row.source) }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="last_order_at" label="最近下单" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.last_order_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">详情</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" link @click="handleAddOrder(row)">下单</el-button>
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

    <!-- 客户表单弹窗 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑客户' : '新增客户'" 
      width="600px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="客户姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        
        <el-form-item label="手机号" prop="mobile">
          <el-input v-model="form.mobile" />
        </el-form-item>
        
        <el-form-item label="微信昵称">
          <el-input v-model="form.wechatNickname" />
        </el-form-item>
        
        <el-divider>宠物信息</el-divider>
        
        <div v-for="(pet, index) in form.pets" :key="index" class="pet-form">
          <el-row :gutter="10">
            <el-col :span="8">
              <el-form-item :label="`宠物${index + 1}名称`" required>
                <el-input v-model="pet.name" placeholder="名称" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="类型" required>
                <el-select v-model="pet.petType" placeholder="类型">
                  <el-option label="狗狗" value="dog" />
                  <el-option label="猫咪" value="cat" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="品种">
                <el-input v-model="pet.breed" placeholder="品种" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-button 
            type="danger" 
            link 
            @click="removePet(index)"
            v-if="form.pets.length > 1"
          >
            删除此宠物
          </el-button>
        </div>
        
        <el-button type="primary" link @click="addPet">
          <el-icon><Plus /></el-icon> 添加宠物
        </el-button>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCustomerList, createCustomer, updateCustomer } from '@/api/customer'
import { formatDateTime } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const tableData = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const searchForm = reactive({
  keyword: '',
  source: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive({
  id: null,
  name: '',
  mobile: '',
  wechatNickname: '',
  pets: [{ name: '', petType: '', breed: '' }]
})

const rules = {
  name: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  mobile: [{ required: true, message: '请输入手机号', trigger: 'blur' }]
}

const formatSource = (source) => {
  const map = {
    'manual': '手动录入',
    'wechat': '微信小程序',
    'phone': '电话',
    'store': '门店'
  }
  return map[source] || source
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await getCustomerList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      source: searchForm.source
    })
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
  searchForm.source = ''
  handleSearch()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  loadData()
}

const handleCreate = () => {
  isEdit.value = false
  form.id = null
  form.name = ''
  form.mobile = ''
  form.wechatNickname = ''
  form.pets = [{ name: '', petType: 'dog', breed: '' }]
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.mobile = row.mobile
  form.wechatNickname = row.wechat_nickname
  form.pets = [{ name: '', petType: 'dog', breed: '' }]
  dialogVisible.value = true
}

const addPet = () => {
  form.pets.push({ name: '', petType: 'dog', breed: '' })
}

const removePet = (index) => {
  form.pets.splice(index, 1)
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  // 验证宠物信息
  for (const pet of form.pets) {
    if (!pet.name || !pet.petType) {
      ElMessage.warning('请完善宠物信息')
      return
    }
  }
  
  submitting.value = true
  try {
    const data = {
      name: form.name,
      mobile: form.mobile,
      wechatNickname: form.wechatNickname,
      pets: form.pets
    }
    
    if (isEdit.value) {
      await updateCustomer(form.id, data)
      ElMessage.success('更新成功')
    } else {
      await createCustomer(data)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

const handleView = (row) => {
  router.push(`/customer/detail/${row.id}`)
}

const handleAddOrder = (row) => {
  router.push({
    path: '/order/create',
    query: { customerId: row.id }
  })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.customer-page {
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
  }
  
  .pet-form {
    background: #f5f7fa;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 4px;
  }
  
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>