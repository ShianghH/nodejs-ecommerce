const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "OrderItem",
  tableName: "order_items",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "訂單項目唯一ID",
    },
    quantity: {
      type: "integer",
      nullable: false,
      comment: "購買數量",
    },
    original_price: {
      type: "decimal",
      nullable: false,
      comment: "原價",
    },
    unit_price: {
      type: "decimal",
      nullable: false,
      comment: "折扣後價格",
    },
    subtotal: {
      type: "decimal",
      nullable: false,
      comment: "單品總價",
    },
  },
  relations: {
    order: {
      target: "Order",
      type: "many-to-one",
      joinColumn: {
        name: "order_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_order_items_order",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
    product_variant: {
      target: "ProductVariant",
      type: "many-to-one",
      joinColumn: {
        name: "product_variants_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_order_items_product_variant",
      },
      nullable: false,
      onDelete: "RESTRICT",
    },
  },
});
