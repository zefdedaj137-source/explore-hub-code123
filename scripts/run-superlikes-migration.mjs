// Run Superlikes System Migration
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_PROJECT_REF = 'fqmleivxlqqnlokconux';
const SUPABASE_ACCESS_TOKEN = 'sbp_14a15cab79039b6bf12c6e1258526f41f408290a';

async function runMigration() {
  console.log('🚀 Setting up Superlikes system...\n');

  try {
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251020000004_add_superlikes_system.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...\n');

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Superlikes system is now active!\n');
    console.log('Features added:');
    console.log('  • Premium users get 5 free superlikes per month');
    console.log('  • Non-premium users can purchase superlikes (€3 each)');
    console.log('  • Superlike tracking and management\n');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
