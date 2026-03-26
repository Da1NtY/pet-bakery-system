import request from '@/utils/request'

export const getCategoryTree = () => request.get('/categories/tree')
export const getCategoryList = () => request.get('/categories')
export const createCategory = (data) => request.post('/categories', data)
export const updateCategory = (id, data) => request.put(`/categories/${id}`, data)
export const deleteCategory = (id) => request.delete(`/categories/${id}`)