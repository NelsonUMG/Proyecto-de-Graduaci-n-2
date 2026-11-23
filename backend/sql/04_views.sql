USE VeterinariaDB;
GO

CREATE OR ALTER VIEW dbo.vw_CitasDetalle
AS
SELECT
    c.CitaId,
    c.Fecha,
    c.Hora,
    c.Estado,
    c.Motivo,
    cli.Nombre AS Cliente,
    cli.Telefono,
    m.Nombre AS Mascota,
    e.Nombre AS Especie,
    r.Nombre AS Raza,
    nr.Nombre AS NivelRiesgo,
    nr.Prioridad,
    nr.TiempoAtencion,
    nr.PalabrasClave,
    nr.ColorHex,
    u.Nombre AS RegistradoPor
FROM dbo.Citas c
INNER JOIN dbo.Clientes cli ON cli.ClienteId = c.ClienteId
INNER JOIN dbo.Mascotas m ON m.MascotaId = c.MascotaId
INNER JOIN dbo.Especies e ON e.EspecieId = m.EspecieId
LEFT JOIN dbo.Razas r ON r.RazaId = m.RazaId
INNER JOIN dbo.NivelesRiesgo nr ON nr.NivelRiesgoId = c.NivelRiesgoId
INNER JOIN dbo.Usuarios u ON u.UsuarioId = c.UsuarioRegistroId
WHERE c.Activo = 1;
GO

CREATE OR ALTER VIEW dbo.vw_MascotasPorEspecie
AS
SELECT e.Nombre AS Especie, COUNT(m.MascotaId) AS Total
FROM dbo.Especies e
LEFT JOIN dbo.Mascotas m ON m.EspecieId = e.EspecieId AND m.Activo = 1
GROUP BY e.Nombre;
GO

CREATE OR ALTER VIEW dbo.vw_CitasPorEstado
AS
SELECT Estado, COUNT(*) AS Total
FROM dbo.Citas
WHERE Activo = 1
GROUP BY Estado;
GO

CREATE OR ALTER VIEW dbo.vw_InventarioBajo
AS
SELECT ProductoId, Nombre, Categoria, Stock, StockMinimo, Lote, FechaVencimiento
FROM dbo.Productos
WHERE Activo = 1 AND Stock <= StockMinimo;
GO

CREATE OR ALTER VIEW dbo.vw_ProductosPorVencer
AS
SELECT ProductoId, Nombre, Categoria, Stock, Lote, FechaVencimiento
FROM dbo.Productos
WHERE Activo = 1
  AND FechaVencimiento IS NOT NULL
  AND FechaVencimiento <= DATEADD(DAY, 60, CONVERT(DATE, GETDATE()));
GO

CREATE OR ALTER VIEW dbo.vw_VentasDetalle
AS
SELECT
    v.VentaId,
    v.CreadoEn,
    c.Nombre AS Cliente,
    u.Nombre AS Usuario,
    v.MetodoPago,
    v.Subtotal,
    v.IVA,
    v.Total,
    d.TipoItem,
    d.Descripcion,
    d.Cantidad,
    d.PrecioUnitario,
    d.Total AS TotalLinea
FROM dbo.Ventas v
LEFT JOIN dbo.Clientes c ON c.ClienteId = v.ClienteId
INNER JOIN dbo.Usuarios u ON u.UsuarioId = v.UsuarioId
INNER JOIN dbo.VentaDetalle d ON d.VentaId = v.VentaId;
GO
