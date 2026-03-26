import dayjs from 'dayjs'

// 日期格式化
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '-'
  return dayjs(date).format(format)
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 金额格式化
export const formatMoney = (amount) => {
  if (amount === null || amount === undefined) return '¥0.00'
  return '¥' + parseFloat(amount).toFixed(2)
}

// 订单状态映射
export const orderStatusMap = {
  'pending': { text: '待确认', type: 'warning' },
  'confirmed': { text: '已确认', type: 'primary' },
  'producing': { text: '制作中', type: 'info' },
  'ready': { text: '待取货', type: 'success' },
  'completed': { text: '已完成', type: 'success' },
  'cancelled': { text: '已取消', type: 'danger' }
}

// 支付状态映射
export const paymentStatusMap = {
  'pending': { text: '待支付', type: 'warning' },
  'partial': { text: '部分支付', type: 'info' },
  'paid': { text: '已支付', type: 'success' },
  'refunded': { text: '已退款', type: 'danger' }
}

// 宠物类型映射
export const petTypeMap = {
  'dog': '狗狗',
  'cat': '猫咪',
  'other': '其他'
}

// 商品类型映射
export const productTypeMap = {
  'cake': '蛋糕',
  'biscuit': '饼干',
  'snack_box': '零食盒',
  'custom': '定制'
}