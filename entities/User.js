const { EntitySchema } = require("typeorm");
const { UUID } = require("typeorm/driver/mongodb/bson.typings.js");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
    },
    name: {
      type: "varchar",
      length: 50,
      nullable: false,
    },
    email: {
      type: "varchar",
      length: 150,
      nullable: false,
      unique: true,
    },
    password: {
      type: "varchar",
      length: 72,
      nullable: false,
    },
    tel: {
      type: "varchar",
      length: 50,
      nullable: true,
    },
    address: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    created_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
    },
    updated_at: {
      type: "timestamp",
      updateDate: true,
      nullable: false,
    },
  },
});
