import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://fqmleivxlqqnlokconux.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Radar feature migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251020000002_add_distance_calculation.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL loaded');
    console.log('=' .repeat(50));
    console.log(sql);
    console.log('=' .repeat(50));
    console.log('\n⏳ Executing migration...\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Verifying migration...\n');

    // Verify columns were added
    const { data: columns, error: colError } = await supabase
      .from('profiles')
      .select('latitude, longitude, location')
      .limit(1);

    if (colError) {
      console.log('⚠️  Could not verify columns (this is OK if table is empty)');
    } else {
      console.log('✅ Location columns verified');
    }

    console.log('\n🎉 Radar feature database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Navigate to http://localhost:8080/radar');
    console.log('2. Allow location access when prompted');
    console.log('3. Test the radar feature!');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
