import request from '@/utils/request'

export const login = (data) => request.post('/auth/login', data)
export const getUserInfo = () => request.get('/auth/me')
export const changePassword = (data) => request.post('/auth/change-password', data)