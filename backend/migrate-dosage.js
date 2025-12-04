import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'medical-practice.db');
const db = new Database(dbPath);

console.log('🔧 Starting database migration...');

try {
  // Check if dosage column exists
  const tableInfo = db.prepare("PRAGMA table_info(inventory)").all();
  const hasDosage = tableInfo.some(col => col.name === 'dosage');
  const hasUnit = tableInfo.some(col => col.name === 'unit');

  if (!hasDosage) {
    console.log('📝 Adding dosage column to inventory table...');
    db.exec('ALTER TABLE inventory ADD COLUMN dosage TEXT');
    console.log('✅ Dosage column added successfully!');
  } else {
    console.log('✓ Dosage column already exists');
  }

  if (!hasUnit) {
    console.log('📝 Adding unit column to inventory table...');
    db.exec('ALTER TABLE inventory ADD COLUMN unit TEXT DEFAULT "mg"');
    console.log('✅ Unit column added successfully!');
  } else {
    console.log('✓ Unit column already exists');
  }

  // Verify the changes
  const updatedTableInfo = db.prepare("PRAGMA table_info(inventory)").all();
  console.log('\n📊 Updated table structure:');
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

  console.log('\n🎉 Migration completed successfully!');
  console.log('💡 You can now restart your server and add inventory items.\n');

} catch (err) {
  console.error('❌ Migration failed:', err);
} finally {
  db.close();
}