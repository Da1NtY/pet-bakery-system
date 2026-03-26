import request from '@/utils/request'

export const getCustomerList = (params) => request.get('/customers', { params })
export const getCustomerDetail = (id) => request.get(`/customers/${id}`)
export const createCustomer = (data) => request.post('/customers', data)
export const updateCustomer = (id, data) => request.put(`/customers/${id}`, data)
export const addPet = (customerId, data) => request.post(`/customers/${customerId}/pets`, data)
export const updatePet = (petId, data) => request.put(`/customers/pets/${petId}`, data)
export const deletePet = (petId) => request.delete(`/customers/pets/${petId}`)