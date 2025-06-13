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
    },
    user_id: {
      type: "uuid",
      nullable: false,
    },
    rolename: {
      type: "varchar",
      length: 50,
      nullable: false,
    },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: {
        name: "user_id",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
});
