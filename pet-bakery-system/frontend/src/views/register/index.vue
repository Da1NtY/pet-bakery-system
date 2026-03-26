<template>
  <div class="register-page">
    <div class="register-box">
      <div class="register-header">
        <el-icon size="48" color="#409EFF"><Shop /></el-icon>
        <h2>系统初始化</h2>
        <p class="subtitle">创建管理员账号</p>
      </div>
      
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="register-form"
        @keyup.enter="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="realName">
          <el-input
            v-model="form.realName"
            placeholder="真实姓名"
            size="large"
            :prefix-icon="UserFilled"
          />
        </el-form-item>
        
        <el-form-item prop="mobile">
          <el-input
            v-model="form.mobile"
            placeholder="手机号"
            size="large"
            :prefix-icon="Phone"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="register-btn"
            :loading="loading"
            @click="handleRegister"
          >
            创建管理员账号
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-link">
        已有账号？<el-button link type="primary" @click="$router.push('/login')">直接登录</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, UserFilled, Phone, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  realName: '',
  mobile: '',
  password: '',
  confirmPassword: ''
})

const validatePass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validatePass, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  loading.value = true
  try {
    const { data } = await request.post('/auth/register', {
      username: form.username,
      password: form.password,
      realName: form.realName,
      mobile: form.mobile
    })
    
    // 保存登录状态
    userStore.setToken(data.token)
    userStore.userInfo = data.user
    
    ElMessage.success('注册成功！正在跳转...')
    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (error) {
    console.error(error)
    // 如果注册失败是因为已有用户，提示去登录
    if (error?.response?.data?.code === 403) {
      ElMessage.warning('系统已初始化，请直接登录')
      setTimeout(() => router.push('/login'), 1500)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.register-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-box {
  width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
  
  h2 {
    margin-top: 15px;
    color: #333;
    font-size: 24px;
  }
  
  .subtitle {
    color: #909399;
    margin-top: 8px;
    font-size: 14px;
  }
}

.register-form {
  .register-btn {
    width: 100%;
  }
}

.login-link {
  margin-top: 20px;
  text-align: center;
  color: #606266;
  font-size: 14px;
}
</style>