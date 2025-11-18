// Run Radar Migration
// This script executes the database migration for the Radar feature

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase project details
const SUPABASE_PROJECT_REF = 'fqmleivxlqqnlokconux';
const SUPABASE_ACCESS_TOKEN = 'sbp_14a15cab79039b6bf12c6e1258526f41f408290a';

async function runMigration() {
  console.log('🚀 Starting Radar feature migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251020000002_add_distance_calculation.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...\n');

    // Execute SQL using Supabase Management API
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
    console.log('Result:', result);
    
    console.log('\n🎉 Radar feature database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Navigate to http://localhost:8080/radar');
    console.log('2. Allow location access when prompted');
    console.log('3. Test the radar feature!\n');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
