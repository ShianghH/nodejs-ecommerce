const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "CartItem",
    tableName: "cart_items",
    columns: {
        id: {
            primary: true,
            type: "uuid",
            generated: "uuid",
            nullable: false,
            comment: "購物車項目唯一 ID"
        },
        user_id: {
            type: "uuid",
            nullable: false,
            comment: "對應使用者 ID",
        },
        product_variants_id: {
            type: "uuid",
            nullable: false,
            comment: "商品規格 ID（如顏色、尺寸）",
        },
        quantity: {
            type: "integer",
            nullable: false,
            comment: "購買數量",
        },
        created_at: {
            type: 'timestamp',
            createDate: true,
            nullable: false,
            comment: "加入購物車的時間",
        },
        updated_at: {
            type: "timestamp",
            updateDate: true,
            nullable: false,
            comment: "最後修改時間",
        },
    },
    relations: {
        user: {
            target: "User",
            type: 'many-to-one',
            joinColumn: {
                name: "user_id",
                referencedColumnName: 'id',
                foreignKeyConstraintName:
                "fk_cart_items_user"
            },
            cascade: false,
            onDelete: "CASCADE"
        },
        productVariant: {
            target: "ProductVariant",
            type: "many-to-one",
            joinColumn: {
                name: "product_variants_id",
                referencedColumnName: "id",
                foreignKeyConstraintName:       "fk_cart_items_product_variant",
            },
            cascade: false,
            onDelete: "CASCADE"
        }
    }
})