const { DataSource } = require("typeorm");
const config = require("../config/index");

const User = require("../entities/User");
const UserRole = require("../entities/UserRole");
const Product = require("../entities/Product");
const ProductCategory = require("../entities/ProductCategory");
const ProductVariant = require("../entities/ProductVariant");
const CartItem = require("../entities/CartItem");
const Order = require("../entities/Order");
const PaymentMethod = require("../entities/PaymentMethod");
const OrderItem = require("../entities/OrderItem");
const ProductImage = require("../entities/ProductImage");
const FavoriteItem = require("../entities/FavoriteItem");
const Tag = require("../entities/Tag");
const ProductTag = require("../entities/ProductTag");

const dataSource = new DataSource({
  type: "postgres",
  host: config.get("db.host"),
  port: config.get("db.port"),
  username: config.get("db.username"),
  password: config.get("db.password"),
  database: config.get("db.database"),
  synchronize: config.get("db.synchronize"),
  poolSize: 10,
  entities: [
    User,
    UserRole,
    Product,
    ProductCategory,
    ProductVariant,
    CartItem,
    Order,
    PaymentMethod,
    OrderItem,
    ProductImage,
    FavoriteItem,
    Tag,
    ProductTag,
  ],
  ssl: config.get("db.ssl"),
});

module.exports = { dataSource };
