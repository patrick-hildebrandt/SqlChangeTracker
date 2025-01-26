USE [mstift_jos_824_11];
GO

DECLARE @TriggerName NVARCHAR(MAX);
DECLARE @TableName NVARCHAR(MAX);
DECLARE @SQL NVARCHAR(MAX);
DECLARE @TriggerCount INT = 0;

-- Prüfen ob Trigger existieren
SELECT @TriggerCount = COUNT(*)
FROM sys.triggers TR
INNER JOIN sys.tables T ON TR.parent_id = T.object_id
WHERE TR.name LIKE 'trg_' + T.name;

IF @TriggerCount = 0
BEGIN
    PRINT 'Keine Trigger gefunden.';
    RETURN;
END

PRINT 'Gefundene Trigger: ' + CAST(@TriggerCount AS NVARCHAR(10));
PRINT '----------------------------------------';

-- Cursor zur Iteration über alle Trigger
DECLARE TriggerCursor CURSOR FOR
SELECT TR.name AS TriggerName, T.name AS TableName
FROM sys.triggers TR
INNER JOIN sys.tables T ON TR.parent_id = T.object_id
WHERE TR.name LIKE 'trg_' + T.name;

-- Öffnen des Cursors
OPEN TriggerCursor;

-- Lesen der ersten Zeile
FETCH NEXT FROM TriggerCursor INTO @TriggerName, @TableName;

-- Solange noch Datensätze vorhanden sind
WHILE @@FETCH_STATUS = 0
BEGIN
    -- Dynamisches SQL generieren und ausführen
    SET @SQL = 'DROP TRIGGER ' + QUOTENAME(@TriggerName);
    EXEC sp_executesql @SQL;
    PRINT 'Trigger gelöscht: ' + @TriggerName + ' (Tabelle: ' + @TableName + ')';
    FETCH NEXT FROM TriggerCursor INTO @TriggerName, @TableName;
END

-- Cursor schließen und freigeben
CLOSE TriggerCursor;
DEALLOCATE TriggerCursor;

PRINT '----------------------------------------';
PRINT 'Zusammenfassung:';
PRINT CAST(@TriggerCount AS NVARCHAR(10)) + ' Trigger wurden erfolgreich entfernt.';