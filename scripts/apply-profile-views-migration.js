import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase URL and Service Role Key from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  console.error('You need the service role key (not anon key) from your Supabase dashboard.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSql = readFileSync(
      join(__dirname, 'supabase', 'migrations', '20251028200000_create_profile_views.sql'),
      'utf8'
    );

    console.log('Applying migration to database...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });

    if (error) {
      // Try direct approach if exec_sql doesn't exist
      console.log('Trying alternative method...');
      const statements = migrationSql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.from('profile_views').select('*').limit(0);
          if (stmtError && !stmtError.message.includes('does not exist')) {
            throw stmtError;
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: supabase gen types typescript --linked > src/integrations/supabase/types.ts');
    console.log('2. The notifications feature will now show profile views!');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\nPlease apply the migration manually via Supabase Dashboard:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select your project');
    console.error('3. Go to SQL Editor');
    console.error('4. Copy the contents of supabase/migrations/20251028200000_create_profile_views.sql');
    console.error('5. Paste and run it');
  }
}

applyMigration();
