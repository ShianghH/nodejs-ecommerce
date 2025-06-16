const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "ProductTag",
  tableName: "product_tags",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "關聯唯一 ID",
    },
    sort_order: {
      type: "integer",
      nullable: false,
      comment: "顯示排序",
    },
    created_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
      comment: "建立時間",
    },
  },
  relations: {
    product: {
      target: "Product",
      type: "many-to-one",
      joinColumn: {
        name: "product_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_product_tags_product",
      },
      onDelete: "CASCADE",
      nullable: false,
    },
    tag: {
      target: "Tag",
      type: "many-to-one",
      joinColumn: {
        name: "tag_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_product_tags_tag",
      },
      onDelete: "CASCADE",
      nullable: false,
    },
  },
});
