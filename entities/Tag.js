const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Tag",
  tableName: "tags",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
      comment: "標籤唯一 ID",
    },
    name: {
      type: "varchar",
      length: 100,
      nullable: false,
      unique: true,
      comment: "標籤名稱",
    },
    created_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
      comment: "建立時間",
    },
    updated_at: {
      type: "timestamp",
      updateDate: true,
      nullable: false,
      comment: "更新時間",
    },
  },
});
