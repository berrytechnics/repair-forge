"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create inventory_categories table
    await queryInterface.createTable("inventory_categories", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "companies",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Create inventory_subcategories table
    await queryInterface.createTable("inventory_subcategories", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "companies",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Create inventory_brands table
    await queryInterface.createTable("inventory_brands", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "companies",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Create inventory_models table
    await queryInterface.createTable("inventory_models", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "companies",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      brand_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "inventory_brands",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Create indexes
    await queryInterface.addIndex("inventory_categories", ["company_id"], {
      name: "idx_inventory_categories_company_id",
    });
    await queryInterface.addIndex("inventory_categories", ["name"], {
      name: "idx_inventory_categories_name",
    });
    await queryInterface.addIndex("inventory_subcategories", ["company_id"], {
      name: "idx_inventory_subcategories_company_id",
    });
    await queryInterface.addIndex("inventory_subcategories", ["name"], {
      name: "idx_inventory_subcategories_name",
    });
    await queryInterface.addIndex("inventory_brands", ["company_id"], {
      name: "idx_inventory_brands_company_id",
    });
    await queryInterface.addIndex("inventory_brands", ["name"], {
      name: "idx_inventory_brands_name",
    });
    await queryInterface.addIndex("inventory_models", ["company_id"], {
      name: "idx_inventory_models_company_id",
    });
    await queryInterface.addIndex("inventory_models", ["brand_id"], {
      name: "idx_inventory_models_brand_id",
    });
    await queryInterface.addIndex("inventory_models", ["name"], {
      name: "idx_inventory_models_name",
    });

    // Migrate existing data
    // Check if old columns exist before migrating data
    const tableDescription = await queryInterface.describeTable("inventory_items");
    const hasOldColumns = tableDescription.category || tableDescription.subcategory ||
                          tableDescription.brand || tableDescription.model;

    // Get all unique categories per company (only if old columns exist)
    let categories = [];
    if (hasOldColumns && tableDescription.category) {
      [categories] = await queryInterface.sequelize.query(`
        SELECT DISTINCT company_id, category as name
        FROM inventory_items
        WHERE deleted_at IS NULL AND category IS NOT NULL AND category != ''
      `);
    }

    // Insert categories and create mapping
    const categoryMap = new Map(); // Map: company_id + name -> uuid
    for (const cat of categories) {
      // Check if category already exists
      const [existing] = await queryInterface.sequelize.query(`
        SELECT id FROM inventory_categories
        WHERE company_id = :company_id AND name = :name AND deleted_at IS NULL
      `, {
        replacements: { company_id: cat.company_id, name: cat.name },
        type: Sequelize.QueryTypes.SELECT,
      });

      if (existing && existing.length > 0) {
        categoryMap.set(`${cat.company_id}:${cat.name}`, existing[0].id);
      } else {
        // Insert new category
        const [result] = await queryInterface.sequelize.query(`
          INSERT INTO inventory_categories (id, company_id, name, created_at, updated_at)
          VALUES (uuid_generate_v4(), :company_id, :name, NOW(), NOW())
          RETURNING id
        `, {
          replacements: { company_id: cat.company_id, name: cat.name },
          type: Sequelize.QueryTypes.INSERT,
        });
        if (result && result.length > 0) {
          categoryMap.set(`${cat.company_id}:${cat.name}`, result[0].id);
        }
      }
    }

    // Get all unique subcategories per company (only if old columns exist)
    let subcategories = [];
    if (hasOldColumns && tableDescription.subcategory) {
      [subcategories] = await queryInterface.sequelize.query(`
        SELECT DISTINCT company_id, subcategory as name
        FROM inventory_items
        WHERE deleted_at IS NULL AND subcategory IS NOT NULL AND subcategory != ''
      `);
    }

    // Insert subcategories and create mapping
    const subcategoryMap = new Map();
    for (const subcat of subcategories) {
      // Check if subcategory already exists
      const [existing] = await queryInterface.sequelize.query(`
        SELECT id FROM inventory_subcategories
        WHERE company_id = :company_id AND name = :name AND deleted_at IS NULL
      `, {
        replacements: { company_id: subcat.company_id, name: subcat.name },
        type: Sequelize.QueryTypes.SELECT,
      });

      if (existing && existing.length > 0) {
        subcategoryMap.set(`${subcat.company_id}:${subcat.name}`, existing[0].id);
      } else {
        // Insert new subcategory
        const [result] = await queryInterface.sequelize.query(`
          INSERT INTO inventory_subcategories (id, company_id, name, created_at, updated_at)
          VALUES (uuid_generate_v4(), :company_id, :name, NOW(), NOW())
          RETURNING id
        `, {
          replacements: { company_id: subcat.company_id, name: subcat.name },
          type: Sequelize.QueryTypes.INSERT,
        });
        if (result && result.length > 0) {
          subcategoryMap.set(`${subcat.company_id}:${subcat.name}`, result[0].id);
        }
      }
    }

    // Get all unique brands per company (only if old columns exist)
    let brands = [];
    if (hasOldColumns && tableDescription.brand) {
      [brands] = await queryInterface.sequelize.query(`
        SELECT DISTINCT company_id, brand as name
        FROM inventory_items
        WHERE deleted_at IS NULL AND brand IS NOT NULL AND brand != ''
      `);
    }

    // Insert brands and create mapping
    const brandMap = new Map();
    for (const brand of brands) {
      // Check if brand already exists
      const [existing] = await queryInterface.sequelize.query(`
        SELECT id FROM inventory_brands
        WHERE company_id = :company_id AND name = :name AND deleted_at IS NULL
      `, {
        replacements: { company_id: brand.company_id, name: brand.name },
        type: Sequelize.QueryTypes.SELECT,
      });

      if (existing && existing.length > 0) {
        brandMap.set(`${brand.company_id}:${brand.name}`, existing[0].id);
      } else {
        // Insert new brand
        const [result] = await queryInterface.sequelize.query(`
          INSERT INTO inventory_brands (id, company_id, name, created_at, updated_at)
          VALUES (uuid_generate_v4(), :company_id, :name, NOW(), NOW())
          RETURNING id
        `, {
          replacements: { company_id: brand.company_id, name: brand.name },
          type: Sequelize.QueryTypes.INSERT,
        });
        if (result && result.length > 0) {
          brandMap.set(`${brand.company_id}:${brand.name}`, result[0].id);
        }
      }
    }

    // Get all unique models per company (only if old columns exist)
    let models = [];
    if (hasOldColumns && tableDescription.model && tableDescription.brand) {
      [models] = await queryInterface.sequelize.query(`
        SELECT DISTINCT company_id, brand, model as name
        FROM inventory_items
        WHERE deleted_at IS NULL AND model IS NOT NULL AND model != ''
      `);
    }

    // Insert models and create mapping
    const modelMap = new Map();
    for (const model of models) {
      // Find brand_id if brand exists
      let brandId = null;
      if (model.brand) {
        brandId = brandMap.get(`${model.company_id}:${model.brand}`);
      }

      // If no brand found, create it
      if (!brandId && model.brand) {
        const [existingBrand] = await queryInterface.sequelize.query(`
          SELECT id FROM inventory_brands
          WHERE company_id = :company_id AND name = :name AND deleted_at IS NULL
        `, {
          replacements: { company_id: model.company_id, name: model.brand },
          type: Sequelize.QueryTypes.SELECT,
        });

        if (existingBrand && existingBrand.length > 0) {
          brandId = existingBrand[0].id;
          brandMap.set(`${model.company_id}:${model.brand}`, brandId);
        } else {
          const [defaultBrand] = await queryInterface.sequelize.query(`
            INSERT INTO inventory_brands (id, company_id, name, created_at, updated_at)
            VALUES (uuid_generate_v4(), :company_id, :name, NOW(), NOW())
            RETURNING id
          `, {
            replacements: { company_id: model.company_id, name: model.brand },
            type: Sequelize.QueryTypes.INSERT,
          });

          if (defaultBrand && defaultBrand.length > 0) {
            brandId = defaultBrand[0].id;
            brandMap.set(`${model.company_id}:${model.brand}`, brandId);
          }
        }
      }

      // If still no brand, skip this model (can't create model without brand)
      if (!brandId) {
        continue;
      }

      // Check if model already exists
      const [existing] = await queryInterface.sequelize.query(`
        SELECT id FROM inventory_models
        WHERE company_id = :company_id AND brand_id = :brand_id AND name = :name AND deleted_at IS NULL
      `, {
        replacements: {
          company_id: model.company_id,
          brand_id: brandId,
          name: model.name,
        },
        type: Sequelize.QueryTypes.SELECT,
      });

      if (existing && existing.length > 0) {
        modelMap.set(`${model.company_id}:${model.brand}:${model.name}`, existing[0].id);
      } else {
        // Insert new model
        const [result] = await queryInterface.sequelize.query(`
          INSERT INTO inventory_models (id, company_id, brand_id, name, created_at, updated_at)
          VALUES (uuid_generate_v4(), :company_id, :brand_id, :name, NOW(), NOW())
          RETURNING id
        `, {
          replacements: {
            company_id: model.company_id,
            brand_id: brandId,
            name: model.name,
          },
          type: Sequelize.QueryTypes.INSERT,
        });
        if (result && result.length > 0) {
          modelMap.set(`${model.company_id}:${model.brand}:${model.name}`, result[0].id);
        }
      }
    }

    // Check current table structure (after creating reference tables)
    const tableDescriptionAfterRefs = await queryInterface.describeTable("inventory_items");

    // Add new UUID columns to inventory_items (only if they don't exist)
    if (!tableDescriptionAfterRefs.category_id) {
      await queryInterface.addColumn("inventory_items", "category_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "inventory_categories",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (!tableDescriptionAfterRefs.subcategory_id) {
      await queryInterface.addColumn("inventory_items", "subcategory_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "inventory_subcategories",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (!tableDescriptionAfterRefs.brand_id) {
      await queryInterface.addColumn("inventory_items", "brand_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "inventory_brands",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (!tableDescriptionAfterRefs.model_id) {
      await queryInterface.addColumn("inventory_items", "model_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "inventory_models",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    // Migrate data: Update inventory_items with new foreign keys (only if old columns exist)
    let items = [];
    if (hasOldColumns) {
      // Build SELECT query based on which old columns exist
      const selectColumns = ["id", "company_id"];
      if (tableDescription.category) selectColumns.push("category");
      if (tableDescription.subcategory) selectColumns.push("subcategory");
      if (tableDescription.brand) selectColumns.push("brand");
      if (tableDescription.model) selectColumns.push("model");

      [items] = await queryInterface.sequelize.query(`
        SELECT ${selectColumns.join(", ")}
        FROM inventory_items
        WHERE deleted_at IS NULL
      `);
    }

    for (const item of items) {
      const updates = {};

      if (item.category) {
        const categoryId = categoryMap.get(`${item.company_id}:${item.category}`);
        if (categoryId) {
          updates.category_id = categoryId;
        }
      }

      if (item.subcategory) {
        const subcategoryId = subcategoryMap.get(`${item.company_id}:${item.subcategory}`);
        if (subcategoryId) {
          updates.subcategory_id = subcategoryId;
        }
      }

      if (item.brand) {
        const brandId = brandMap.get(`${item.company_id}:${item.brand}`);
        if (brandId) {
          updates.brand_id = brandId;
        }
      }

      if (item.model && item.brand) {
        const modelId = modelMap.get(`${item.company_id}:${item.brand}:${item.model}`);
        if (modelId) {
          updates.model_id = modelId;
        }
      }

      if (Object.keys(updates).length > 0) {
        await queryInterface.sequelize.query(`
          UPDATE inventory_items
          SET ${Object.keys(updates).map((key, idx) => `${key} = :${key}`).join(", ")}
          WHERE id = :id
        `, {
          replacements: { ...updates, id: item.id },
        });
      }
    }

    // Create indexes on foreign keys (only if they don't exist)
    const indexes = await queryInterface.showIndex("inventory_items");
    const indexNames = indexes.map(idx => idx.name);

    if (!indexNames.includes("idx_inventory_items_category_id")) {
      await queryInterface.addIndex("inventory_items", ["category_id"], {
        name: "idx_inventory_items_category_id",
      });
    }
    if (!indexNames.includes("idx_inventory_items_subcategory_id")) {
      await queryInterface.addIndex("inventory_items", ["subcategory_id"], {
        name: "idx_inventory_items_subcategory_id",
      });
    }
    if (!indexNames.includes("idx_inventory_items_brand_id")) {
      await queryInterface.addIndex("inventory_items", ["brand_id"], {
        name: "idx_inventory_items_brand_id",
      });
    }
    if (!indexNames.includes("idx_inventory_items_model_id")) {
      await queryInterface.addIndex("inventory_items", ["model_id"], {
        name: "idx_inventory_items_model_id",
      });
    }

    // Remove old text columns after migration is complete
    // Check if columns exist before removing (in case migration was partially run)
    const finalTableDescription = await queryInterface.describeTable("inventory_items");

    if (finalTableDescription.category) {
      await queryInterface.removeColumn("inventory_items", "category");
    }
    if (finalTableDescription.subcategory) {
      await queryInterface.removeColumn("inventory_items", "subcategory");
    }
    if (finalTableDescription.brand) {
      await queryInterface.removeColumn("inventory_items", "brand");
    }
    if (finalTableDescription.model) {
      await queryInterface.removeColumn("inventory_items", "model");
    }
  },

  down: async (queryInterface) => {
    // Remove indexes
    await queryInterface.removeIndex("inventory_items", "idx_inventory_items_model_id");
    await queryInterface.removeIndex("inventory_items", "idx_inventory_items_brand_id");
    await queryInterface.removeIndex("inventory_items", "idx_inventory_items_subcategory_id");
    await queryInterface.removeIndex("inventory_items", "idx_inventory_items_category_id");

    // Remove columns from inventory_items
    await queryInterface.removeColumn("inventory_items", "model_id");
    await queryInterface.removeColumn("inventory_items", "brand_id");
    await queryInterface.removeColumn("inventory_items", "subcategory_id");
    await queryInterface.removeColumn("inventory_items", "category_id");

    // Drop tables
    await queryInterface.dropTable("inventory_models");
    await queryInterface.dropTable("inventory_brands");
    await queryInterface.dropTable("inventory_subcategories");
    await queryInterface.dropTable("inventory_categories");
  },
};
