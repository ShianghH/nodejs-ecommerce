const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Tag",
  tableName: "tags",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    name: {
      type: "varchar",
      length: 100,
      unique: true,
      nullable: false,
      comment: "標籤名稱",
    },
    created_at: {
      type: "timestamp",
      createDate: true,
    },
    updated_at: {
      type: "timestamp",
      updateDate: true,
    },
  },
  relations: {
    productTags: {
      target: "ProductTag",
      type: "one-to-many",
      inverseSide: "tag",
    },
    products: {
      target: "Product",
      type: "many-to-many",
      inverseSide: "tags",
    },
  },
});
