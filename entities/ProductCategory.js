const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "ProductCategory",
  tableName: "categories",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "分類唯一 ID",
    },
    name: {
      type: "varchar",
      length: 100,
      nullable: false,
      unique: true,
      comment: "分類名稱",
    },
    description: {
      type: "text",
      nullable: true,
      comment: "分類描述",
    },
    created_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
      comment: "分類建立時間",
    },
    updated_at: {
      type: "timestamp",
      updateDate: true,
      nullable: false,
      comment: "最後更新時間",
    },
  },
  relations: {
    products: {
      type: "one-to-many",
      target: "Product",
      inverseSide: "category",
    },
  },
});
