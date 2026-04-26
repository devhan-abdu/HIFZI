import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const sora = sqliteTable('sora', {
  soraid: integer('soraid').primaryKey(),
  name: text('name'),
  nameEnglish: text('name_english'),
  place: integer('place'),
});

export const aya = sqliteTable('aya', {
  soraid: integer('soraid').notNull(),
  ayaid: integer('ayaid').notNull(),
  page: integer('page'),
  quarter: integer('quarter'),
  hezb: integer('hezb'),
  joza: integer('joza'),
  sajda: integer('sajda'),
  text: text('text'),
  uthmanitext: integer('uthmanitext'),
  searchtext: integer('searchtext'),
  quarterstart: integer('quarterstart'),
}, (table) => ({
  pk: primaryKey({ columns: [table.soraid, table.ayaid] }),
  idxAyaPage: index('idx_aya_page').on(table.page),
  idxAyaJoza: index('idx_aya_joza').on(table.joza),
  idxAyaSura: index('idx_aya_sura').on(table.soraid),
}));

export const ayahBbox = sqliteTable('ayah_bbox', {
  sura: integer('sura'),
  ayah: integer('ayah'),
  minX: integer('min_x'),
  maxX: integer('max_x'),
  minY: integer('min_y'),
  maxY: integer('max_y'),
  page: integer('page'),
}, (table) => ({
  idxAyahBboxPage: index('idx_ayah_bbox_page').on(table.page),
  idxPageSura: index('idx_page_sura').on(table.page, table.sura),
}));
