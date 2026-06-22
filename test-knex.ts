import { db } from './src/db/db';

async function main() {
    try {
        const [tables] = await db.raw('SHOW TABLES');
        console.log("Tables result:", tables);
        for (const tableObj of (tables as any[])) {
            const tableName = Object.values(tableObj)[0];
            console.log("Table Name:", tableName);
            const [createTableRows] = await db.raw(`SHOW CREATE TABLE \`${tableName}\``);
            console.log("Create Table:", createTableRows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        db.destroy();
    }
}

main();
