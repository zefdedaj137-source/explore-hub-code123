// Run Updated Distance Function Migration
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_PROJECT_REF = 'fqmleivxlqqnlokconux';
const SUPABASE_ACCESS_TOKEN = 'sbp_14a15cab79039b6bf12c6e1258526f41f408290a';

async function runMigration() {
  console.log('🚀 Updating calculate_distance function...\n');

  try {
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251020000003_update_distance_function.sql');
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
    console.log('📊 The calculate_distance function now returns full profile data!\n');
    console.log('🎉 Radar feature enhanced with complete profile information!\n');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
