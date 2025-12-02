require("dotenv/config");

const { dataSource } = require("../db/data-source");

const User = require("../entities/User");
const UserRole = require("../entities/UserRole");
const Products = require("../entities/Product");
const ProductCategory = require("../entities/ProductCategory");
const ProductVariant = require("../entities/ProductVariant");
const ProductImage = require("../entities/ProductImage");
const ProductTag = require("../entities/ProductTag");
const Tag = require("../entities/Tag");
const OrderItem = require("../entities/OrderItem");

const bcrypt = require("bcrypt");

const seed = async () => {
  console.log("\n[seed] 開始執行（不清空資料，只補缺的）...\n");
  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);
  const productRepo = dataSource.getRepository(Products);
  const categoryRepo = dataSource.getRepository(ProductCategory);
  const variantRepo = dataSource.getRepository(ProductVariant);
  const imageRepo = dataSource.getRepository(ProductImage);
  const productTagRepo = dataSource.getRepository(ProductTag);
  const tagRepo = dataSource.getRepository(Tag);
  const orderRepo = dataSource.getRepository(OrderItem);

  //1.管理員帳號
  const adminEmail = "adminVip@example.com";
  let admin = await userRoleRepo.findOne({
    where: { name: "Admin" },
  });
};
