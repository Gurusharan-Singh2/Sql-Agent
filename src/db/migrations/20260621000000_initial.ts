import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("products", (table) => {
    table.increments("id").primary();
    table.string("name", 255).notNullable();
    table.string("category", 255).notNullable();
    table.float("price").notNullable();
    table.integer("stock").notNullable().defaultTo(0);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("sales", (table) => {
    table.increments("id").primary();
    table.integer("product_id").unsigned().notNullable();
    table.foreign("product_id").references("products.id");
    table.integer("quantity").notNullable();
    table.float("total_amount").notNullable();
    table.timestamp("sale_date").defaultTo(knex.fn.now());
    table.string("customer_name", 255).notNullable();
    table.string("region", 255).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("sales");
  await knex.schema.dropTableIfExists("products");
}
