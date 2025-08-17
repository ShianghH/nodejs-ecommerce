const { EntitySchema } = require("typeorm");
const OrderStatusEnum = require("./OrderStatusEnum");

module.exports = new EntitySchema({
  name: "Order",
  tableName: "orders",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "訂單唯一 ID",
    },
    order_status: {
      type: "enum",
      enum: OrderStatusEnum,
      enumName: "orders_status",
      nullable: false,
      comment: "訂單狀態",
    },
    shipping_name: {
      type: "varchar",
      length: 50,
      nullable: false,
      comment: "收件人姓名",
    },
    shipping_phone: {
      type: "varchar",
      length: 20,
      nullable: false,
      comment: "收件人電話",
    },
    shipping_address: {
      type: "varchar",
      length: 255,
      nullable: false,
      comment: "收件地址",
    },
    shipping_fee: {
      type: "decimal",
      nullable: false,
      default: 0,
      comment: "運費",
    },
    total_before_discount: {
      type: "decimal",
      nullable: false,
      comment: "折扣前總金額",
    },
    discount_amount: {
      type: "decimal",
      nullable: false,
      comment: "折扣金額",
    },
    subtotal: {
      type: "decimal",
      nullable: false,
      comment: "訂單總金額",
    },
    created_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
      comment: "訂單建立時間",
    },
    updated_at: {
      type: "timestamp",
      updateDate: true,
      nullable: false,
      comment: "最後修改時間",
    },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: {
        name: "user_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_orders_user",
      },
      cascade: false,
      onDelete: "CASCADE",
    },
    payment_method: {
      target: "PaymentMethod",
      type: "many-to-one",
      joinColumn: {
        name: "payment_method_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_orders_payment_method",
      },
      nullable: false,
      onDelete: "RESTRICT",
    },
    orderItems: {
      target: "OrderItem",
      type: "one-to-many",
      inverseSide: "order",
      cascade: true,
    },
  },
});
