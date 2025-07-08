const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "ProductTag",
  tableName: "product_tags",
  columns: {
    product_id: {
      type: "uuid",
      primary: true,
    },
    tag_id: {
      type: "uuid",
      primary: true,
    },
    sort_order: {
      type: "int",
      nullable: true,
    },
    created_at: {
      type: "timestamp",
      createDate: true,
    },
  },
  relations: {
    product: {
      type: "many-to-one",
      target: "Product",
      joinColumn: { name: "product_id" },
      onDelete: "CASCADE",
    },
    tag: {
      type: "many-to-one",
      target: "Tag",
      joinColumn: { name: "tag_id" },
      onDelete: "CASCADE",
    },
  },
});
