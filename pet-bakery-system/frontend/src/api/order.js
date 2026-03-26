import request from '@/utils/request'

export const getOrderList = (params) => request.get('/orders', { params })
export const getOrderDetail = (id) => request.get(`/orders/${id}`)
export const createOrder = (data) => request.post('/orders', data)
export const confirmOrder = (id, data) => request.post(`/orders/${id}/confirm`, data)
export const cancelOrder = (id, data) => request.post(`/orders/${id}/cancel`, data)
export const updateOrderStatus = (id, data) => request.post(`/orders/${id}/status`, data)
export const addPayment = (id, data) => request.post(`/orders/${id}/payment`, data)
export const getOrderStats = (params) => request.get('/orders/statistics', { params })