import request from '@/utils/request'

export const getDashboard = () => request.get('/stats/dashboard')
export const getDailyStats = (params) => request.get('/stats/daily', { params })
export const getProductStats = (params) => request.get('/stats/products', { params })
export const getCustomerStats = () => request.get('/stats/customers')