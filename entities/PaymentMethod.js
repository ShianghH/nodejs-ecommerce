const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "PaymentMethod",
  tableName: "payment_methods",
  columns: {
    id: {
      primary: true,
      type: "integer",
      generated: true,
      nullable: false,
      comment: "付款方式主鍵",
    },
    name: {
      type: "varchar",
      length: 50,
      nullable: false,
      comment: "付款方式名稱（如信用卡、ATM）",
    },
    is_active: {
      type: "boolean",
      default: true,
      nullable: false,
      comment: "付款方式是否啟用",
    },
  },
});
