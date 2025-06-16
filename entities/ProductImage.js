const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "ProductImage",
  tableName: "product_images",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "圖片唯一 ID",
    },
    image_url: {
      type: "varchar",
      length: 512,
      nullable: false,
      comment: "商品圖片網址",
    },
    is_main: {
      type: "boolean",
      nullable: true,
      default: false,
      comment: "是否為主圖",
    },
    sort_order: {
      type: "integer",
      nullable: true,
      comment: "顯示順序（數字越小越前面）",
    },
  },
  relations: {
    product: {
      target: "Product",
      type: "many-to-one",
      joinColumn: {
        name: "product_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_product_images_product",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
});
