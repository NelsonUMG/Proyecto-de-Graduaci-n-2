USE VeterinariaDB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Citas_Agenda' AND object_id = OBJECT_ID('dbo.Citas'))
    CREATE INDEX IX_Citas_Agenda ON dbo.Citas(Fecha, Hora, Activo, Estado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Mascotas_Cliente' AND object_id = OBJECT_ID('dbo.Mascotas'))
    CREATE INDEX IX_Mascotas_Cliente ON dbo.Mascotas(ClienteId, Activo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_HistorialClinico_Mascota' AND object_id = OBJECT_ID('dbo.HistorialClinico'))
    CREATE INDEX IX_HistorialClinico_Mascota ON dbo.HistorialClinico(MascotaId, Activo, CreadoEn DESC);
GO

