# 🛒 學習組 A - 電商後端專案

這是一個使用 Node.js + Express + PostgreSQL 打造的 RESTful API 專案，提供電商平台所需的完整後端功能。

---

## 🧰 技術棧（Tech Stack）

- Node.js + Express
- PostgreSQL + TypeORM
- JWT 認證
- Docker / docker-compose
- Postman 測試

---

## 🚀 快速開始（Getting Started）

```bash
# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env

# 啟動資料庫（使用 Docker）
docker-compose up -d

# 初始化資料庫與開發伺服器
npm run db:init
npm run dev
```

## 專案結構（Project Structure）

.
├── controllers/ # 控制器（API 業務邏輯）
├── routes/ # API 路由
├── entities/ # 資料表模型（TypeORM）
├── middlewares/ # 驗證與錯誤處理
├── tests/ # 測試
├── config/ # 設定檔（資料庫、環境）
└── ...

## API 功能概覽

-使用者

| 方法 | 路由                  | 說明       |
| ---- | --------------------- | ---------- |
| POST | `/api/v1/users`       | 使用者註冊 |
| POST | `/api/v1/users/login` | 使用者登入 |

-商品（Products）

| 方法   | 路由                   | 說明         |
| ------ | ---------------------- | ------------ |
| GET    | `/api/v1/products`     | 取得商品列表 |
| GET    | `/api/v1/products/:id` | 取得商品詳情 |
| POST   | `/api/v1/products`     | 新增商品     |
| PUT    | `/api/v1/products/:id` | 編輯商品     |
| DELETE | `/api/v1/products/:id` | 刪除商品     |

- 購物車（Cart）

| 方法   | 路由                     | 說明           |
| ------ | ------------------------ | -------------- |
| GET    | `/api/v1/cart-items`     | 取得購物車列表 |
| POST   | `/api/v1/cart-items`     | 加入購物車     |
| DELETE | `/api/v1/cart-items/:id` | 移除購物車商品 |

- 訂單（Orders）

| 方法 | 路由                 | 說明         |
| ---- | -------------------- | ------------ |
| POST | `/api/v1/orders`     | 建立新訂單   |
| GET  | `/api/v1/orders/:id` | 取得訂單詳情 |

## TODO / 已知問題（Roadmap）

- [ ] 使用者註冊與登入驗證
- [ ] 商品分類與 CRUD
- [ ] 購物車功能
- [ ] 下單與訂單紀錄
- [ ] 加入購物車折扣功能
- [ ] 整合 Stripe 金流
- [ ] 管理者登入與後台管理
- [ ] 撰寫 Swagger API 文件
- [ ] 實作 Rate Limit / API 使用保護

## 作者資訊

By Shiangh
GitHub: https://github.com/你的帳號
