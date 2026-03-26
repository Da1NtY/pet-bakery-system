// 用户状态
const USER_STATUS = {
  ENABLED: 1,
  DISABLED: 0
};

// 订单状态
const ORDER_STATUS = {
  PENDING: 'pending',           // 待确认
  CONFIRMED: 'confirmed',       // 已确认
  PRODUCING: 'producing',       // 制作中
  READY: 'ready',               // 待取货
  COMPLETED: 'completed',       // 已完成
  CANCELLED: 'cancelled'        // 已取消
};

// 支付状态
const PAYMENT_STATUS = {
  PENDING: 'pending',           // 待支付
  PAID: 'paid',                 // 已支付
  PARTIAL: 'partial',           // 部分支付
  REFUNDED: 'refunded'          // 已退款
};

// 库存变更类型
const STOCK_CHANGE_TYPE = {
  INGREDIENT: {
    STOCK_IN: 'stock_in',       // 入库
    STOCK_OUT: 'stock_out',     // 出库
    ORDER_DEDUCT: 'order_deduct', // 订单扣减
    ADJUSTMENT: 'adjustment',   // 调整
    WASTAGE: 'wastage'          // 损耗
  },
  FINISHED_GOODS: {
    PRODUCE_IN: 'produce_in',   // 生产入库
    SELL_OUT: 'sell_out',       // 销售出库
    ADJUSTMENT: 'adjustment',
    WASTAGE: 'wastage'
  }
};

// 商品类型
const PRODUCT_TYPE = {
  CAKE: 'cake',
  BISCUIT: 'biscuit',
  SNACK_BOX: 'snack_box',
  CUSTOM: 'custom'
};

// 宠物类型
const PET_TYPE = {
  DOG: 'dog',
  CAT: 'cat',
  OTHER: 'other'
};

module.exports = {
  USER_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  STOCK_CHANGE_TYPE,
  PRODUCT_TYPE,
  PET_TYPE
};