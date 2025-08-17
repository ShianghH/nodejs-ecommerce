const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Product",
  tableName: "products",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "商品唯一 ID",
    },
    name: {
      type: "varchar",
      length: 100,
      nullable: false,
      comment: "商品名稱",
    },
    price: {
      type: "decimal",
      nullable: false,
      comment: "商品售價",
    },
    discount_price: {
      type: "decimal",
      nullable: true,
      comment: "優惠價，若無折扣可為 NULL",
    },
    description: {
      type: "text",
      nullable: true,
      comment: "商品描述",
    },
    is_active: {
      type: "boolean",
      nullable: false,
      comment: "是否上架（啟用）",
    },
    created_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
      comment: "商品建立時間",
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
      comment: "刪除時間（軟刪除）",
    },
  },
  relations: {
    category: {
      target: "ProductCategory",
      type: "many-to-one",
      joinColumn: {
        name: "category_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_products_category",
      },
      cascade: false,
      onDelete: "CASCADE",
    },
    images: {
      target: "ProductImage",
      type: "one-to-many",
      inverseSide: "product",
      cascade: true,
    },
    variants: {
      target: "ProductVariant",
      type: "one-to-many",
      inverseSide: "product",
      cascade: true,
    },

    productTags: {
      target: "ProductTag",
      type: "one-to-many",
      inverseSide: "product",
      cascade: true,
    },
  },
});
