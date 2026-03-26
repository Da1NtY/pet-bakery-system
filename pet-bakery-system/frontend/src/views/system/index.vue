<template>
  <div class="system-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 用户管理 -->
      <el-tab-pane label="用户管理" name="users">
        <div class="tab-actions">
          <el-button type="primary" @click="handleAddUser">
            <el-icon><Plus /></el-icon> 新增用户
          </el-button>
        </div>
        
        <el-table :data="userList" v-loading="userLoading">
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="realName" label="真实姓名" width="120" />
          <el-table-column prop="mobile" label="手机号" width="130" />
          <el-table-column prop="email" label="邮箱" min-width="150" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'">
                {{ row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastLoginAt" label="最后登录" width="150">
            <template #default="{ row }">
              {{ formatDateTime(row.lastLoginAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEditUser(row)">编辑</el-button>
              <el-button type="primary" link @click="handleResetPwd(row)">重置密码</el-button>
              <el-button 
                type="danger" 
                link 
                @click="handleToggleStatus(row)"
                v-if="row.id !== currentUserId"
              >
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 角色管理 -->
      <el-tab-pane label="角色权限" name="roles">
        <el-alert
          title="角色权限管理功能开发中，请直接在数据库中配置"
          type="info"
          :closable="false"
        />
      </el-tab-pane>

      <!-- 系统配置 -->
      <el-tab-pane label="系统配置" name="settings">
        <el-form :model="settings" label-width="120px" style="max-width: 500px;">
          <el-form-item label="店铺名称">
            <el-input v-model="settings.shopName" />
          </el-form-item>
          
          <el-form-item label="联系电话">
            <el-input v-model="settings.contactPhone" />
          </el-form-item>
          
          <el-form-item label="店铺地址">
            <el-input v-model="settings.address" type="textarea" rows="2" />
          </el-form-item>
          
          <el-form-item label="营业时间">
            <el-time-picker
              v-model="settings.openTime"
              placeholder="开始时间"
              format="HH:mm"
            />
            <span style="margin: 0 10px;">至</span>
            <el-time-picker
              v-model="settings.closeTime"
              placeholder="结束时间"
              format="HH:mm"
            />
          </el-form-item>
          
          <el-form-item label="订单自动取消">
            <el-input-number v-model="settings.autoCancelMinutes" :min="0" :max="1440">
              <template #append>分钟</template>
            </el-input-number>
            <div class="form-tip">0表示不自动取消</div>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="saveSettings">保存设置</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 关于 -->
      <el-tab-pane label="关于系统" name="about">
        <div class="about-content">
          <h2>宠物烘焙店管理系统</h2>
          <p>版本：v1.0.0</p>
          <p>技术栈：Vue 3 + Node.js + MySQL</p>
          <p>开发日期：2024</p>
          <el-divider />
          <p class="text-gray">本系统专为宠物烘焙店设计，支持商品管理、订单处理、库存管理、客户管理等功能。</p>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 用户表单弹窗 -->
    <el-dialog 
      v-model="userDialogVisible" 
      :title="isEditUser ? '编辑用户' : '新增用户'" 
      width="500px"
    >
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEditUser" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password" v-if="!isEditUser">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
        
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="userForm.realName" />
        </el-form-item>
        
        <el-form-item label="手机号">
          <el-input v-model="userForm.mobile" />
        </el-form-item>
        
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" />
        </el-form-item>
        
        <el-form-item label="角色">
          <el-select v-model="userForm.roleIds" multiple style="width: 100%">
            <el-option 
              v-for="role in roleList" 
              :key="role.id" 
              :label="role.name" 
              :value="role.id" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-switch 
            v-model="userForm.status" 
            :active-value="1" 
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUser" :loading="userSubmitting">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="重置密码" width="400px">
      <el-form :model="pwdForm" label-width="100px">
        <el-form-item label="新密码" required>
          <el-input v-model="pwdForm.newPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmResetPwd" :loading="pwdSubmitting">
          确认重置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/format'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.id)

const activeTab = ref('users')

// 用户管理
const userList = ref([])
const userLoading = ref(false)
const userDialogVisible = ref(false)
const isEditUser = ref(false)
const userSubmitting = ref(false)
const userFormRef = ref()

const userForm = reactive({
  id: null,
  username: '',
  password: '',
  realName: '',
  mobile: '',
  email: '',
  roleIds: [],
  status: 1
})

const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }]
}

const roleList = ref([
  { id: 1, name: '管理员' },
  { id: 2, name: '店长' },
  { id: 3, name: '店员' }
])

// 密码重置
const pwdDialogVisible = ref(false)
const pwdSubmitting = ref(false)
const pwdForm = reactive({
  userId: null,
  newPassword: ''
})

// 系统设置
const settings = reactive({
  shopName: '宠物烘焙店',
  contactPhone: '',
  address: '',
  openTime: null,
  closeTime: null,
  autoCancelMinutes: 30
})

const loadUsers = async () => {
  userLoading.value = true
  try {
    const { getUserList } = await import('@/api/user')
    const res = await getUserList({ pageSize: 1000 })
    userList.value = res.list || []
  } catch (error) {
    console.error(error)
  } finally {
    userLoading.value = false
  }
}

const handleAddUser = () => {
  isEditUser.value = false
  Object.assign(userForm, {
    id: null,
    username: '',
    password: '',
    realName: '',
    mobile: '',
    email: '',
    roleIds: [],
    status: 1
  })
  userDialogVisible.value = true
}

const handleEditUser = (row) => {
  isEditUser.value = true
  Object.assign(userForm, {
    id: row.id,
    username: row.username,
    realName: row.realName,
    mobile: row.mobile,
    email: row.email,
    roleIds: row.roles?.map(r => r.id) || [],
    status: row.status
  })
  userDialogVisible.value = true
}

const submitUser = async () => {
  const valid = await userFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  userSubmitting.value = true
  try {
    const { createUser, updateUser } = await import('@/api/user')
    
    const data = {
      username: userForm.username,
      realName: userForm.realName,
      mobile: userForm.mobile,
      email: userForm.email,
      status: userForm.status,
      roleIds: userForm.roleIds
    }
    
    if (!isEditUser.value) {
      data.password = userForm.password
      await createUser(data)
    } else {
      await updateUser(userForm.id, data)
    }
    
    ElMessage.success(isEditUser.value ? '更新成功' : '创建成功')
    userDialogVisible.value = false
    loadUsers()
  } catch (error) {
    console.error(error)
  } finally {
    userSubmitting.value = false
  }
}

const handleResetPwd = (row) => {
  pwdForm.userId = row.id
  pwdForm.newPassword = ''
  pwdDialogVisible.value = true
}

const confirmResetPwd = async () => {
  if (!pwdForm.newPassword) {
    ElMessage.warning('请输入新密码')
    return
  }
  
  pwdSubmitting.value = true
  try {
    const { resetPassword } = await import('@/api/user')
    await resetPassword(pwdForm.userId, { newPassword: pwdForm.newPassword })
    ElMessage.success('密码重置成功')
    pwdDialogVisible.value = false
  } catch (error) {
    console.error(error)
  } finally {
    pwdSubmitting.value = false
  }
}

const handleToggleStatus = async (row) => {
  const action = row.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确认${action}该用户？`, '提示')
    const { updateUser } = await import('@/api/user')
    await updateUser(row.id, { status: row.status === 1 ? 0 : 1 })
    ElMessage.success(`${action}成功`)
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const saveSettings = () => {
  // 保存到localStorage或后端
  localStorage.setItem('systemSettings', JSON.stringify(settings))
  ElMessage.success('设置已保存')
}

onMounted(() => {
  loadUsers()
  // 加载本地设置
  const saved = localStorage.getItem('systemSettings')
  if (saved) {
    Object.assign(settings, JSON.parse(saved))
  }
})
</script>

<style scoped lang="scss">
.system-page {
  .tab-actions {
    margin-bottom: 15px;
  }
  
  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
  }
  
  .about-content {
    text-align: center;
    padding: 40px;
    
    h2 {
      margin-bottom: 20px;
      color: #303133;
    }
    
    p {
      margin: 10px 0;
      color: #606266;
    }
    
    .text-gray {
      color: #909399;
    }
  }
}
</style>