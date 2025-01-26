# Database Change Tracker

This application tracks changes in local ms sql and sqlite databases and displays them live in a web interface.

## Prerequisites

- Node.js installed on your machine
- SQLite installed on your machine
- MS SQL Server installed on your machine

## Setup

1. Clone the repository:
    ```sh
    git clone https://github.com/patrick-hildebrandt/SqlChangeTracker.git
    cd SqlChangeTracker
    ```

2. Install the dependencies:
    ```sh
    npm install
    ```

3. Install `express` and `nodemon`:
    ```sh
    npm install express nodemon
    ```

4. Configure the database connections:

    - Edit the `config/databaseConfig.js` file to specify the database type and connection details:
        ```js
        const databaseConfig = {
            // type: 'sqlite',
            type: 'mssql', // todo ANPASSEN
            // config: sqliteConfig,
            config: mssqlConfig, // todo ANPASSEN
        };
        ```

    - Edit the `config/sqliteConfig.js` file to specify the database type and connection details:
        ```js
        const sqliteConfig = {
            filename: 'C:\\path\\to\\database.sqlite', // todo ANPASSEN
        };
        ```

    - Edit the `config/mssqlConfig.js` file to specify the database type and connection details:
        ```js
        const mssqlConfig = {
            user: 'name', // todo ANPASSEN
            password: 'strongPW', // todo ANPASSEN
            database: 'local_db', // todo ANPASSEN
        };
        ```

5. Start the application:
    ```sh
    npm start
    ```

4. Open your web browser and navigate to `http://localhost:3000` to see the app in action.

## Usage

The app will display changes in the connected SQLite database in real-time.

## Notes

- Ensure that your databases are running and accessible before starting the app.
- The app is designed for local development and testing purposes only.
- Necessary triggers are generated automatically, after removing all existing triggers, what has to be considered carefully!
- In addition there will be a table "changes" installed in the DB, which means that this table name must be available!
