import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'medical-practice.db');
const db = new Database(dbPath);

const commands = {
  // View all appointments
  viewAppointments: () => {
    const appointments = db.prepare('SELECT * FROM appointments').all();
    console.log('\n📅 Appointments:');
    console.table(appointments);
  },

  // View all inventory
  viewInventory: () => {
    const inventory = db.prepare('SELECT * FROM inventory').all();
    console.log('\n📦 Inventory:');
    console.table(inventory);
  },

  // View all medical records
  viewMedicalRecords: () => {
    const records = db.prepare('SELECT id, patientName, diagnosis, createdAt FROM medical_records').all();
    console.log('\n🏥 Medical Records:');
    console.table(records);
  },

  // Database statistics
  stats: () => {
    const appointmentCount = db.prepare('SELECT COUNT(*) as count FROM appointments').get();
    const inventoryCount = db.prepare('SELECT COUNT(*) as count FROM inventory').get();
    const recordCount = db.prepare('SELECT COUNT(*) as count FROM medical_records').get();
    const inventoryValue = db.prepare('SELECT SUM(quantity * price) as total FROM inventory').get();

    console.log('\n📊 Database Statistics:');
    console.log('─────────────────────────────');
    console.log(`Appointments: ${appointmentCount.count}`);
    console.log(`Inventory Items: ${inventoryCount.count}`);
    console.log(`Medical Records: ${recordCount.count}`);
    console.log(`Total Inventory Value: $${inventoryValue.total?.toFixed(2) || '0.00'}`);
    console.log('─────────────────────────────\n');
  },

  // Backup database
  backup: () => {
    const backupDir = join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `backup-${timestamp}.db`);

    db.backup(backupPath)
      .then(() => {
        console.log(`✅ Backup created: ${backupPath}`);
      })
      .catch((err) => {
        console.error('❌ Backup failed:', err);
      });
  },

  // Reset database (DANGEROUS - removes all data)
  reset: () => {
    console.log('⚠️  WARNING: This will delete ALL data!');
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Type "CONFIRM" to proceed: ', (answer) => {
      if (answer === 'CONFIRM') {
        db.exec('DELETE FROM medical_records');
        db.exec('DELETE FROM appointments');
        db.exec('DELETE FROM inventory');
        db.exec('DELETE FROM sqlite_sequence'); // Reset auto-increment
        console.log('✅ Database reset complete');
      } else {
        console.log('❌ Reset cancelled');
      }
      readline.close();
      db.close();
    });
  },

  // Export to JSON
  exportJson: () => {
    const data = {
      appointments: db.prepare('SELECT * FROM appointments').all(),
      inventory: db.prepare('SELECT * FROM inventory').all(),
      medicalRecords: db.prepare('SELECT * FROM medical_records').all(),
      exportedAt: new Date().toISOString()
    };

    const exportPath = join(__dirname, `export-${Date.now()}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
    console.log(`✅ Data exported to: ${exportPath}`);
  },

  // Help
  help: () => {
    console.log('\n📚 Available Commands:');
    console.log('─────────────────────────────');
    console.log('node db-manager.js appointments  - View all appointments');
    console.log('node db-manager.js inventory     - View all inventory');
    console.log('node db-manager.js records       - View all medical records');
    console.log('node db-manager.js stats         - Show database statistics');
    console.log('node db-manager.js backup        - Create database backup');
    console.log('node db-manager.js export        - Export data to JSON');
    console.log('node db-manager.js reset         - Reset database (DANGEROUS)');
    console.log('node db-manager.js help          - Show this help');
    console.log('─────────────────────────────\n');
  }
};

// Parse command line arguments
const command = process.argv[2];

switch (command) {
  case 'appointments':
    commands.viewAppointments();
    db.close();
    break;
  case 'inventory':
    commands.viewInventory();
    db.close();
    break;
  case 'records':
    commands.viewMedicalRecords();
    db.close();
    break;
  case 'stats':
    commands.stats();
    db.close();
    break;
  case 'backup':
    commands.backup();
    setTimeout(() => db.close(), 1000);
    break;
  case 'export':
    commands.exportJson();
    db.close();
    break;
  case 'reset':
    commands.reset();
    break;
  case 'help':
  default:
    commands.help();
    db.close();
    break;
}