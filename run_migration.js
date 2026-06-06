const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const SQL_PATH = path.join(__dirname, "supabase/migrations/20260602000001_find_or_create_dm.sql");
const PROJECT_REF = "gzyczowqqywesqhqqpdi";
const JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM";

async function main() {
  const sql = fs.readFileSync(SQL_PATH, "utf8");
  const client = new Client({
    user: "postgres",
    password: JWT,
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected. Running migration...");
  await client.query(sql);
  console.log("Migration applied successfully!");
  await client.end();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
