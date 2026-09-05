const { Pool } = require("pg");
const config = require("../config");

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      theme TEXT,
      min_players INTEGER,
      max_players INTEGER,
      min_age INTEGER,
      duration_minutes INTEGER,
      difficulty INTEGER,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      cover_image TEXT,
      video_url TEXT
    );
  `);

  await pool.query(`
    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS cover_image TEXT;
  `);

  await pool.query(`
    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS video_url TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS opening_hours (
      id SERIAL PRIMARY KEY,
      day_of_week INTEGER NOT NULL UNIQUE,
      open_time TEXT,
      close_time TEXT,
      is_open BOOLEAN NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS colombian_holidays (
      id SERIAL PRIMARY KEY,
      holiday_date TEXT NOT NULL UNIQUE,
      name TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      room_id INTEGER,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      actual_duration_ms INTEGER,
      consult_code TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      players INTEGER NOT NULL,
      notes TEXT,
      total INTEGER,
      status TEXT DEFAULT 'PENDING',
      is_first_time BOOLEAN NOT NULL DEFAULT FALSE,
      marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
      marketing_consent_at BIGINT,
      tracking_fbp TEXT,
      tracking_fbc TEXT,
      tracking_source_url TEXT,
      tracking_user_agent TEXT,
      tracking_ip TEXT,
      tracking_lead_event_id TEXT,
      tracking_schedule_event_id TEXT,
      reservation_source TEXT NOT NULL DEFAULT 'web',
      out_of_hours BOOLEAN NOT NULL DEFAULT FALSE,
      reprogrammed BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS actual_duration_ms INTEGER;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS reservation_source TEXT NOT NULL DEFAULT 'web';
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS marketing_consent_at BIGINT;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS tracking_fbp TEXT;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS tracking_fbc TEXT;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS tracking_source_url TEXT;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS tracking_user_agent TEXT;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS tracking_ip TEXT;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS tracking_lead_event_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS tracking_schedule_event_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS out_of_hours BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS reprogrammed BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS timer_start_ms BIGINT;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS timer_end_ms BIGINT;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS reservations_consult_code_unique
    ON reservations (consult_code)
    WHERE consult_code IS NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservation_changes (
      id SERIAL PRIMARY KEY,
      reservation_id INTEGER NOT NULL,
      before_date TEXT,
      before_start_time TEXT,
      before_end_time TEXT,
      before_room_id INTEGER,
      after_date TEXT,
      after_start_time TEXT,
      after_end_time TEXT,
      after_room_id INTEGER,
      changed_by INTEGER,
      changed_by_role TEXT,
      change_reason TEXT,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS can_create_courtesy BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rates (
      id SERIAL PRIMARY KEY,
      day_type TEXT NOT NULL,
      day_label TEXT,
      day_range TEXT,
      players INTEGER NOT NULL,
      price_per_person INTEGER NOT NULL,
      currency TEXT DEFAULT 'COP'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cafeteria_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      image TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cafeteria_products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      category TEXT,
      image TEXT
    );
  `);

  await pool.query(`
    ALTER TABLE cafeteria_products
    ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES cafeteria_categories(id);
  `);

  await pool.query(`
    ALTER TABLE cafeteria_products
    ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE cafeteria_products ADD COLUMN IF NOT EXISTS minimum_stock INTEGER;
    ALTER TABLE cafeteria_products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'unidad';
    ALTER TABLE cafeteria_products ADD COLUMN IF NOT EXISTS track_expiration BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE cafeteria_products ADD COLUMN IF NOT EXISTS expiration_alert_days INTEGER NOT NULL DEFAULT 30;
    ALTER TABLE cafeteria_products ADD COLUMN IF NOT EXISTS critical_expiration_alert_days INTEGER NOT NULL DEFAULT 7;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cafeteria_promotions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      promotional_price INTEGER NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      starts_at DATE,
      ends_at DATE,
      days_of_week INTEGER[] NOT NULL DEFAULT '{}',
      starts_time TIME,
      ends_time TIME,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cafeteria_promotion_items (
      promotion_id INTEGER NOT NULL REFERENCES cafeteria_promotions(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES cafeteria_products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      PRIMARY KEY (promotion_id, product_id)
    );
  `);

  await pool.query(`
    ALTER TABLE cafeteria_promotions
    ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] NOT NULL DEFAULT '{}';
    ALTER TABLE cafeteria_promotions ADD COLUMN IF NOT EXISTS starts_time TIME;
    ALTER TABLE cafeteria_promotions ADD COLUMN IF NOT EXISTS ends_time TIME;
  `);

  await pool.query(`
    INSERT INTO cafeteria_categories (name, slug, sort_order)
    SELECT
      category_name,
      'legacy-' || md5(lower(category_name)),
      row_number() OVER (ORDER BY lower(category_name))
    FROM (
      SELECT DISTINCT trim(category) AS category_name
      FROM cafeteria_products
      WHERE category IS NOT NULL AND trim(category) <> ''
    ) existing_categories
    ON CONFLICT (slug) DO NOTHING;
  `);

  await pool.query(`
    UPDATE cafeteria_products product
    SET category_id = category.id
    FROM cafeteria_categories category
    WHERE product.category_id IS NULL
      AND product.category IS NOT NULL
      AND lower(trim(product.category)) = lower(trim(category.name));
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_supplies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      purchase_unit TEXT NOT NULL DEFAULT 'unidad',
      consumption_unit TEXT NOT NULL DEFAULT 'unidad',
      conversion_factor NUMERIC(14, 6) NOT NULL DEFAULT 1,
      track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
      track_expiration BOOLEAN NOT NULL DEFAULT FALSE,
      minimum_stock NUMERIC(14, 3),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at BIGINT NOT NULL,
      created_by INTEGER
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS inventory_supplies_active_category_idx
    ON inventory_supplies (active, category);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS inventory_supplies_name_idx
    ON inventory_supplies (lower(name));
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS supply_inventory_movements (
      id SERIAL PRIMARY KEY,
      supply_id INTEGER NOT NULL REFERENCES inventory_supplies(id),
      type TEXT NOT NULL,
      quantity_delta NUMERIC(14, 3) NOT NULL,
      occurred_at BIGINT NOT NULL,
      source_type TEXT,
      source_id TEXT,
      reason TEXT,
      created_by INTEGER,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS supply_inventory_movements_supply_occurred_idx
    ON supply_inventory_movements (supply_id, occurred_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS supply_purchases (
      id SERIAL PRIMARY KEY,
      request_key TEXT UNIQUE,
      received_at BIGINT NOT NULL,
      supplier TEXT,
      description TEXT,
      total_amount INTEGER NOT NULL,
      total_paid INTEGER,
      expense_id INTEGER,
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS supply_batches (
      id SERIAL PRIMARY KEY,
      supply_id INTEGER NOT NULL REFERENCES inventory_supplies(id),
      received_quantity NUMERIC(14, 3) NOT NULL,
      current_quantity NUMERIC(14, 3) NOT NULL,
      received_at BIGINT NOT NULL,
      expiration_date TEXT,
      lot_number TEXT,
      purchase_id INTEGER NOT NULL REFERENCES supply_purchases(id),
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS supply_batches_supply_expiration_idx
    ON supply_batches (supply_id, expiration_date, current_quantity);
  `);

  await pool.query(`
    ALTER TABLE supply_inventory_movements
    ADD COLUMN IF NOT EXISTS supply_batch_id INTEGER REFERENCES supply_batches(id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS supply_inventory_movements_batch_idx
    ON supply_inventory_movements (supply_batch_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS supply_purchase_items (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES supply_purchases(id),
      supply_id INTEGER NOT NULL REFERENCES inventory_supplies(id),
      supply_name_snapshot TEXT NOT NULL,
      purchase_unit_snapshot TEXT NOT NULL,
      consumption_unit_snapshot TEXT NOT NULL,
      conversion_factor_snapshot NUMERIC(14, 6) NOT NULL,
      purchased_quantity NUMERIC(14, 3) NOT NULL,
      converted_quantity NUMERIC(14, 3) NOT NULL,
      line_total INTEGER NOT NULL,
      expiration_date TEXT,
      lot_number TEXT,
      supply_batch_id INTEGER REFERENCES supply_batches(id),
      inventory_movement_id INTEGER REFERENCES supply_inventory_movements(id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS supply_purchase_items_purchase_idx
    ON supply_purchase_items (purchase_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS supply_purchases_received_idx
    ON supply_purchases (received_at, status);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_recipes (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES cafeteria_products(id),
      version INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      active BOOLEAN NOT NULL DEFAULT FALSE,
      target_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 60,
      created_at BIGINT NOT NULL,
      created_by INTEGER,
      updated_at BIGINT NOT NULL,
      updated_by INTEGER,
      activated_at BIGINT,
      activated_by INTEGER,
      UNIQUE (product_id, version)
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS product_recipes_one_active_idx
    ON product_recipes (product_id)
    WHERE active = TRUE;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS product_recipes_one_draft_idx
    ON product_recipes (product_id)
    WHERE status = 'DRAFT';
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS product_recipes_product_version_idx
    ON product_recipes (product_id, version DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_recipe_items (
      id SERIAL PRIMARY KEY,
      recipe_id INTEGER NOT NULL REFERENCES product_recipes(id) ON DELETE CASCADE,
      supply_id INTEGER NOT NULL REFERENCES inventory_supplies(id),
      supply_name_snapshot TEXT NOT NULL,
      quantity NUMERIC(14, 3) NOT NULL,
      unit_snapshot TEXT NOT NULL,
      waste_percent NUMERIC(6, 3) NOT NULL DEFAULT 0,
      notes TEXT,
      UNIQUE (recipe_id, supply_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS product_recipe_items_recipe_idx
    ON product_recipe_items (recipe_id);
  `);

  await pool.query(`
    ALTER TABLE supply_inventory_movements
    ADD COLUMN IF NOT EXISTS recipe_id INTEGER REFERENCES product_recipes(id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS supply_inventory_movements_source_idx
    ON supply_inventory_movements (source_type, source_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_accounts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      available_for_customer_payments BOOLEAN NOT NULL DEFAULT TRUE,
      reconciliation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL,
      created_by INTEGER
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_movements (
      id SERIAL PRIMARY KEY,
      financial_account_id INTEGER NOT NULL REFERENCES financial_accounts(id),
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      occurred_at BIGINT NOT NULL,
      description TEXT,
      source_type TEXT,
      source_id TEXT,
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS financial_movements_account_occurred_idx
    ON financial_movements (financial_account_id, occurred_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS financial_movements_type_idx
    ON financial_movements (type);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS financial_movements_occurred_idx
    ON financial_movements (occurred_at, status);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservation_payments (
      id SERIAL PRIMARY KEY,
      reservation_id INTEGER NOT NULL REFERENCES reservations(id),
      amount INTEGER NOT NULL,
      financial_account_id INTEGER NOT NULL REFERENCES financial_accounts(id),
      financial_movement_id INTEGER REFERENCES financial_movements(id),
      paid_at BIGINT NOT NULL,
      notes TEXT,
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      voided_at BIGINT,
      voided_by INTEGER,
      void_reason TEXT
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS reservation_payments_reservation_idx
    ON reservation_payments (reservation_id, paid_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS reservation_payments_financial_account_idx
    ON reservation_payments (financial_account_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS reservation_payments_paid_status_idx
    ON reservation_payments (paid_at, status);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS visit_accounts (
      id SERIAL PRIMARY KEY,
      reservation_id INTEGER REFERENCES reservations(id),
      display_name TEXT,
      location_label TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      opened_at BIGINT NOT NULL,
      closed_at BIGINT,
      opened_by INTEGER,
      closed_by INTEGER,
      close_reason TEXT,
      notes TEXT
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS visit_accounts_one_active_reservation_idx
    ON visit_accounts (reservation_id)
    WHERE reservation_id IS NOT NULL
      AND status IN ('OPEN', 'PARTIALLY_PAID', 'PAID');
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS visit_accounts_status_opened_idx
    ON visit_accounts (status, opened_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      visit_account_id INTEGER NOT NULL REFERENCES visit_accounts(id),
      product_id INTEGER NOT NULL REFERENCES cafeteria_products(id),
      product_name_snapshot TEXT NOT NULL,
      unit_price_snapshot INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      commercial_subtotal INTEGER NOT NULL,
      charged_subtotal INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'SALE',
      courtesy_reason TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at BIGINT NOT NULL,
      created_by INTEGER,
      cancelled_at BIGINT,
      cancelled_by INTEGER,
      cancel_reason TEXT
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS order_items_visit_status_idx
    ON order_items (visit_account_id, status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS order_items_created_status_idx
    ON order_items (created_at, status, type);
  `);

  await pool.query(`
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS recipe_id INTEGER REFERENCES product_recipes(id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_batches (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES cafeteria_products(id),
      received_quantity INTEGER NOT NULL,
      current_quantity INTEGER NOT NULL,
      received_at BIGINT NOT NULL,
      expiration_date TEXT NOT NULL,
      lot_number TEXT,
      purchase_id TEXT,
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS inventory_batches_product_expiration_idx
    ON inventory_batches (product_id, expiration_date, current_quantity);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES cafeteria_products(id),
      inventory_batch_id INTEGER REFERENCES inventory_batches(id),
      type TEXT NOT NULL,
      quantity_delta INTEGER NOT NULL,
      occurred_at BIGINT NOT NULL,
      source_type TEXT,
      source_id TEXT,
      reason TEXT,
      created_by INTEGER,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS inventory_batch_id INTEGER REFERENCES inventory_batches(id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS inventory_movements_product_occurred_idx
    ON inventory_movements (product_id, occurred_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS inventory_movements_source_idx
    ON inventory_movements (source_type, source_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS inventory_movements_occurred_idx
    ON inventory_movements (occurred_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_purchases (
      id SERIAL PRIMARY KEY,
      request_key TEXT UNIQUE,
      received_at BIGINT NOT NULL,
      supplier TEXT,
      description TEXT,
      total_paid INTEGER,
      expense_id INTEGER,
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_purchase_items (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES inventory_purchases(id),
      product_id INTEGER NOT NULL REFERENCES cafeteria_products(id),
      product_name_snapshot TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost INTEGER,
      line_total INTEGER,
      expiration_date TEXT,
      lot_number TEXT,
      inventory_batch_id INTEGER REFERENCES inventory_batches(id),
      inventory_movement_id INTEGER REFERENCES inventory_movements(id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS inventory_purchase_items_purchase_idx
    ON inventory_purchase_items (purchase_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS inventory_purchases_received_idx
    ON inventory_purchases (received_at, status);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_item_cost_snapshots (
      id SERIAL PRIMARY KEY,
      order_item_id INTEGER NOT NULL UNIQUE REFERENCES order_items(id),
      product_id INTEGER NOT NULL REFERENCES cafeteria_products(id),
      recipe_id INTEGER REFERENCES product_recipes(id),
      quantity INTEGER NOT NULL,
      commercial_unit_revenue INTEGER NOT NULL,
      unit_revenue INTEGER NOT NULL,
      total_revenue INTEGER NOT NULL,
      unit_cost INTEGER NOT NULL,
      total_cost INTEGER NOT NULL,
      gross_profit INTEGER NOT NULL,
      gross_margin NUMERIC(9, 4),
      costing_method TEXT NOT NULL,
      cost_incomplete BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS order_item_cost_snapshots_product_created_idx
    ON order_item_cost_snapshots (product_id, created_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_item_cost_components (
      id SERIAL PRIMARY KEY,
      snapshot_id INTEGER NOT NULL REFERENCES order_item_cost_snapshots(id) ON DELETE CASCADE,
      supply_id INTEGER REFERENCES inventory_supplies(id),
      product_id INTEGER REFERENCES cafeteria_products(id),
      supply_batch_id INTEGER REFERENCES supply_batches(id),
      inventory_batch_id INTEGER REFERENCES inventory_batches(id),
      quantity NUMERIC(14, 3) NOT NULL,
      unit_cost NUMERIC(14, 6),
      total_cost INTEGER NOT NULL,
      costing_method TEXT,
      cost_incomplete BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS order_item_cost_components_snapshot_idx
    ON order_item_cost_components (snapshot_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS audit_events_entity_idx
    ON audit_events (entity_type, entity_id, created_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS visit_payments (
      id SERIAL PRIMARY KEY,
      visit_account_id INTEGER NOT NULL REFERENCES visit_accounts(id),
      amount INTEGER NOT NULL,
      financial_account_id INTEGER NOT NULL REFERENCES financial_accounts(id),
      financial_movement_id INTEGER REFERENCES financial_movements(id),
      paid_at BIGINT NOT NULL,
      notes TEXT,
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      voided_at BIGINT,
      voided_by INTEGER,
      void_reason TEXT
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS visit_payments_visit_status_idx
    ON visit_payments (visit_account_id, status, paid_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS visit_payments_financial_account_idx
    ON visit_payments (financial_account_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS visit_payments_paid_status_idx
    ON visit_payments (paid_at, status);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES visit_payments(id),
      order_item_id INTEGER REFERENCES order_items(id),
      component TEXT,
      amount INTEGER NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS payment_allocations_payment_idx
    ON payment_allocations (payment_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS payment_allocations_order_item_idx
    ON payment_allocations (order_item_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      occurred_at BIGINT NOT NULL,
      notes TEXT,
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  await pool.query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS cost_center TEXT NOT NULL DEFAULT 'UNASSIGNED';
  `);
  await pool.query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS allocation_mode TEXT NOT NULL DEFAULT 'DIRECT';
  `);
  await pool.query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS allocation_percentage_rooms NUMERIC(5, 2);
  `);
  await pool.query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS allocation_percentage_cafeteria NUMERIC(5, 2);
  `);
  await pool.query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS allocation_percentage_admin NUMERIC(5, 2);
  `);
  await pool.query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS allocation_source TEXT NOT NULL DEFAULT 'DIRECT';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cost_allocation_rules (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      expense_category TEXT NOT NULL,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      rooms_percent NUMERIC(5, 2) NOT NULL,
      cafeteria_percent NUMERIC(5, 2) NOT NULL,
      admin_percent NUMERIC(5, 2) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at BIGINT NOT NULL,
      created_by INTEGER,
      updated_at BIGINT,
      updated_by INTEGER
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS cost_allocation_rules_lookup_idx
    ON cost_allocation_rules (expense_category, active, effective_from, effective_to);
  `);

  await pool.query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS allocation_rule_id INTEGER
      REFERENCES cost_allocation_rules(id);
  `);
  await pool.query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS allocation_rule_name_snapshot TEXT;
  `);
  await pool.query(`
    UPDATE expenses
    SET allocation_source = 'MANUAL'
    WHERE cost_center = 'MIXED'
      AND allocation_source = 'DIRECT';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expense_funding_allocations (
      id SERIAL PRIMARY KEY,
      expense_id INTEGER NOT NULL REFERENCES expenses(id),
      source_type TEXT NOT NULL,
      financial_account_id INTEGER REFERENCES financial_accounts(id),
      owner_name TEXT,
      contribution_kind TEXT,
      amount INTEGER NOT NULL,
      financial_movement_id INTEGER REFERENCES financial_movements(id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS expenses_occurred_idx
    ON expenses (occurred_at, status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS expenses_classification_idx
    ON expenses (cost_center, category, status);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS owner_contributions (
      id SERIAL PRIMARY KEY,
      financial_account_id INTEGER NOT NULL REFERENCES financial_accounts(id),
      owner_name TEXT,
      contribution_kind TEXT NOT NULL,
      amount INTEGER NOT NULL,
      occurred_at BIGINT NOT NULL,
      notes TEXT,
      financial_movement_id INTEGER REFERENCES financial_movements(id),
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_transfers (
      id SERIAL PRIMARY KEY,
      from_financial_account_id INTEGER NOT NULL REFERENCES financial_accounts(id),
      to_financial_account_id INTEGER NOT NULL REFERENCES financial_accounts(id),
      amount INTEGER NOT NULL,
      occurred_at BIGINT NOT NULL,
      notes TEXT,
      out_movement_id INTEGER REFERENCES financial_movements(id),
      in_movement_id INTEGER REFERENCES financial_movements(id),
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_closes (
      id SERIAL PRIMARY KEY,
      business_date TEXT NOT NULL UNIQUE,
      closed_at BIGINT NOT NULL,
      closed_by INTEGER,
      operational_income INTEGER NOT NULL DEFAULT 0,
      expenses_total INTEGER NOT NULL DEFAULT 0,
      owner_contributions_total INTEGER NOT NULL DEFAULT 0,
      courtesy_commercial_total INTEGER NOT NULL DEFAULT 0,
      visit_count INTEGER NOT NULL DEFAULT 0,
      open_visits_count INTEGER NOT NULL DEFAULT 0,
      pending_visits_count INTEGER NOT NULL DEFAULT 0,
      pending_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'CLOSED',
      notes TEXT,
      allow_open_balances BOOLEAN NOT NULL DEFAULT FALSE,
      allow_differences BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS account_reconciliations (
      id SERIAL PRIMARY KEY,
      daily_close_id INTEGER NOT NULL REFERENCES daily_closes(id),
      financial_account_id INTEGER NOT NULL REFERENCES financial_accounts(id),
      account_name_snapshot TEXT NOT NULL,
      expected_balance INTEGER NOT NULL,
      day_entries INTEGER NOT NULL DEFAULT 0,
      day_exits INTEGER NOT NULL DEFAULT 0,
      transfer_in_total INTEGER NOT NULL DEFAULT 0,
      transfer_out_total INTEGER NOT NULL DEFAULT 0,
      real_balance INTEGER NOT NULL,
      difference INTEGER NOT NULL,
      observation TEXT,
      adjustment_movement_id INTEGER REFERENCES financial_movements(id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS account_reconciliations_close_idx
    ON account_reconciliations (daily_close_id);
  `);

  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('cafeteria_products', 'id'),
      COALESCE((SELECT MAX(id) FROM cafeteria_products), 1),
      (SELECT MAX(id) IS NOT NULL FROM cafeteria_products)
    );
  `);
}

const ready = initSchema().catch((err) => {
  console.error("Failed to initialize Postgres schema", err);
  throw err;
});

async function query(text, params) {
  await ready;
  return pool.query(text, params);
}

module.exports = { query, pool, ready };
