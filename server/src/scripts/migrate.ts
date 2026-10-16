import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "../db/pool";

async function main() {
    const sql = readFileSync(join(import.meta.dirname, "../db/schema.sql"), "utf8");
    await pool.query(sql);
    console.log("Schema applied");
}

main()
    .catch((err) => {
        console.error("Migration failed:", err.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());