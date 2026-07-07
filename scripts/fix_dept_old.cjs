const { createClient } = require('@libsql/client');
const c = createClient({
  url: 'libsql://dfcl-it-akash9090.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM0MTQ4NDIsImlkIjoiMDE5ZjM3MjAtYzQwMS03MzU2LWFhZGUtMmRhN2UyZGUwZGEzIiwia2lkIjoiOUFVSUQtdi1kNGZiVFF5MjRSVHBnMGVoTU53X0otRUgwVVliMFBJUDcwTSIsInJpZCI6ImJmNDJiNTlmLTJmZDgtNDhkMy04M2FhLWYwZTEwMWJlM2M1MCJ9.gAoeMFDh2nIbxkdEwmZDr2et_PRd3gEt7otqkEyB5UrNw9w96R7_ZRrhAyPShxigSPa9NIXLkBrJy15anmNNDQ',
});

(async () => {
  // Find which tables reference Department_old
  console.log('=== Tables with FK to Department_old ===');
  const tables = await c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");
  for (const t of tables.rows) {
    const fks = await c.execute('PRAGMA foreign_key_list(' + t.name + ')');
    for (const fk of fks.rows) {
      if (fk.table === 'Department_old') {
        console.log('  ' + t.name + '.' + fk.from + ' -> Department_old.' + fk.to);
      }
    }
  }

  // Employee table likely has departmentId -> Department_old
  // Let's recreate Employee with correct FK to Department
  console.log('\n=== Fixing Employee table FK ===');
  const empCols = await c.execute('PRAGMA table_info(Employee)');
  console.log('Employee columns:', empCols.rows.map(r => r.name).join(', '));

  // Backup Employee data
  const backup = await c.execute('SELECT * FROM Employee');
  console.log('Backed up', backup.rows.length, 'employees');

  // Drop and recreate Employee with correct FK
  await c.execute('DROP TABLE Employee');
  await c.execute(`CREATE TABLE Employee (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    employeeCode TEXT NOT NULL,
    designation TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    departmentId TEXT,
    entityId TEXT NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (departmentId) REFERENCES Department(id) ON DELETE SET NULL,
    FOREIGN KEY (entityId) REFERENCES Entity(id) ON DELETE RESTRICT
  )`);
  await c.execute('CREATE UNIQUE INDEX Employee_employeeCode_idx ON Employee(employeeCode)');
  await c.execute('CREATE INDEX Employee_entityId_idx ON Employee(entityId)');
  await c.execute('CREATE INDEX Employee_departmentId_idx ON Employee(departmentId)');

  // Restore data
  for (const row of backup.rows) {
    const cols = empCols.rows.map(r => r.name);
    const newCols = await c.execute('PRAGMA table_info(Employee)');
    const newColNames = newCols.rows.map(r => r.name);
    const common = cols.filter(c => newColNames.includes(c));
    const placeholders = common.map(() => '?').join(', ');
    const values = common.map(c => row[c]);
    await c.execute({
      sql: 'INSERT INTO Employee (' + common.join(', ') + ') VALUES (' + placeholders + ')',
      args: values
    });
  }
  const restored = await c.execute('SELECT COUNT(*) as cnt FROM Employee');
  console.log('✓ Restored', restored.rows[0].cnt, 'employees');

  // Now try to drop Department_old
  console.log('\n=== Drop Department_old ===');
  try {
    await c.execute('DROP TABLE Department_old');
    console.log('✓ Dropped');
  } catch (e) {
    console.log('Still cannot drop:', e.message);
    // Check for more references
    const tables2 = await c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");
    for (const t of tables2.rows) {
      const fks = await c.execute('PRAGMA foreign_key_list(' + t.name + ')');
      for (const fk of fks.rows) {
        if (fk.table === 'Department_old') {
          console.log('  Still referenced by: ' + t.name + '.' + fk.from);
        }
      }
    }
  }

  // Final check: any remaining *_old tables?
  console.log('\n=== Final check for *_old tables ===');
  const old = await c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_old'");
  if (old.rows.length === 0) {
    console.log('✓ No *_old tables remaining — database is clean!');
  } else {
    console.log('Remaining:', old.rows.map(r => r.name).join(', '));
  }
})();
