require("dotenv/config");

const { dataSource } = require("../db/data-source");

const User = require("../entities/User");
const UserRole = require("../entities/UserRole");
const Product = require("../entities/Product");
const ProductCategory = require("../entities/ProductCategory");
const ProductVariant = require("../entities/ProductVariant");
const ProductImage = require("../entities/ProductImage");
const ProductTag = require("../entities/ProductTag");
const Tag = require("../entities/Tag");

const bcrypt = require("bcrypt");

const seed = async () => {
  console.log("\n[seed] 開始執行（不清空資料，只補缺的）...\n");
  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);
  const productRepo = dataSource.getRepository(Product);
  const categoryRepo = dataSource.getRepository(ProductCategory);
  const variantRepo = dataSource.getRepository(ProductVariant);
  const imageRepo = dataSource.getRepository(ProductImage);
  const productTagRepo = dataSource.getRepository(ProductTag);
  const tagRepo = dataSource.getRepository(Tag);

  //1.先建立user帳號 > admin
  const adminEmail = "adminVip@example.com";
  let adminUser = await userRepo.findOne({
    where: { email: adminEmail },
  });
  if (!adminUser) {
    const passwordHash = await bcrypt.hash("admin123", 10);

    adminUser = await userRepo.save(
      userRepo.create({
        name: "Admin",
        email: adminEmail,
        password: passwordHash,
        is_active: true,
      })
    );
    console.log("[seed]使用者建立成功", adminEmail);
  } else {
    console.log("[seed]使用者已存在，跳過", adminEmail);
  }

  //2.userRole
  const adminRoleName = "admin";

  const existUserRole = await userRoleRepo.findOne({
    where: {
      user: { id: adminUser.id },
      roleName: adminRoleName,
    },
    relations: ["user"],
  });
  if (!existUserRole) {
    await userRoleRepo.save(
      userRoleRepo.create({
        user: adminUser,
        roleName: adminRoleName,
      })
    );
    console.log("[seed] admin 使用者已綁定 admin role");
  } else {
    console.log("[seed] admin 使用者已有 admin role，跳過");
  }

  //3.分類
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
    console.log("[seed]建立產品", demoName);
  } else {
    console.log("[seed]商品已存在,跳過建立", demoName);
  }

  //主圖
  const hasImage = await imageRepo.count({
    where: {
      product: { id: product.id },
    },
  });
  if (!hasImage) {
    await imageRepo.save(
      imageRepo.create({
        product,
        image_url: "https://via.placeholder.com/400x300?text=Keyboard",
        is_main: true,
      })
    );
    console.log("[seed]建立圖片");
  } else {
    console.log("[seed]商品已有圖片,跳過");
  }

  //tag
  const tagNames = ["RGB", "Wired"];
  const tags = [];
  for (const name of tagNames) {
    let tag = await tagRepo.findOne({
      where: { name },
    });
    if (!tag) {
      tag = await tagRepo.save(
        tagRepo.create({
          name,
        })
      );
      console.log("[seed]建立標籤", name);
    }
    tags.push(tag);
  }

  //ProductTag
  for (const tag of tags) {
    const exist = await productTagRepo.findOne({
      where: {
        product: { id: product.id },
        tag: { id: tag.id },
      },
      relations: ["product", "tag"],
    });
    if (!exist) {
      await productTagRepo.save(
        productTagRepo.create({
          product,
          tag,
        })
      );
      console.log("[seed]建立商品與Tag關聯", product.name, "_", tag.name);
    }
  }

  //variants
  const variantCount = await variantRepo.count({
    where: {
      product: { id: product.id },
    },
  });
  if (!variantCount) {
    await variantRepo.save([
      variantRepo.create({
        product,
        option_name: "Switch",
        value: "Red",
        stock: 20,
      }),
      variantRepo.create({
        product,
        option_name: "Switch",
        value: "Black",
        stock: 15,
      }),
    ]);
    console.log("[seed]建立商品variant兩種(Red/Black)");
  } else {
    console.log("[seed]商品已有variant,跳過建立");
  }
  await dataSource.destroy();
  console.log("\n[seed]完成(資料庫沒有被清空，只是補齊缺少的基本資料)\n");
};

seed().catch((e) => {
  console.error("[seed]失敗", e);
  process.exit(1);
});
