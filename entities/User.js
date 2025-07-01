const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "使用者唯一識別碼",
    },
    name: {
      type: "varchar",
      length: 50,
      nullable: false,
      comment: "使用者姓名",
    },
    email: {
      type: "varchar",
      length: 150,
      nullable: false,
      unique: true,
      comment: "使用者電子信箱（唯一）",
    },
    password: {
      type: "varchar",
      length: 72,
      nullable: false,
      comment: "加密後的使用者密碼",
    },
    tel: {
      type: "varchar",
      length: 50,
      nullable: true,
      comment: "使用者電話（選填）",
    },
    address: {
      type: "varchar",
      length: 255,
      nullable: true,
      comment: "寄送地址（選填）",
    },
    created_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
      comment: "帳號建立時間",
    },
    updated_at: {
      type: "timestamp",
      updateDate: true,
      nullable: false,
      comment: "最後修改時間",
    },
  },
  relations: {
    roles: {
      target: "UserRole",
      type: "one-to-many",
      inverseSide: "user",
      cascade: false,
    },
  },
});
