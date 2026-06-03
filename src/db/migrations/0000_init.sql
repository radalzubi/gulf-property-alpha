CREATE TABLE IF NOT EXISTS "alerts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"alert_type" varchar(40),
	"listing_id" varchar(80),
	"asset_id" varchar(64),
	"severity" varchar(16),
	"title" text,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "areas" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emirate" varchar(32) NOT NULL,
	"master_community" text,
	"lat" double precision,
	"lng" double precision,
	"geom" geometry(Point,4326),
	"median_sale_psf" numeric,
	"median_rent_psf" numeric,
	"median_sale_price" numeric,
	"gross_yield" numeric,
	"net_yield" numeric,
	"annual_price_change_pct" numeric,
	"annual_rent_change_pct" numeric,
	"liquidity_score" integer,
	"vacancy_risk_score" integer,
	"tenant_demand_score" integer,
	"supply_pipeline_units" integer,
	"off_plan_share_pct" numeric,
	"txn_volume_12m" integer,
	"thesis" text,
	"risks" jsonb,
	"is_sample" boolean DEFAULT false NOT NULL,
	"field_provenance" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comps" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" varchar(80) NOT NULL,
	"comp_type" varchar(24),
	"comp_transaction_id" varchar(80),
	"distance_km" numeric,
	"same_building" boolean,
	"same_project" boolean,
	"same_area" boolean,
	"same_bedrooms" boolean,
	"same_property_type" boolean,
	"recency_days" integer,
	"similarity_score" numeric
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developers" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"official_id" text,
	"emirate" varchar(32) NOT NULL,
	"registration_status" text,
	"source_id" varchar(64),
	"website" text,
	"phone" text,
	"email" text,
	"completed_projects" integer,
	"active_projects" integer,
	"delivered_units" integer,
	"avg_delay_months" numeric,
	"avg_resale_premium_pct" numeric,
	"quality_score" integer,
	"delivery_risk_score" integer,
	"service_charge_risk_score" integer,
	"notes" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"confidence_score" numeric
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "government_rents" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"emirate" varchar(32) NOT NULL,
	"rent_date" timestamp with time zone NOT NULL,
	"area_id" varchar(64),
	"project_name" text,
	"building_name" text,
	"property_type" varchar(24),
	"annual_rent_aed" numeric,
	"size_sqft" numeric,
	"rent_per_sqft" numeric,
	"bedrooms" integer,
	"contract_type" varchar(16),
	"raw_json" jsonb,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "government_transactions" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"emirate" varchar(32) NOT NULL,
	"transaction_date" timestamp with time zone NOT NULL,
	"area_id" varchar(64),
	"project_name" text,
	"building_name" text,
	"property_type" varchar(24),
	"transaction_type" varchar(16),
	"ready_or_offplan" varchar(16),
	"price_aed" numeric,
	"size_sqft" numeric,
	"price_per_sqft" numeric,
	"bedrooms" integer,
	"raw_location" text,
	"official_reference" text,
	"raw_json" jsonb,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_type" varchar(24),
	"user_id" varchar(64),
	"raw_text" text,
	"accepted_rows" integer,
	"rejected_rows" integer,
	"errors_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ingestion_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"job_type" varchar(32) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"status" varchar(24) NOT NULL,
	"records_seen" integer DEFAULT 0,
	"records_inserted" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_rejected" integer DEFAULT 0,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_scores" (
	"listing_id" varchar(80) PRIMARY KEY NOT NULL,
	"estimated_market_value" numeric,
	"estimated_annual_rent" numeric,
	"estimated_gross_yield" numeric,
	"estimated_net_yield" numeric,
	"value_gap_percent" numeric,
	"price_score" integer,
	"yield_score" integer,
	"rent_demand_score" integer,
	"liquidity_score" integer,
	"developer_score" integer,
	"payment_plan_score" integer,
	"risk_score" integer,
	"confidence_score" integer,
	"total_deal_score" integer,
	"score_explanation_json" jsonb,
	"calculated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market_series" (
	"id" varchar(96) PRIMARY KEY NOT NULL,
	"emirate" varchar(32) NOT NULL,
	"area_id" varchar(64),
	"building_or_project" text,
	"metric_name" varchar(32) NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"value" numeric,
	"sample_size" integer,
	"source_id" varchar(64),
	"confidence_score" numeric
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "normalized_listings" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"source_class" varchar(32) NOT NULL,
	"external_listing_id" text,
	"canonical_property_id" text,
	"title" text NOT NULL,
	"description" text,
	"emirate" varchar(32) NOT NULL,
	"area_id" varchar(64),
	"neighborhood" text,
	"master_community" text,
	"building_name" text,
	"project_id" varchar(64),
	"developer_id" varchar(64),
	"property_type" varchar(24),
	"listing_type" varchar(16),
	"ready_or_offplan" varchar(16),
	"tenure" varchar(16),
	"bedrooms" integer,
	"bathrooms" integer,
	"size_sqft" numeric,
	"size_sqm" numeric,
	"asking_price_aed" numeric,
	"price_per_sqft" numeric,
	"furnishing_status" varchar(24),
	"occupancy_status" varchar(24),
	"service_charge_psf" numeric,
	"handover_date" timestamp with time zone,
	"lat" double precision,
	"lng" double precision,
	"geom" geometry(Point,4326),
	"address_text" text,
	"listing_url" text,
	"image_urls" jsonb,
	"agent_name" text,
	"agency_name" text,
	"public_phone" text,
	"public_email" text,
	"whatsapp" text,
	"listed_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now(),
	"last_seen_at" timestamp with time zone DEFAULT now(),
	"last_refreshed_at" timestamp with time zone DEFAULT now(),
	"status" varchar(16) DEFAULT 'active',
	"is_duplicate" boolean DEFAULT false,
	"duplicate_cluster_id" text,
	"price_history" jsonb,
	"reason_for_sale" jsonb,
	"has_payment_plan" boolean DEFAULT false,
	"is_sample" boolean DEFAULT false NOT NULL,
	"field_provenance" jsonb,
	"data_quality_score" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_plans" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"listing_id" varchar(80) NOT NULL,
	"plan_name" text,
	"down_payment_percent" numeric,
	"booking_amount" numeric,
	"during_construction_percent" numeric,
	"on_handover_percent" numeric,
	"post_handover_percent" numeric,
	"number_of_installments" integer,
	"raw_text" text,
	"normalized_schedule_json" jsonb,
	"confidence_score" numeric
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_assets" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"asset_name" text NOT NULL,
	"listing_id" varchar(80),
	"status" varchar(24),
	"emirate" varchar(32),
	"area_id" varchar(64),
	"building_or_project" text,
	"developer_id" varchar(64),
	"property_type" varchar(24),
	"size_sqft" numeric,
	"purchase_price_aed" numeric,
	"acquisition_date" timestamp with time zone,
	"current_estimated_value_aed" numeric,
	"annual_rent_aed" numeric,
	"occupancy_status" varchar(24),
	"lease_start" timestamp with time zone,
	"lease_end" timestamp with time zone,
	"mortgage_balance_aed" numeric,
	"interest_rate" numeric,
	"monthly_payment_aed" numeric,
	"service_charges_aed" numeric,
	"maintenance_aed" numeric,
	"management_fee_aed" numeric,
	"insurance_aed" numeric,
	"other_expenses_aed" numeric,
	"notes" text,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_cashflows" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"asset_id" varchar(64) NOT NULL,
	"date" timestamp with time zone,
	"cashflow_type" varchar(24),
	"amount_aed" numeric,
	"description" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"developer_id" varchar(64),
	"name" text NOT NULL,
	"emirate" varchar(32) NOT NULL,
	"area_id" varchar(64),
	"status" varchar(32),
	"launch_date" timestamp with time zone,
	"handover_date" timestamp with time zone,
	"project_type" varchar(24),
	"official_project_id" text,
	"lat" double precision,
	"lng" double precision,
	"geom" geometry(Point,4326),
	"is_sample" boolean DEFAULT false NOT NULL,
	"confidence_score" numeric
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raw_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"external_id" text,
	"raw_json" jsonb,
	"raw_hash" varchar(64),
	"first_seen_at" timestamp with time zone DEFAULT now(),
	"last_seen_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reason_for_sale" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" varchar(80) NOT NULL,
	"category" varchar(40),
	"confidence" varchar(16),
	"source_class" varchar(32),
	"evidence_json" jsonb,
	"explanation" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recommendation_profiles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64),
	"name" text NOT NULL,
	"description" text,
	"weights_json" jsonb,
	"filters_json" jsonb,
	"is_preset" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"source_type" varchar(24) NOT NULL,
	"source_class" varchar(32) NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"source_url_or_identifier" text,
	"refresh_frequency_minutes" integer,
	"status" varchar(24) DEFAULT 'not_configured' NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "watchlist_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"watchlist_id" varchar(64) NOT NULL,
	"listing_id" varchar(80) NOT NULL,
	"added_at" timestamp with time zone DEFAULT now(),
	"notes" text,
	"status" varchar(16)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "watchlists" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"criteria_json" jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "txn_area_idx" ON "government_transactions" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "txn_date_idx" ON "government_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listings_source_ext_idx" ON "normalized_listings" USING btree ("source_id","external_listing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_area_idx" ON "normalized_listings" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_emirate_idx" ON "normalized_listings" USING btree ("emirate");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "raw_records_source_hash_idx" ON "raw_records" USING btree ("source_id","raw_hash");