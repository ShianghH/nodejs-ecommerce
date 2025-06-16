const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "FavoriteItem",
  tableName: "favorite_items",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "收藏唯一 ID",
    },
    created_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
      comment: "收藏建立時間",
    },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: {
        name: "user_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_favorite_user",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
    product: {
      target: "Product",
      type: "many-to-one",
      joinColumn: {
        name: "product_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_favorite_product",
      },
      nullable: false,
      onDelete: "RESTRICT",
    },
  },
});
