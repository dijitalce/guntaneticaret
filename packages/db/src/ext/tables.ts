import { sql } from "drizzle-orm";
import { db } from "../client";

// Sunucuda migration elle çalıştırıldığı için ek tablolar ilk erişimde oluşturulur.
const TABLES = [
  sql`create table if not exists order_events (
    id bigint not null auto_increment primary key,
    order_id char(36) not null,
    kind varchar(32) not null,
    title varchar(255) not null,
    body text null,
    meta json null,
    actor varchar(191) null,
    created_at timestamp not null default current_timestamp,
    index order_events_order_idx (order_id, created_at)
  )`,
  sql`create table if not exists order_meta (
    order_id char(36) not null primary key,
    tags json null,
    updated_at timestamp not null default current_timestamp on update current_timestamp
  )`,
  sql`create table if not exists order_attribution (
    order_id char(36) not null primary key,
    session_id varchar(64) null,
    source varchar(64) null,
    medium varchar(64) null,
    campaign varchar(191) null,
    referrer varchar(512) null,
    landing varchar(512) null,
    device varchar(16) null,
    browser varchar(32) null,
    os varchar(32) null,
    pageviews int not null default 0,
    duration_sec int not null default 0,
    first_seen timestamp null,
    ip varchar(64) null,
    ua varchar(512) null,
    fbp varchar(128) null,
    fbc varchar(255) null,
    ga_cid varchar(64) null,
    journey json null,
    created_at timestamp not null default current_timestamp
  )`,
  sql`create table if not exists visitor_sessions (
    id varchar(64) not null primary key,
    tenant_id char(36) not null,
    customer_id char(36) null,
    first_seen timestamp not null default current_timestamp,
    last_seen timestamp not null default current_timestamp,
    pageviews int not null default 0,
    device varchar(16) null,
    browser varchar(32) null,
    os varchar(32) null,
    source varchar(64) null,
    medium varchar(64) null,
    campaign varchar(191) null,
    referrer varchar(512) null,
    landing varchar(512) null,
    last_path varchar(512) null,
    stage varchar(16) not null default 'browse',
    ip varchar(64) null,
    ua varchar(512) null,
    fbp varchar(128) null,
    fbc varchar(255) null,
    ga_cid varchar(64) null,
    city varchar(64) null,
    index visitor_sessions_seen_idx (last_seen),
    index visitor_sessions_tenant_idx (tenant_id, last_seen)
  )`,
  sql`create table if not exists visitor_events (
    id bigint not null auto_increment primary key,
    session_id varchar(64) not null,
    tenant_id char(36) not null,
    type varchar(24) not null,
    path varchar(512) null,
    title varchar(255) null,
    meta json null,
    created_at timestamp not null default current_timestamp,
    index visitor_events_created_idx (created_at),
    index visitor_events_session_idx (session_id, created_at)
  )`,
  sql`create table if not exists cart_contacts (
    cart_id char(36) not null primary key,
    tenant_id char(36) not null,
    email varchar(191) null,
    phone varchar(32) null,
    full_name varchar(191) null,
    session_id varchar(64) null,
    reminder_count int not null default 0,
    last_reminded_at timestamp null,
    recovered_order_id char(36) null,
    recovered_at timestamp null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp on update current_timestamp,
    index cart_contacts_email_idx (email)
  )`,
  sql`create table if not exists message_log (
    id char(36) not null primary key,
    channel varchar(8) not null,
    recipient varchar(191) not null,
    subject varchar(255) null,
    template_key varchar(64) null,
    campaign_id char(36) null,
    tenant_id char(36) null,
    related_type varchar(32) null,
    related_id varchar(64) null,
    status varchar(16) not null default 'sent',
    error text null,
    provider varchar(32) null,
    opened_at timestamp null,
    clicked_at timestamp null,
    created_at timestamp not null default current_timestamp,
    index message_log_campaign_idx (campaign_id, status),
    index message_log_created_idx (created_at),
    index message_log_related_idx (related_type, related_id),
    index message_log_recipient_idx (recipient)
  )`,
  sql`create table if not exists campaigns (
    id char(36) not null primary key,
    tenant_id char(36) null,
    name varchar(255) not null,
    channel varchar(8) not null default 'email',
    segment_key varchar(64) not null default 'all',
    subject varchar(255) null,
    preheader varchar(255) null,
    body mediumtext null,
    coupon_code varchar(64) null,
    status varchar(16) not null default 'draft',
    total int not null default 0,
    sent int not null default 0,
    failed int not null default 0,
    scheduled_at timestamp null,
    started_at timestamp null,
    finished_at timestamp null,
    created_by varchar(191) null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp on update current_timestamp
  )`,
  sql`create table if not exists popups (
    id char(36) not null primary key,
    tenant_id char(36) null,
    name varchar(255) not null,
    kind varchar(16) not null default 'newsletter',
    title varchar(255) not null,
    body text null,
    image_url text null,
    cta_text varchar(64) null,
    cta_url varchar(512) null,
    coupon_code varchar(64) null,
    trigger_type varchar(16) not null default 'delay',
    delay_sec int not null default 5,
    scroll_pct int not null default 50,
    pages varchar(16) not null default 'all',
    device varchar(8) not null default 'all',
    frequency_days int not null default 7,
    is_active tinyint not null default 0,
    starts_at timestamp null,
    ends_at timestamp null,
    views int not null default 0,
    clicks int not null default 0,
    leads int not null default 0,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp on update current_timestamp
  )`,
  sql`create table if not exists marketing_contacts (
    email varchar(191) not null primary key,
    tenant_id char(36) null,
    full_name varchar(191) null,
    phone varchar(32) null,
    source varchar(32) null,
    popup_id char(36) null,
    unsubscribed_at timestamp null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp on update current_timestamp
  )`,
  sql`create table if not exists stock_alerts (
    id bigint not null auto_increment primary key,
    tenant_id char(36) not null,
    product_id char(36) not null,
    email varchar(191) not null,
    created_at timestamp not null default current_timestamp,
    notified_at timestamp null,
    unique key stock_alerts_uidx (product_id, email)
  )`,
  sql`create table if not exists customer_meta (
    customer_id char(36) not null primary key,
    tags json null,
    note text null,
    is_blocked tinyint not null default 0,
    updated_at timestamp not null default current_timestamp on update current_timestamp
  )`,
  sql`create table if not exists admin_user_meta (
    admin_user_id char(36) not null primary key,
    role varchar(24) not null default 'admin',
    phone varchar(32) null,
    title varchar(128) null,
    last_login_at timestamp null,
    last_login_ip varchar(64) null,
    updated_at timestamp not null default current_timestamp on update current_timestamp
  )`,
  sql`create table if not exists coupon_meta (
    coupon_id char(36) not null primary key,
    description varchar(255) null,
    starts_at timestamp null,
    ends_at timestamp null,
    usage_limit int null,
    used_count int not null default 0,
    updated_at timestamp not null default current_timestamp on update current_timestamp
  )`,
  sql`create table if not exists automation_runs (
    id bigint not null auto_increment primary key,
    automation varchar(32) not null,
    processed int not null default 0,
    sent int not null default 0,
    note text null,
    created_at timestamp not null default current_timestamp,
    index automation_runs_idx (automation, created_at)
  )`,
];

const CUSTOMER_COLUMNS = [
  sql`alter table customers add column invoice_type varchar(32) not null default 'individual'`,
  sql`alter table customers add column company_name varchar(255) null`,
  sql`alter table customers add column tax_office varchar(128) null`,
  sql`alter table customers add column tax_number varchar(64) null`,
  sql`alter table customers add column national_id varchar(32) null`,
  sql`alter table customer_addresses add column kind varchar(32) not null default 'shipping'`,
];

let ensured: Promise<void> | null = null;

export function ensureExtTables(): Promise<void> {
  ensured ??= (async () => {
    for (const statement of TABLES) await db.execute(statement);
    for (const statement of CUSTOMER_COLUMNS) {
      try {
        await db.execute(statement);
      } catch (err) {
        const e = err as { errno?: number; code?: string; cause?: { errno?: number; code?: string } };
        const code = e.code ?? e.cause?.code;
        const errno = e.errno ?? e.cause?.errno;
        if (errno !== 1060 && code !== "ER_DUP_FIELDNAME") throw err;
      }
    }
  })().catch((err) => {
    ensured = null;
    throw err;
  });
  return ensured;
}
