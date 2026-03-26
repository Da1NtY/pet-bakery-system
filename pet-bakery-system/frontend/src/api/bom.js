import request from '@/utils/request'

export const getBomBySkuId = (skuId) => request.get(`/bom/sku/${skuId}`)
export const getBomHistory = (skuId) => request.get(`/bom/sku/${skuId}/history`)
export const saveBom = (data) => request.post('/bom', data)