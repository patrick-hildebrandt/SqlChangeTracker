CREATE TABLE changes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    table_name NVARCHAR(128),
    change_type NVARCHAR(10),
    change_date DATETIME DEFAULT GETDATE(),
    changed_by NVARCHAR(128) DEFAULT SYSTEM_USER,
    details NVARCHAR(MAX)
)