import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/utils/request'

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const permissions = ref([])

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.username || '')
  const realName = computed(() => userInfo.value?.realName || '')

  // Actions
  const setToken = (newToken) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const clearToken = () => {
    token.value = ''
    userInfo.value = null
    permissions.value = []
    localStorage.removeItem('token')
  }

  const login = async (credentials) => {
    const data = await request.post('/auth/login', credentials)
    setToken(data.token)
    userInfo.value = data.user
    permissions.value = data.permissions || []
    return data
  }

  const getUserInfo = async () => {
    const data = await request.get('/auth/me')
    userInfo.value = data
    permissions.value = data.permissions || []
    return data
  }

  const logout = () => {
    clearToken()
  }

  const hasPermission = (code) => {
    return permissions.value.some(p => p.code === code)
  }

  return {
    token,
    userInfo,
    permissions,
    isLoggedIn,
    username,
    realName,
    login,
    getUserInfo,
    logout,
    hasPermission
  }
})