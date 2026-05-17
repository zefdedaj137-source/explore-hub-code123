#!/usr/bin/env node
// Usage: npm run db:new -- my_migration_name
import { writeFileSync } from "fs";
import { join } from "path";

const name = process.argv[2];
if (!name) {
  console.error("Usage: npm run db:new -- <migration_name>");
  process.exit(1);
}

const sanitized = name.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
const timestamp = new Date()
  .toISOString()
  .replace(/[-:T]/g, "")
  .slice(0, 14);

const filename = `${timestamp}_${sanitized}.sql`;
const filepath = join("supabase", "migrations", filename);

writeFileSync(
  filepath,
  `-- Description: ${name}\n-- Created: ${new Date().toISOString()}\n\n`
);

console.log(`Created migration: ${filepath}`);
