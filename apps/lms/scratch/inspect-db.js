const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('--- DIAGNOSTIC DB INSPECTOR ---');
  
  // 1. Get all lecturers
  console.log('\n--- Profiles (role = lecturer) ---');
  const { data: lecturers, error: lecErr } = await supabase
    .from('profiles')
    .select('id, name, role, email')
    .eq('role', 'lecturer');
  if (lecErr) console.error('Error fetching lecturers:', lecErr);
  else console.log(lecturers);

  // 2. Get all classes
  console.log('\n--- Classes ---');
  const { data: classes, error: clsErr } = await supabase
    .from('classes')
    .select('id, class_name, class_code, lecturer_id');
  if (clsErr) console.error('Error fetching classes:', clsErr);
  else console.log(classes);

  // 3. Get all assignments
  console.log('\n--- Assignments ---');
  const { data: assignments, error: asmErr } = await supabase
    .from('assignments')
    .select('id, title, class_id, type, is_published, created_at');
  if (asmErr) console.error('Error fetching assignments:', asmErr);
  else console.log(assignments);

  // 4. Get all submissions
  console.log('\n--- Submissions ---');
  const { data: submissions, error: subErr } = await supabase
    .from('submissions')
    .select('id, assignment_id, student_id, status, score');
  if (subErr) console.error('Error fetching submissions:', subErr);
  else console.log(submissions);
}

main().catch(console.error);
