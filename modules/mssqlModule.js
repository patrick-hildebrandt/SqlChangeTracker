import sql from 'mssql';
import mssqlConfig from '../config/mssqlConfig.js';

const mssqlModule = {
    pool: null,
    
    async init() {
        try {
            if (!this.pool) {
                this.pool = await sql.connect(mssqlConfig);
                await this.createChangesTable();
                await this.initChangeTracking();
            }
        } catch (error) {
            console.error('MSSQL Init Fehler:', error);
            throw error;
        }
    },

    async createChangesTable() {
        await this.pool.request().query(`
            USE [${mssqlConfig.database}];
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[changes]') AND type in (N'U'))
            BEGIN
                CREATE TABLE changes (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    table_name NVARCHAR(128),
                    change_type NVARCHAR(10),
                    change_date DATETIME DEFAULT GETDATE(),
                    changed_by NVARCHAR(128) DEFAULT SYSTEM_USER,
                    details NVARCHAR(MAX)
                )
            END
        `);
    },

    async getAllChanges() {
        if (!this.pool) {
            await this.init();
        }
        const result = await this.pool.request().query(`
            USE [${mssqlConfig.database}];
            SELECT * FROM changes ORDER BY change_date DESC
        `);
        return result.recordset;
    },

    async dropExistingTriggers() {
        const result = await this.pool.request().query(`
            USE [${mssqlConfig.database}];
            SELECT name FROM sys.triggers 
            WHERE name LIKE 'track_%'
        `);
        
        for (const trigger of result.recordset) {
            await this.pool.request().query(`DROP TRIGGER IF EXISTS ${trigger.name}`);
            console.log('Trigger entfernt:', trigger.name);
        }
    },

    async getColumnsList(tableName, prefix = 'INSERTED') {
        const result = await this.pool.request().query(`
            USE [${mssqlConfig.database}];
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${tableName}'
        `);
        return result.recordset
            .map(col => `'${col.COLUMN_NAME}', ${prefix}.${col.COLUMN_NAME}`)
            .join(',');
    },

    async getUpdateableColumns(tableName) {
        const result = await this.pool.request()
            .input('tableName', sql.NVarChar, tableName)
            .query(`
                USE [${mssqlConfig.database}];
                SELECT c.COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN sys.computed_columns cc 
                    ON OBJECT_NAME(cc.object_id) = c.TABLE_NAME 
                    AND cc.name = c.COLUMN_NAME
                WHERE c.TABLE_NAME = @tableName
                AND cc.object_id IS NULL
                AND c.DATA_TYPE NOT IN ('text', 'ntext', 'image')
            `);
        return result.recordset;
    },

    async initChangeTracking() {
        try {
            await this.dropExistingTriggers();

            const tables = await this.pool.request().query(`
                USE [${mssqlConfig.database}];
                SELECT TABLE_NAME as name
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
                AND TABLE_NAME != 'changes'
            `);

            for (const table of tables.recordset) {
                const columnsResult = await this.pool.request().query(`
                    USE [${mssqlConfig.database}];
                    SELECT '[' + c.name + ']' AS col
                    FROM sys.columns c
                    JOIN sys.types t ON c.user_type_id = t.user_type_id
                    WHERE c.object_id = OBJECT_ID('${table.name}')
                      AND t.name NOT IN ('text','ntext','image')
                `);
                const cols = columnsResult.recordset.map(r => r.col).join(', ');

                await this.pool.request().query(`
                    CREATE TRIGGER [track_${table.name}]
                    ON [${table.name}]
                    FOR INSERT, UPDATE, DELETE
                    AS
                    BEGIN
                        DECLARE @Action NVARCHAR(10);

                        SET @Action = CASE
                            WHEN EXISTS(SELECT * FROM inserted) AND EXISTS(SELECT * FROM deleted) THEN 'UPDATE'
                            WHEN EXISTS(SELECT * FROM inserted) THEN 'INSERT'
                            WHEN EXISTS(SELECT * FROM deleted) THEN 'DELETE'
                        END;

                        INSERT INTO changes (table_name, change_type, changed_by, details)
                        SELECT
                            '${table.name}',
                            @Action,
                            SUSER_NAME(),
                            (
                                SELECT ${cols}
                                FROM inserted
                                FOR JSON PATH
                            );
                    END;
                `);
                console.log(`Trigger erstellt: track_${table.name}`);
            }
        } catch (error) {
            console.error('Fehler bei Trigger-Erstellung:', error);
            throw error;
        }
    },

    async trackChanges(callback) {
        if (!this.pool) {
            await this.init();
        }

        setInterval(async () => {
            try {
                const lastCheck = new Date();
                lastCheck.setSeconds(lastCheck.getSeconds() - 5);

                const result = await this.pool.request()
                    .input('lastCheck', sql.DateTime, lastCheck)
                    .query(`
                        USE [${mssqlConfig.database}];
                        SELECT * FROM changes 
                        WHERE change_date > @lastCheck
                        ORDER BY change_date DESC
                    `);

                if (result.recordset.length > 0) {
                    callback(result.recordset);
                }
            } catch (error) {
                console.error('Fehler beim Tracking:', error);
            }
        }, 2000);
    }
};

export default mssqlModule;
