-- Triggerskript für die Tabellen der Liste
DECLARE @TableName NVARCHAR(128);
DECLARE @TriggerScript NVARCHAR(MAX);

-- Liste der Tabellennamen
DECLARE @TableList TABLE (TableName NVARCHAR(128));
INSERT INTO @TableList (TableName) VALUES
('ERSTE_TABELLE'),
-- ...
('LETZTE_TABELLE');

-- Generiere ein Trigger-Skript für jede Tabelle
DECLARE CursorTables CURSOR FOR
SELECT TableName FROM @TableList;

OPEN CursorTables;
FETCH NEXT FROM CursorTables INTO @TableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Erstelle das Skript für den aktuellen Trigger
    DECLARE @ColumnList NVARCHAR(MAX);

    SELECT @ColumnList = STUFF(
        (
            SELECT ', ' + QUOTENAME(c.name)
            FROM sys.columns c
            JOIN sys.types t ON c.user_type_id = t.user_type_id
            WHERE c.object_id = OBJECT_ID(@TableName)
              AND t.name NOT IN ('text', 'ntext', 'image')
            FOR XML PATH('')
        ), 1, 2, ''
    );

    SET @TriggerScript = '
    CREATE TRIGGER track_' + @TableName + '
    ON ' + @TableName + '
    FOR INSERT, UPDATE, DELETE
    AS
    BEGIN
        DECLARE @Action NVARCHAR(50);

        SET @Action = CASE 
            WHEN EXISTS(SELECT * FROM inserted) AND EXISTS(SELECT * FROM deleted) THEN ''UPDATE''
            WHEN EXISTS(SELECT * FROM inserted) THEN ''INSERT''
            WHEN EXISTS(SELECT * FROM deleted) THEN ''DELETE''
        END;

        INSERT INTO changes (TableName, Action, ChangedBy, Details)
        SELECT 
            ''' + @TableName + ''', @Action, SUSER_NAME(), 
            (SELECT ' + @ColumnList + ' FROM inserted FOR JSON PATH);
    END;
    GO';

    -- Gib das Skript aus
    PRINT @TriggerScript;

    FETCH NEXT FROM CursorTables INTO @TableName;
END;

CLOSE CursorTables;
DEALLOCATE CursorTables;