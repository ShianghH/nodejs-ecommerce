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
  let admin = await userRepo.findOne({
    where: { email: adminEmail },
  });
  if (!admin) {
    const passwordHash = await bcrypt.hash("admin", 10);

    admin = await userRepo.save(
      userRepo.create({
        name: "Admin",
        email: adminEmail,
        password: passwordHash,
      })
    );
    console.log("[seed]管理員建立成功", adminEmail);
  } else {
    console.log("[seed]管理員已存在，跳過", adminEmail);
  }

  //2.分類
  let defaultCategory = await categoryRepo.findOne({
    where: { name: "Default" },
  });
  if (!defaultCategory) {
    defaultCategory = await categoryRepo.save(
      categoryRepo.create({
        name: "Default",
      })
    );
    console.log("[seed]建立分類: Default");
  } else {
    console.log("[seed]分類Default已存在,跳過");
  }

  //3.商品+圖片

  const demoName = "Demo Keyboard";
  let product = await productRepo.findOne({
    where: {
      name: demoName,
    },
    relations: ["category", "images", "variants"],
  });

  if (!product) {
    product = await productRepo.save(
      productRepo.create({
        name: demoName,
        price: 1990,
        discount_price: 1500,
        is_active: true,
        category: defaultCategory,
      })
    );
  }
};
