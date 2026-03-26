import request from '@/utils/request'

export const getIngredientList = (params) => request.get('/ingredients', { params })
export const getIngredientDetail = (id) => request.get(`/ingredients/${id}`)
export const createIngredient = (data) => request.post('/ingredients', data)
export const updateIngredient = (id, data) => request.put(`/ingredients/${id}`, data)
export const adjustStock = (id, data) => request.post(`/ingredients/${id}/adjust-stock`, data)
export const getLowStock = () => request.get('/ingredients/low-stock')