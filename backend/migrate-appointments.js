import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'medical-practice.db');
const db = new Database(dbPath);

console.log('🔧 Starting database migration for appointments...');

try {
  // Check if columns exist in appointments table
  const appointmentInfo = db.prepare("PRAGMA table_info(appointments)").all();
  const hasEmail = appointmentInfo.some(col => col.name === 'email');
  const hasIdNumber = appointmentInfo.some(col => col.name === 'idNumber');

  if (!hasEmail) {
    console.log('📝 Adding email column to appointments table...');
    db.exec('ALTER TABLE appointments ADD COLUMN email TEXT');
    console.log('✅ Email column added to appointments!');
  } else {
    console.log('✓ Email column already exists in appointments');
  }

  if (!hasIdNumber) {
    console.log('📝 Adding idNumber column to appointments table...');
    db.exec('ALTER TABLE appointments ADD COLUMN idNumber TEXT');
    console.log('✅ ID Number column added to appointments!');
  } else {
    console.log('✓ ID Number column already exists in appointments');
  }

  // Verify the changes
  const updatedInfo = db.prepare("PRAGMA table_info(appointments)").all();
  console.log('\n📊 Updated appointments table structure:');
  updatedInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

  console.log('\n🎉 Migration completed successfully!');
  console.log('💡 You can now use email and ID fields in appointments.\n');

} catch (err) {
  console.error('❌ Migration failed:', err);
} finally {
  db.close();
}