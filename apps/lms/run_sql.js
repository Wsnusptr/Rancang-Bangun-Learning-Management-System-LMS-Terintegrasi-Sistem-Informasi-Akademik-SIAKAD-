const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const sql = fs.readFileSync('create_submissions_bucket.sql', 'utf8');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error && error.message.includes('Could not find the function')) {
    const { data: data2, error: err2 } = await supabase.rpc('exec_sql', { sql });
    console.log('Result2:', data2, err2);
  } else {
    console.log('Result:', data, error);
  }
}
run();
