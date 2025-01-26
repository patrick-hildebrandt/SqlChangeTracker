import sqliteConfig from './sqliteConfig.js';
import mssqlConfig from './mssqlConfig.js';

const databaseConfig = {
    // type: 'sqlite',
    type: 'mssql', // todo ANPASSEN
    // config: sqliteConfig,
    config: mssqlConfig, // todo ANPASSEN
    trigger: 'default'
};

export default databaseConfig;
