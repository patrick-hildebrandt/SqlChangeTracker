const mssqlConfig = {
    user: 'name', // todo ANPASSEN
    password: 'strongPW', // todo ANPASSEN
    server: 'localhost',
    database: 'local_db', // todo ANPASSEN
    options: {
        trustServerCertificate: true,
        encrypt: true,
    }
};

export default mssqlConfig;
