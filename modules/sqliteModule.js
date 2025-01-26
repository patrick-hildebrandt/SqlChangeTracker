import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import sqliteConfig from '../config/sqliteConfig.js';

const sqliteModule = {
    db: null,

    init: async function() {
        try {
            this.db = await open({
                filename: sqliteConfig.filename,
                driver: sqlite3.Database
            });
            console.log('SQLite Verbindung hergestellt');
            await this.createChangesTableIfNotExists();
            await this.initChangeTracking();
        } catch (error) {
            console.error('Fehler beim Initialisieren der SQLite-DB:', error);
            throw error;
        }
    },

    createChangesTableIfNotExists: async function() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT,
                change_type TEXT,
                change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                changed_by TEXT DEFAULT 'system',
                details TEXT
            )
        `);
    },

    dropExistingTriggers: async function() {
        try {
            const triggers = await this.db.all(`
                SELECT name FROM sqlite_master 
                WHERE type='trigger' 
                AND name LIKE 'track_%'
            `);
            
            for (const trigger of triggers) {
                await this.db.exec(`DROP TRIGGER IF EXISTS ${trigger.name}`);
                console.log('Trigger entfernt:', trigger.name);
            }
        } catch (error) {
            console.error('Fehler beim Entfernen der Trigger:', error);
            throw error;
        }
    },

    initChangeTracking: async function() {
        try {
            await this.dropExistingTriggers();
            
            const tables = await this.db.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                AND name NOT IN ('sqlite_sequence', 'changes')
            `);

            for (const table of tables) {
                await this.db.exec(`
                    CREATE TRIGGER IF NOT EXISTS track_inserts_${table.name} 
                    AFTER INSERT ON ${table.name}
                    BEGIN
                        INSERT INTO changes (table_name, change_type, details) 
                        SELECT 
                            '${table.name}',
                            'INSERT',
                            json_object(${await this.getColumnsList(table.name, 'NEW')});
                    END;
                    
                    CREATE TRIGGER IF NOT EXISTS track_updates_${table.name} 
                    AFTER UPDATE ON ${table.name}
                    WHEN json_object(${await this.getColumnsList(table.name, 'OLD')}) != json_object(${await this.getColumnsList(table.name, 'NEW')})
                    BEGIN
                        INSERT INTO changes (table_name, change_type, details)
                        SELECT 
                            '${table.name}',
                            'UPDATE',
                            json_object(
                                'old_values', json_object(${await this.getColumnsList(table.name, 'OLD')}),
                                'new_values', json_object(${await this.getColumnsList(table.name, 'NEW')})
                            );
                    END;
                    
                    CREATE TRIGGER IF NOT EXISTS track_deletes_${table.name} 
                    AFTER DELETE ON ${table.name}
                    BEGIN
                        INSERT INTO changes (table_name, change_type, details)
                        SELECT 
                            '${table.name}',
                            'DELETE',
                            json_object(${await this.getColumnsList(table.name, 'OLD')});
                    END;
                `);
                console.log('Trigger für Änderungsverfolgung erstellt:', table.name);
            }
        } catch (error) {
            console.error('Fehler beim Erstellen der Trigger:', error);
            throw error;
        }
    },

    getColumnsList: async function(tableName, prefix = 'NEW') {
        const columns = await this.db.all(`PRAGMA table_info('${tableName}')`);
        return columns
            .map(col => `'${col.name}', CASE 
                WHEN typeof(${prefix}.${col.name}) = 'text' THEN json_quote(${prefix}.${col.name})
                WHEN ${prefix}.${col.name} IS NULL THEN 'null'
                ELSE CAST(${prefix}.${col.name} AS TEXT)
            END`)
            .join(',');
    },

    trackChanges: async function(callback) {
        if (!this.db) {
            await this.init();
            await this.initChangeTracking();
        }

        setInterval(async () => {
            const lastCheck = new Date();
            lastCheck.setSeconds(lastCheck.getSeconds() - 5);

            const changes = await this.db.all(`
                SELECT * FROM changes 
                WHERE change_date > datetime(?)
                ORDER BY change_date DESC
            `, [lastCheck.toISOString()]);

            if (changes.length > 0) {
                callback(changes);
            }
        }, 2000);
    },

    getAllChanges: async function() {
        if (!this.db) {
            await this.init();
        }
        return await this.db.all('SELECT * FROM changes ORDER BY change_date DESC');
    }
};

export default sqliteModule;