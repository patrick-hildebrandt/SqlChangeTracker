import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import databaseConfig from './config/databaseConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const expressApp = express();
const port = 3000;

const app = {
    init: function() {
        this.startServer();
    },
    
    startServer: function() {
        // Middleware
        expressApp.use(express.static(path.join(__dirname, 'public')));
        expressApp.use(express.json());
        
        // Routes
        expressApp.get('/api/changes', async (req, res) => {
            try {
                const changes = await this.getAllChanges();
                res.json(changes);
            } catch (error) {
                console.error('Fehler beim Abrufen der Änderungen:', error);
                res.status(500).json({ error: 'Interner Server-Fehler' });
            }
        });
        
        // Start server
        expressApp.listen(port, () => {
            console.log(`Server läuft auf Port ${port}`);
        });
    },

    getAllChanges: async function() {
        if (databaseConfig.type === 'sqlite') {
            const sqliteModule = await import('./modules/sqliteModule.js');
            return await sqliteModule.default.getAllChanges();
        } else if (databaseConfig.type === 'mssql') {
            const mssqlModule = await import('./modules/mssqlModule.js');
            return await mssqlModule.default.getAllChanges();
        }
        return [];
    },
    
    trackChanges: function(callback) {
        if (databaseConfig.type === 'sqlite') {
            import('./modules/sqliteModule.js').then((sqliteModule) => {
                sqliteModule.default.trackChanges((sqliteChanges) => {
                    this.updateUI('SQLite', sqliteChanges, callback);
                });
            });
        } else if (databaseConfig.type === 'mssql') {
            import('./modules/mssqlModule.js').then((mssqlModule) => {
                mssqlModule.default.trackChanges((mssqlChanges) => {
                    this.updateUI('MS SQL', mssqlChanges, callback);
                });
            });
        }
    },
    
    updateUI: function(dbType, changes, callback) {
        const changesData = {
            dbType: dbType,
            changes: changes
        };
        if (typeof callback === 'function') {
            callback(changesData);
        }
    }
};

app.init();
