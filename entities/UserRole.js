const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "UserRole",
  tableName: "user_role",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "使用者角色唯一 ID",
    },
    roleName: {
      type: "varchar",
      length: 50,
      nullable: false,
      comment: "使用者角色名稱",
    },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: {
        name: "user_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_user_role_user",
      },
      cascade: false,
      onDelete: "CASCADE",
    },
  },
});
