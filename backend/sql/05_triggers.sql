USE VeterinariaDB;
GO

CREATE OR ALTER TRIGGER dbo.trg_Citas_Auditoria
ON dbo.Citas
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Auditoria (UsuarioId, Accion, Tabla, RegistroId, Detalle)
    SELECT
        i.UsuarioRegistroId,
        CASE WHEN d.CitaId IS NULL THEN 'cita.insert' ELSE 'cita.update' END,
        'Citas',
        CAST(i.CitaId AS NVARCHAR(80)),
        CONCAT('Estado: ', i.Estado, ', Fecha: ', CONVERT(NVARCHAR(10), i.Fecha, 120), ', Hora: ', CONVERT(NVARCHAR(8), i.Hora))
    FROM inserted i
    LEFT JOIN deleted d ON d.CitaId = i.CitaId;
END
GO

CREATE OR ALTER TRIGGER dbo.trg_HistorialClinico_Auditoria
ON dbo.HistorialClinico
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Auditoria (UsuarioId, Accion, Tabla, RegistroId, Detalle)
    SELECT
        i.VeterinarioId,
        CASE WHEN d.HistorialClinicoId IS NULL THEN 'historial.insert' ELSE 'historial.update' END,
        'HistorialClinico',
        CAST(i.HistorialClinicoId AS NVARCHAR(80)),
        i.MotivoConsulta
    FROM inserted i
    LEFT JOIN deleted d ON d.HistorialClinicoId = i.HistorialClinicoId;
END
GO

CREATE OR ALTER TRIGGER dbo.trg_InventarioMovimientos_Auditoria
ON dbo.InventarioMovimientos
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Auditoria (UsuarioId, Accion, Tabla, RegistroId, Detalle)
    SELECT
        i.UsuarioId,
        'inventario.movimiento',
        'InventarioMovimientos',
        CAST(i.InventarioMovimientoId AS NVARCHAR(80)),
        CONCAT(i.Tipo, ' producto ', i.ProductoId, ' cantidad ', i.Cantidad)
    FROM inserted i;
END
GO

CREATE OR ALTER TRIGGER dbo.trg_Ventas_Auditoria
ON dbo.Ventas
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Auditoria (UsuarioId, Accion, Tabla, RegistroId, Detalle)
    SELECT
        i.UsuarioId,
        'venta.insert',
        'Ventas',
        CAST(i.VentaId AS NVARCHAR(80)),
        CONCAT('Total Q', i.Total, ', metodo ', i.MetodoPago)
    FROM inserted i;
END
GO
