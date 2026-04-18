require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  console.log("🚀 Starting storage verification test...");
  
  const testFile = Buffer.from("Verification Test Content");
  const fileName = `verification_${Date.now()}.txt`;
  
  console.log(`Attempting to upload: ${fileName}`);
  
  const { data, error } = await supabase.storage
    .from('user-files')
    .upload(`test_debug/${fileName}`, testFile, {
      contentType: 'text/plain',
      upsert: true
    });

  if (error) {
    console.error("❌ Upload failed!");
    console.error("Error Message:", error.message);
    process.exit(1);
  } else {
    console.log("✅ Upload successful!");
    process.exit(0);
  }
}

verify();
