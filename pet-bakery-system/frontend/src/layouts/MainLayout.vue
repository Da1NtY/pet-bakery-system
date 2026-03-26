<template>
  <el-container class="main-layout">
    <el-aside width="240px" class="sidebar">
      <div class="logo">
        <div class="logo-icon">
          <el-icon size="36"><Shop /></el-icon>
        </div>
        <div class="logo-text">
          <h1>宠物烘焙店</h1>
          <span>管理系统</span>
        </div>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        router
        class="menu"
        background-color="transparent"
        text-color="#a0aec0"
        active-text-color="#ffffff"
        :collapse-transition="false"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path" class="menu-item">
          <el-icon class="menu-icon">
            <component :is="item.icon" />
          </el-icon>
          <span class="menu-title">{{ item.title }}</span>
          <div class="menu-indicator"></div>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <breadcrumb class="breadcrumb" />
        </div>
        <div class="header-right">
          <div class="notification">
            <el-badge :value="3" :hidden="true" class="notification-badge">
              <el-button circle class="icon-btn">
                <el-icon><Bell /></el-icon>
              </el-button>
            </el-badge>
          </div>
          <el-divider direction="vertical" />
          <el-dropdown @command="handleCommand" trigger="click">
            <div class="user-info">
              <el-avatar :size="36" class="user-avatar">
                {{ userStore.realName?.charAt(0) || userStore.username?.charAt(0) || 'U' }}
              </el-avatar>
              <span class="user-name">{{ userStore.realName || userStore.username }}</span>
              <el-icon class="user-arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="user-dropdown">
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon> 个人中心
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <el-icon><Lock /></el-icon> 修改密码
                </el-dropdown-item>
                <el-dropdown-item divided command="logout" class="logout-item">
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Shop, Bell, User, Lock, SwitchButton, ArrowDown } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

const menuItems = [
  { path: '/dashboard', title: '仪表盘', icon: 'Odometer' },
  { path: '/order', title: '订单管理', icon: 'ShoppingCart' },
  { path: '/product', title: '商品管理', icon: 'Goods' },
  { path: '/customer', title: '客户管理', icon: 'User' },
  { path: '/ingredient', title: '原料管理', icon: 'Food' },
  { path: '/bom', title: '配方管理', icon: 'Collection' },
  { path: '/stats', title: '统计报表', icon: 'TrendCharts' },
  { path: '/system', title: '系统设置', icon: 'Setting' }
]

const handleCommand = (command) => {
  switch (command) {
    case 'logout':
      ElMessageBox.confirm('确认退出登录？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        userStore.logout()
        router.push('/login')
        ElMessage.success('已退出登录')
      })
      break
    case 'password':
      router.push('/password')
      break
  }
}
</script>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
  background: #f7fafc;
}

.sidebar {
  background: linear-gradient(180deg, #2d3748 0%, #1a202c 100%);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  .logo {
    height: 70px;
    display: flex;
    align-items: center;
    padding: 0 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
    
    .logo-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ff8a65 0%, #f4511e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 4px 12px rgba(255, 138, 101, 0.4);
      margin-right: 12px;
    }
    
    .logo-text {
      h1 {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        margin: 0;
        line-height: 1.2;
      }
      
      span {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        letter-spacing: 1px;
      }
    }
  }
  
  .menu {
    border-right: none;
    padding: 16px 12px;
    background: transparent;
    
    .menu-item {
      border-radius: 10px;
      margin-bottom: 8px;
      padding: 14px 16px !important;
      height: auto;
      display: flex;
      align-items: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      
      &:hover {
        background: rgba(255, 255, 255, 0.08);
        
        .menu-icon {
          transform: scale(1.1);
        }
      }
      
      &.is-active {
        background: linear-gradient(135deg, rgba(255, 138, 101, 0.2) 0%, rgba(244, 81, 30, 0.15) 100%);
        
        .menu-icon {
          color: #ff8a65;
        }
        
        .menu-title {
          color: #fff;
          font-weight: 600;
        }
        
        .menu-indicator {
          opacity: 1;
          width: 4px;
        }
      }
      
      .menu-icon {
        width: 20px;
        height: 20px;
        margin-right: 14px;
        font-size: 20px;
        transition: all 0.3s ease;
        color: #a0aec0;
      }
      
      .menu-title {
        flex: 1;
        font-size: 14px;
        color: #cbd5e0;
        transition: all 0.3s ease;
      }
      
      .menu-indicator {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 20px;
        background: linear-gradient(180deg, #ff8a65 0%, #f4511e 100%);
        border-radius: 0 4px 4px 0;
        transition: all 0.3s ease;
        opacity: 0;
      }
    }
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 0 24px;
  height: 70px;
  
  .header-left {
    .breadcrumb {
      font-size: 14px;
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .notification {
      .notification-badge {
        :deep(.el-badge__content) {
          background: #ef5350;
          border: 2px solid #fff;
        }
      }
      
      .icon-btn {
        width: 40px;
        height: 40px;
        border: none;
        background: #f7fafc;
        color: #718096;
        transition: all 0.3s ease;
        
        &:hover {
          background: #edf2f7;
          color: #ff8a65;
          transform: rotate(15deg);
        }
      }
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 10px;
      transition: all 0.3s ease;
      
      &:hover {
        background: #f7fafc;
        
        .user-arrow {
          transform: rotate(180deg);
        }
      }
      
      .user-avatar {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-weight: 600;
        color: #fff;
      }
      
      .user-name {
        font-size: 14px;
        color: #2d3748;
        font-weight: 500;
      }
      
      .user-arrow {
        font-size: 14px;
        color: #a0aec0;
        transition: transform 0.3s ease;
      }
    }
    
    .user-dropdown {
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      border: none;
      padding: 8px;
      
      .el-dropdown-item {
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 14px;
        transition: all 0.2s ease;
        
        &:hover {
          background: #f7fafc;
        }
        
        .el-icon {
          margin-right: 8px;
        }
      }
      
      .logout-item {
        color: #ef5350;
        
        &:hover {
          background: rgba(239, 83, 80, 0.08);
        }
      }
    }
  }
}

.main-content {
  background: #f7fafc;
  padding: 24px;
  overflow-y: auto;
}
</style>