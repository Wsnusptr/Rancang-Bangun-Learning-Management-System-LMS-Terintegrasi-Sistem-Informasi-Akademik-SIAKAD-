const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery() {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
        id, title, description, type, due_date, created_at, is_published,
        max_score, class_id, updated_at,
        submissions (
          id, student_id, submitted_at, score, final_score, status, is_late,
          profiles!submissions_student_id_fkey ( id, name, nim, avatar_url )
        )
    `)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('ERROR1:', error);
  } else {
    console.log('SUCCESS1:', JSON.stringify(data, null, 2));
  }
}

testQuery();
