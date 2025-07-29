const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "ProductVariant",
  tableName: "product_variants",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "商品規格唯一 ID",
    },
    option_name: {
      type: "varchar",
      length: 100,
      nullable: false,
      comment: "規格的類型(如顏色 尺寸）",
    },
    value: {
      type: "varchar",
      length: 50,
      nullable: false,
      comment: "規格的實際值(如黑色、XL)",
    },
    stock: {
      type: "integer",
      nullable: false,
      comment: "目前庫存數量",
    },
    created_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
      comment: "規格建立時間",
    },
    updated_at: {
      type: "timestamp",
      updateDate: true,
      nullable: false,
      comment: "最後修改時間",
    },
    deleted_at: {
      type: "timestamp",
      deleteDate: true,
      nullable: true,
      comment: "軟刪除時間",
    },
  },
  relations: {
    product: {
      target: "Product",
      type: "many-to-one",
      joinColumn: {
        name: "product_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_product_variants_product",
      },
      cascade: false,
      onDelete: "CASCADE",
    },
  },
});
