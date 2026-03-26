<template>
  <div class="login-page">
    <div class="login-background">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
      <div class="floating-shapes">
        <div class="floating-item item-1">🐾</div>
        <div class="floating-item item-2">🦴</div>
        <div class="floating-item item-3">🐶</div>
        <div class="floating-item item-4">🐱</div>
      </div>
    </div>
    
    <div class="login-container">
      <div class="login-box">
        <div class="login-header">
          <div class="logo-wrapper">
            <div class="logo-icon">
              <el-icon size="48"><Shop /></el-icon>
            </div>
            <div class="logo-text">
              <h1>宠物烘焙店</h1>
              <p>管理系统</p>
            </div>
          </div>
        </div>
        
        <div class="login-form-wrapper">
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            class="login-form"
            @keyup.enter="handleLogin"
          >
            <el-form-item prop="username">
              <div class="input-wrapper">
                <el-icon class="input-icon"><User /></el-icon>
                <el-input
                  v-model="form.username"
                  placeholder="请输入用户名"
                  size="large"
                  class="custom-input"
                />
              </div>
            </el-form-item>
            
            <el-form-item prop="password">
              <div class="input-wrapper">
                <el-icon class="input-icon"><Lock /></el-icon>
                <el-input
                  v-model="form.password"
                  type="password"
                  placeholder="请输入密码"
                  size="large"
                  class="custom-input"
                  show-password
                />
              </div>
            </el-form-item>
            
            <div class="form-options">
              <el-checkbox v-model="rememberMe">记住我</el-checkbox>
              <el-link type="primary" :underline="false">忘记密码？</el-link>
            </div>
            
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                class="login-btn"
                :loading="loading"
                @click="handleLogin"
              >
                <span v-if="!loading">登 录</span>
                <span v-else>登录中...</span>
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
      
      <div class="welcome-card">
        <div class="welcome-content">
          <h2>欢迎回来</h2>
          <p>高效管理您的宠物烘焙业务</p>
          <div class="features">
            <div class="feature-item">
              <el-icon><ShoppingCart /></el-icon>
              <span>订单管理</span>
            </div>
            <div class="feature-item">
              <el-icon><Goods /></el-icon>
              <span>商品管理</span>
            </div>
            <div class="feature-item">
              <el-icon><DataAnalysis /></el-icon>
              <span>数据统计</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Shop, ShoppingCart, Goods, DataAnalysis } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const rememberMe = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  loading.value = true
  try {
    await userStore.login(form)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  
  .shape {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.5;
    animation: float 20s infinite ease-in-out;
    
    &.shape-1 {
      width: 400px;
      height: 400px;
      background: rgba(255, 138, 101, 0.4);
      top: -100px;
      right: -100px;
      animation-delay: 0s;
    }
    
    &.shape-2 {
      width: 300px;
      height: 300px;
      background: rgba(102, 126, 234, 0.4);
      bottom: -50px;
      left: -50px;
      animation-delay: -5s;
    }
    
    &.shape-3 {
      width: 250px;
      height: 250px;
      background: rgba(240, 147, 251, 0.3);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation-delay: -10s;
    }
  }
  
  .floating-shapes {
    position: absolute;
    width: 100%;
    height: 100%;
    
    .floating-item {
      position: absolute;
      font-size: 40px;
      opacity: 0.15;
      animation: floatShape 15s infinite ease-in-out;
      
      &.item-1 {
        top: 10%;
        left: 10%;
        animation-delay: 0s;
      }
      
      &.item-2 {
        top: 20%;
        right: 15%;
        animation-delay: -3s;
      }
      
      &.item-3 {
        bottom: 15%;
        left: 20%;
        animation-delay: -6s;
      }
      
      &.item-4 {
        bottom: 25%;
        right: 10%;
        animation-delay: -9s;
      }
    }
  }
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(20px, -20px) scale(1.05);
  }
  50% {
    transform: translate(-10px, 20px) scale(0.95);
  }
  75% {
    transform: translate(15px, 10px) scale(1.02);
  }
}

@keyframes floatShape {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-30px) rotate(180deg);
  }
}

.login-container {
  display: flex;
  gap: 40px;
  z-index: 1;
  max-width: 1000px;
  padding: 40px;
}

.login-box {
  flex: 1;
  max-width: 480px;
  padding: 50px 40px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  animation: slideInLeft 0.6s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.login-header {
  margin-bottom: 40px;
  
  .logo-wrapper {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .logo-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: linear-gradient(135deg, #ff8a65 0%, #f4511e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 8px 20px rgba(255, 138, 101, 0.4);
    }
    
    .logo-text {
      h1 {
        font-size: 26px;
        font-weight: 700;
        color: #2d3748;
        margin: 0;
        line-height: 1.2;
      }
      
      p {
        font-size: 14px;
        color: #718096;
        margin: 6px 0 0;
        letter-spacing: 2px;
      }
    }
  }
}

.login-form-wrapper {
  .login-form {
    .input-wrapper {
      display: flex;
      align-items: center;
      width: 100%;
      background: #f7fafc;
      border-radius: 12px;
      padding: 0 16px;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      
      &:focus-within {
        background: #fff;
        border-color: #ff8a65;
        box-shadow: 0 0 0 4px rgba(255, 138, 101, 0.1);
      }
      
      .input-icon {
        font-size: 20px;
        color: #a0aec0;
        margin-right: 12px;
        transition: color 0.3s ease;
      }
      
      &:focus-within .input-icon {
        color: #ff8a65;
      }
      
      :deep(.custom-input) {
        .el-input__wrapper {
          box-shadow: none !important;
          padding: 0;
          background: transparent;
        }
        
        .el-input__inner {
          font-size: 15px;
          padding: 16px 0;
        }
      }
    }
    
    :deep(.el-form-item) {
      margin-bottom: 24px;
    }
  }
  
  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    font-size: 14px;
  }
  
  .login-btn {
    width: 100%;
    height: 52px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
    background: linear-gradient(135deg, #ff8a65 0%, #f4511e 100%);
    border: none;
    box-shadow: 0 8px 20px rgba(255, 138, 101, 0.3);
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(255, 138, 101, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
}

.welcome-card {
  flex: 1;
  max-width: 400px;
  display: flex;
  align-items: center;
  animation: slideInRight 0.6s ease-out;
  
  .welcome-content {
    color: #fff;
    
    h2 {
      font-size: 36px;
      font-weight: 700;
      margin: 0 0 12px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    p {
      font-size: 16px;
      opacity: 0.9;
      margin: 0 0 40px;
    }
    
    .features {
      display: flex;
      flex-direction: column;
      gap: 16px;
      
      .feature-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
        
        &:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateX(10px);
        }
        
        .el-icon {
          font-size: 24px;
          color: #fff;
        }
        
        span {
          font-size: 16px;
          font-weight: 500;
        }
      }
    }
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 900px) {
  .login-container {
    flex-direction: column;
    padding: 20px;
  }
  
  .welcome-card {
    display: none;
  }
  
  .login-box {
    max-width: 100%;
    padding: 40px 30px;
  }
}
</style>