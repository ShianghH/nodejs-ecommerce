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
    deleted_at: {
      type: "timestamp",
      deleteDate: true,
      nullable: true,
      comment: "軟刪除時間",
    },
  },
  relations: {
    product: {
      type: "many-to-one",
      target: "Product",
      joinColumn: { name: "product_id", referencedColumnName: "id" },
      onDelete: "CASCADE",
    },
    tag: {
      type: "many-to-one",
      target: "Tag",
      joinColumn: { name: "tag_id", referencedColumnName: "id" },
      onDelete: "CASCADE",
    },
  },
  uniques: [
    {
      columns: ["product", "tag"],
    },
  ],
});
