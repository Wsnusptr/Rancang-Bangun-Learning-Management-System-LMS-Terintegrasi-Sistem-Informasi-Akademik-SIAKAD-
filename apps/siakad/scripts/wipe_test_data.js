const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local to avoid dotenv dependency issues
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^#\s=]+)=(.+)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SAFETY GUARD
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Cannot run destructive scripts in production environment.');
  process.exit(1);
}

if (!process.argv.includes('--confirm')) {
  console.error('WARNING: This script will DESTROY database data (users, classes, enrollments).');
  console.error('To proceed, you must run this script with the --confirm flag:');
  console.error('node wipe_test_data.js --confirm');
  process.exit(1);
}
async function wipeData() {
  console.log('Starting data wipe process...');

  try {
    // 1. Clear enrollments and classes
    console.log('Clearing enrollments...');
    await supabase.from('enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Clearing classes...');
    await supabase.from('classes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Clear mahasiswa_baru and students reference tables
    console.log('Clearing mahasiswa_baru...');
    await supabase.from('mahasiswa_baru').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Clearing students...');
    await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Clear users from Auth and Profiles
    console.log('Fetching all users from Supabase Auth...');
    let { data: usersData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    
    if (authError) throw authError;
    
    const users = usersData.users;
    console.log(`Found ${users.length} users in Auth.`);

    // Also get profiles to know their roles if it's not perfectly in user_metadata
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, role');
    if (profileError) throw profileError;
    
    const profileRoleMap = new Map(profiles.map(p => [p.id, p.role]));

    let deletedCount = 0;

    for (const user of users) {
      const role = user.user_metadata?.role || profileRoleMap.get(user.id);
      
      // We only delete students and lecturers. Keep admin, staff, etc.
      if (role === 'student' || role === 'lecturer') {
        console.log(`Deleting ${role} user: ${user.email} (${user.id})`);
        
        // Delete from profiles first (if not cascading)
        await supabase.from('profiles').delete().eq('id', user.id);
        
        // Delete from auth
        const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
        if (delError) {
          console.error(`Failed to delete user ${user.email}:`, delError);
        } else {
          deletedCount++;
        }
      }
    }

    console.log(`\nWipe completed successfully! Deleted ${deletedCount} student/lecturer users.`);
  } catch (error) {
    console.error('An error occurred during the wipe process:', error);
  }
}

wipeData();
