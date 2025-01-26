USE [mstift_jos_824_11];
GO

-- Trigger-Status vor Ausführung
PRINT '=== Trigger-Status vor Ausführung ==='
SELECT TR.name AS TriggerName, 
       OBJECT_NAME(TR.parent_id) AS TableName,
       CASE 
           WHEN is_disabled = 1 THEN 'Deaktiviert'
           ELSE 'Aktiv'
       END AS Status
FROM sys.triggers TR
WHERE TR.name LIKE 'track_%';

-- Prüfen ob Trigger existieren
DECLARE @TriggerCount INT = 0;
SELECT @TriggerCount = COUNT(*)
FROM sys.triggers TR
WHERE TR.name LIKE 'track_%';

IF @TriggerCount = 0
BEGIN
    PRINT 'Keine Trigger gefunden.';
    RETURN;
END

-- Trigger entfernen
DECLARE @TriggerName NVARCHAR(MAX);
DECLARE @SQL NVARCHAR(MAX);

DECLARE TriggerCursor CURSOR FOR
SELECT TR.name
FROM sys.triggers TR
WHERE TR.name LIKE 'track_%';

OPEN TriggerCursor;
FETCH NEXT FROM TriggerCursor INTO @TriggerName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @SQL = 'DROP TRIGGER [dbo].[' + @TriggerName + ']';
    EXEC sp_executesql @SQL;
    PRINT 'Trigger entfernt: ' + @TriggerName;
    FETCH NEXT FROM TriggerCursor INTO @TriggerName;
END

CLOSE TriggerCursor;
DEALLOCATE TriggerCursor;

-- Trigger-Status nach Ausführung
PRINT '=== Trigger-Status nach Ausführung ==='
SELECT TR.name AS TriggerName, 
       OBJECT_NAME(TR.parent_id) AS TableName,
       CASE 
           WHEN is_disabled = 1 THEN 'Deaktiviert'
           ELSE 'Aktiv'
       END AS Status
FROM sys.triggers TR
WHERE TR.name LIKE 'track_%';

PRINT 'Skript abgeschlossen.';