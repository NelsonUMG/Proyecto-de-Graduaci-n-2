USE VeterinariaDB;
GO

IF TYPE_ID('dbo.VentaDetalleType') IS NULL
    EXEC('CREATE TYPE dbo.VentaDetalleType AS TABLE (
        TipoItem NVARCHAR(30) NOT NULL,
        ReferenciaId INT NOT NULL,
        Cantidad DECIMAL(12,2) NOT NULL,
        PrecioUnitario DECIMAL(12,2) NULL
    )');
GO

CREATE OR ALTER PROCEDURE dbo.sp_LoginUsuario
    @Usuario NVARCHAR(160)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.UsuarioId,
        u.RolId,
        u.ClienteId,
        r.Nombre AS Rol,
        u.Nombre,
        u.Usuario,
        u.Email,
        u.PasswordHash,
        u.IntentosFallidos,
        u.BloqueadoHasta,
        u.Activo
    FROM dbo.Usuarios u
    INNER JOIN dbo.Roles r ON r.RolId = u.RolId
    WHERE u.Activo = 1
      AND r.Activo = 1
      AND (u.Usuario = @Usuario OR u.Email = @Usuario);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CrearUsuario
    @RolId INT,
    @Nombre NVARCHAR(140),
    @Usuario NVARCHAR(80),
    @Email NVARCHAR(160),
    @PasswordHash NVARCHAR(255),
    @ClienteId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RolNombre NVARCHAR(80) = (SELECT Nombre FROM dbo.Roles WHERE RolId = @RolId);

    INSERT INTO dbo.Usuarios (RolId, ClienteId, Nombre, Usuario, Email, PasswordHash, Clave, Rol)
    VALUES (@RolId, @ClienteId, @Nombre, @Usuario, @Email, @PasswordHash, @PasswordHash, @RolNombre);

    SELECT * FROM dbo.Usuarios WHERE Usuario = @Usuario;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Login
    @Usuario NVARCHAR(160)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.UsuarioId AS IdUsuario,
        u.Usuario,
        u.PasswordHash AS Clave,
        r.Nombre AS Rol
    FROM dbo.Usuarios u
    INNER JOIN dbo.Roles r ON r.RolId = u.RolId
    WHERE u.Activo = 1
      AND r.Activo = 1
      AND (u.Usuario = @Usuario OR u.Email = @Usuario);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CambiarPassword
    @UsuarioId INT,
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Usuarios
    SET PasswordHash = @PasswordHash,
        Clave = @PasswordHash,
        IntentosFallidos = 0,
        BloqueadoHasta = NULL,
        ActualizadoEn = SYSUTCDATETIME()
    WHERE UsuarioId = @UsuarioId AND Activo = 1;

    SELECT UsuarioId, Nombre, Usuario, Email, RolId, Activo
    FROM dbo.Usuarios
    WHERE UsuarioId = @UsuarioId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CrearCliente
    @Nombre NVARCHAR(140),
    @Telefono NVARCHAR(30),
    @DPI NVARCHAR(20) = NULL,
    @Correo NVARCHAR(160) = NULL,
    @Direccion NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Clientes (Nombre, Telefono, DPI, Correo, Direccion)
    VALUES (@Nombre, @Telefono, @DPI, @Correo, @Direccion);

    SELECT * FROM dbo.Clientes WHERE ClienteId = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_RegistrarClientePortal
    @Nombre NVARCHAR(140),
    @Telefono NVARCHAR(30),
    @DPI NVARCHAR(20) = NULL,
    @Correo NVARCHAR(160),
    @Direccion NVARCHAR(300) = NULL,
    @Usuario NVARCHAR(80),
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Usuario = @Usuario OR Email = @Correo)
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51010, 'Ya existe una cuenta con ese usuario o correo.', 1;
    END

    DECLARE @ClienteId INT;
    DECLARE @RolClienteId INT = (SELECT RolId FROM dbo.Roles WHERE Nombre = 'Cliente');

    INSERT INTO dbo.Clientes (Nombre, Telefono, DPI, Correo, Direccion)
    VALUES (@Nombre, @Telefono, @DPI, @Correo, @Direccion);

    SET @ClienteId = SCOPE_IDENTITY();

    INSERT INTO dbo.Usuarios (RolId, ClienteId, Nombre, Usuario, Email, PasswordHash, Clave, Rol)
    VALUES (@RolClienteId, @ClienteId, @Nombre, @Usuario, @Correo, @PasswordHash, @PasswordHash, 'Cliente');

    COMMIT TRANSACTION;

    SELECT * FROM dbo.Clientes WHERE ClienteId = @ClienteId;
    SELECT * FROM dbo.Usuarios WHERE Usuario = @Usuario;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ListarMascotasPortal
    @ClienteId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        m.*,
        e.Nombre AS Especie,
        r.Nombre AS Raza
    FROM dbo.Mascotas m
    INNER JOIN dbo.Especies e ON e.EspecieId = m.EspecieId
    LEFT JOIN dbo.Razas r ON r.RazaId = m.RazaId
    WHERE m.ClienteId = @ClienteId
      AND m.Activo = 1
    ORDER BY m.Nombre;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CrearMascotaPortal
    @ClienteId INT,
    @EspecieId INT,
    @RazaId INT = NULL,
    @Nombre NVARCHAR(100),
    @Sexo NVARCHAR(30),
    @Peso DECIMAL(8,2) = NULL,
    @Color NVARCHAR(80) = NULL,
    @FechaNacimiento DATE = NULL,
    @FotoUrl NVARCHAR(500) = NULL,
    @Observaciones NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Mascotas
        (ClienteId, EspecieId, RazaId, Nombre, Sexo, Peso, Color, FechaNacimiento, FotoUrl, Observaciones)
    VALUES
        (@ClienteId, @EspecieId, @RazaId, @Nombre, @Sexo, @Peso, @Color, @FechaNacimiento, @FotoUrl, @Observaciones);

    SELECT * FROM dbo.Mascotas WHERE MascotaId = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ListarCitasPortal
    @ClienteId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.vw_CitasDetalle
    WHERE CitaId IN (SELECT CitaId FROM dbo.Citas WHERE ClienteId = @ClienteId)
    ORDER BY Fecha, Hora;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ActualizarCliente
    @ClienteId INT,
    @Nombre NVARCHAR(140),
    @Telefono NVARCHAR(30),
    @DPI NVARCHAR(20) = NULL,
    @Correo NVARCHAR(160) = NULL,
    @Direccion NVARCHAR(300) = NULL,
    @Activo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Clientes
    SET Nombre = @Nombre,
        Telefono = @Telefono,
        DPI = @DPI,
        Correo = @Correo,
        Direccion = @Direccion,
        Activo = @Activo,
        ActualizadoEn = SYSUTCDATETIME()
    WHERE ClienteId = @ClienteId;

    SELECT * FROM dbo.Clientes WHERE ClienteId = @ClienteId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CrearMascota
    @ClienteId INT,
    @EspecieId INT,
    @RazaId INT = NULL,
    @Nombre NVARCHAR(100),
    @Sexo NVARCHAR(30),
    @Peso DECIMAL(8,2) = NULL,
    @Color NVARCHAR(80) = NULL,
    @FechaNacimiento DATE = NULL,
    @FotoUrl NVARCHAR(500) = NULL,
    @Observaciones NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Mascotas
        (ClienteId, EspecieId, RazaId, Nombre, Sexo, Peso, Color, FechaNacimiento, FotoUrl, Observaciones)
    VALUES
        (@ClienteId, @EspecieId, @RazaId, @Nombre, @Sexo, @Peso, @Color, @FechaNacimiento, @FotoUrl, @Observaciones);

    SELECT * FROM dbo.Mascotas WHERE MascotaId = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ActualizarMascota
    @MascotaId INT,
    @ClienteId INT,
    @EspecieId INT,
    @RazaId INT = NULL,
    @Nombre NVARCHAR(100),
    @Sexo NVARCHAR(30),
    @Peso DECIMAL(8,2) = NULL,
    @Color NVARCHAR(80) = NULL,
    @FechaNacimiento DATE = NULL,
    @FotoUrl NVARCHAR(500) = NULL,
    @Observaciones NVARCHAR(1000) = NULL,
    @Activo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Mascotas
    SET ClienteId = @ClienteId,
        EspecieId = @EspecieId,
        RazaId = @RazaId,
        Nombre = @Nombre,
        Sexo = @Sexo,
        Peso = @Peso,
        Color = @Color,
        FechaNacimiento = @FechaNacimiento,
        FotoUrl = @FotoUrl,
        Observaciones = @Observaciones,
        Activo = @Activo,
        ActualizadoEn = SYSUTCDATETIME()
    WHERE MascotaId = @MascotaId;

    SELECT * FROM dbo.Mascotas WHERE MascotaId = @MascotaId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ValidarDisponibilidadCita
    @Fecha DATE,
    @Hora TIME(0),
    @CitaId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CASE WHEN EXISTS (
            SELECT 1
            FROM dbo.Citas
            WHERE Fecha = @Fecha
              AND Hora = @Hora
              AND Activo = 1
              AND Estado NOT IN ('Cancelada', 'No asistio')
              AND (@CitaId IS NULL OR CitaId <> @CitaId)
        )
        THEN CAST(0 AS BIT) ELSE CAST(1 AS BIT) END AS Disponible;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CrearCita
    @ClienteId INT,
    @MascotaId INT,
    @NivelRiesgoId INT,
    @UsuarioRegistroId INT,
    @Fecha DATE,
    @Hora TIME(0),
    @Motivo NVARCHAR(300),
    @Sintomas NVARCHAR(1000) = NULL,
    @Estado NVARCHAR(40) = 'Pendiente'
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM dbo.Citas
        WHERE Fecha = @Fecha
          AND Hora = @Hora
          AND Activo = 1
          AND Estado NOT IN ('Cancelada', 'No asistio')
    )
    BEGIN
        THROW 51000, 'Ya existe una cita activa en la misma fecha y hora.', 1;
    END

    INSERT INTO dbo.Citas
        (ClienteId, MascotaId, NivelRiesgoId, UsuarioRegistroId, Fecha, Hora, Motivo, Sintomas, Estado)
    VALUES
        (@ClienteId, @MascotaId, @NivelRiesgoId, @UsuarioRegistroId, @Fecha, @Hora, @Motivo, @Sintomas, @Estado);

    SELECT * FROM dbo.Citas WHERE CitaId = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CrearCitaPortal
    @ClienteId INT,
    @MascotaId INT,
    @NivelRiesgoId INT,
    @UsuarioRegistroId INT,
    @Fecha DATE,
    @Hora TIME(0),
    @Motivo NVARCHAR(300),
    @Sintomas NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Mascotas
        WHERE MascotaId = @MascotaId
          AND ClienteId = @ClienteId
          AND Activo = 1
    )
    BEGIN
        THROW 51011, 'La mascota seleccionada no pertenece al cliente.', 1;
    END

    EXEC dbo.sp_CrearCita
        @ClienteId = @ClienteId,
        @MascotaId = @MascotaId,
        @NivelRiesgoId = @NivelRiesgoId,
        @UsuarioRegistroId = @UsuarioRegistroId,
        @Fecha = @Fecha,
        @Hora = @Hora,
        @Motivo = @Motivo,
        @Sintomas = @Sintomas,
        @Estado = 'Pendiente';
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ActualizarCita
    @CitaId INT,
    @ClienteId INT,
    @MascotaId INT,
    @NivelRiesgoId INT,
    @Fecha DATE,
    @Hora TIME(0),
    @Motivo NVARCHAR(300),
    @Sintomas NVARCHAR(1000) = NULL,
    @Estado NVARCHAR(40)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM dbo.Citas
        WHERE Fecha = @Fecha
          AND Hora = @Hora
          AND Activo = 1
          AND Estado NOT IN ('Cancelada', 'No asistio')
          AND CitaId <> @CitaId
    )
    BEGIN
        THROW 51001, 'Ya existe otra cita activa en la misma fecha y hora.', 1;
    END

    UPDATE dbo.Citas
    SET ClienteId = @ClienteId,
        MascotaId = @MascotaId,
        NivelRiesgoId = @NivelRiesgoId,
        Fecha = @Fecha,
        Hora = @Hora,
        Motivo = @Motivo,
        Sintomas = @Sintomas,
        Estado = @Estado,
        ActualizadoEn = SYSUTCDATETIME()
    WHERE CitaId = @CitaId;

    SELECT * FROM dbo.Citas WHERE CitaId = @CitaId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CambiarEstadoCita
    @CitaId INT,
    @Estado NVARCHAR(40),
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Citas
    SET Estado = @Estado,
        ActualizadoEn = SYSUTCDATETIME()
    WHERE CitaId = @CitaId;

    INSERT INTO dbo.Auditoria (UsuarioId, Accion, Tabla, RegistroId, Detalle)
    VALUES (@UsuarioId, 'cita.estado', 'Citas', CAST(@CitaId AS NVARCHAR(80)), @Estado);

    SELECT * FROM dbo.Citas WHERE CitaId = @CitaId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ListarNivelesRiesgo
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        NivelRiesgoId,
        Nombre,
        Prioridad,
        Descripcion,
        TiempoAtencion,
        PalabrasClave,
        ColorHex,
        Activo
    FROM dbo.NivelesRiesgo
    WHERE Activo = 1
    ORDER BY Prioridad;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ActualizarNivelRiesgo
    @NivelRiesgoId INT,
    @Nombre NVARCHAR(40),
    @Prioridad INT,
    @Descripcion NVARCHAR(250) = NULL,
    @TiempoAtencion NVARCHAR(120),
    @PalabrasClave NVARCHAR(1200),
    @ColorHex NVARCHAR(20),
    @Activo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.NivelesRiesgo
    SET Nombre = @Nombre,
        Prioridad = @Prioridad,
        Descripcion = @Descripcion,
        TiempoAtencion = @TiempoAtencion,
        PalabrasClave = @PalabrasClave,
        ColorHex = @ColorHex,
        Activo = @Activo
    WHERE NivelRiesgoId = @NivelRiesgoId;

    SELECT *
    FROM dbo.NivelesRiesgo
    WHERE NivelRiesgoId = @NivelRiesgoId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_RegistrarHistorialClinico
    @MascotaId INT,
    @ClienteId INT,
    @CitaId INT = NULL,
    @VeterinarioId INT = NULL,
    @MotivoConsulta NVARCHAR(300),
    @Sintomas NVARCHAR(1000) = NULL,
    @Diagnostico NVARCHAR(1000) = NULL,
    @Tratamiento NVARCHAR(1000) = NULL,
    @Medicamentos NVARCHAR(1000) = NULL,
    @Observaciones NVARCHAR(1000) = NULL,
    @ProximaCita DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.HistorialClinico
        (MascotaId, ClienteId, CitaId, VeterinarioId, MotivoConsulta, Sintomas, Diagnostico, Tratamiento, Medicamentos, Observaciones, ProximaCita)
    VALUES
        (@MascotaId, @ClienteId, @CitaId, @VeterinarioId, @MotivoConsulta, @Sintomas, @Diagnostico, @Tratamiento, @Medicamentos, @Observaciones, @ProximaCita);

    SELECT * FROM dbo.HistorialClinico WHERE HistorialClinicoId = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_RegistrarTratamiento
    @MascotaId INT,
    @VeterinarioId INT = NULL,
    @Estado NVARCHAR(40),
    @FechaInicio DATE,
    @FechaFin DATE = NULL,
    @MedicamentoServicio NVARCHAR(200),
    @DosisIndicaciones NVARCHAR(500) = NULL,
    @Observaciones NVARCHAR(500) = NULL,
    @Seguimiento NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Tratamientos
        (MascotaId, VeterinarioId, Estado, FechaInicio, FechaFin, MedicamentoServicio, DosisIndicaciones, Observaciones, Seguimiento)
    VALUES
        (@MascotaId, @VeterinarioId, @Estado, @FechaInicio, @FechaFin, @MedicamentoServicio, @DosisIndicaciones, @Observaciones, @Seguimiento);

    SELECT * FROM dbo.Tratamientos WHERE TratamientoId = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_RegistrarVacuna
    @MascotaId INT,
    @VeterinarioId INT = NULL,
    @NombreVacuna NVARCHAR(160),
    @FechaAplicacion DATE,
    @ProximaDosis DATE = NULL,
    @Lote NVARCHAR(80) = NULL,
    @FechaVencimientoProducto DATE = NULL,
    @Observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Vacunas
        (MascotaId, VeterinarioId, NombreVacuna, FechaAplicacion, ProximaDosis, Lote, FechaVencimientoProducto, Observaciones)
    VALUES
        (@MascotaId, @VeterinarioId, @NombreVacuna, @FechaAplicacion, @ProximaDosis, @Lote, @FechaVencimientoProducto, @Observaciones);

    SELECT * FROM dbo.Vacunas WHERE VacunaId = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CrearProducto
    @Nombre NVARCHAR(160),
    @Categoria NVARCHAR(100),
    @Stock DECIMAL(12,2),
    @StockMinimo DECIMAL(12,2),
    @Precio DECIMAL(12,2),
    @FechaVencimiento DATE = NULL,
    @Lote NVARCHAR(80) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Productos (Nombre, Categoria, Stock, StockMinimo, Precio, FechaVencimiento, Lote)
    VALUES (@Nombre, @Categoria, @Stock, @StockMinimo, @Precio, @FechaVencimiento, @Lote);

    SELECT * FROM dbo.Productos WHERE ProductoId = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_RegistrarMovimientoInventario
    @ProductoId INT,
    @UsuarioId INT,
    @Tipo NVARCHAR(30),
    @Cantidad DECIMAL(12,2),
    @Motivo NVARCHAR(250)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    IF @Tipo = 'Salida' AND EXISTS (SELECT 1 FROM dbo.Productos WHERE ProductoId = @ProductoId AND Stock < @Cantidad)
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51002, 'Stock insuficiente para registrar salida.', 1;
    END

    UPDATE dbo.Productos
    SET Stock = CASE
        WHEN @Tipo = 'Entrada' THEN Stock + @Cantidad
        WHEN @Tipo = 'Salida' THEN Stock - @Cantidad
        WHEN @Tipo = 'Ajuste' THEN @Cantidad
        ELSE Stock
    END,
        ActualizadoEn = SYSUTCDATETIME()
    WHERE ProductoId = @ProductoId;

    INSERT INTO dbo.InventarioMovimientos (ProductoId, UsuarioId, Tipo, Cantidad, Motivo)
    VALUES (@ProductoId, @UsuarioId, @Tipo, @Cantidad, @Motivo);

    COMMIT TRANSACTION;

    SELECT * FROM dbo.InventarioMovimientos WHERE InventarioMovimientoId = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_CrearVenta
    @ClienteId INT = NULL,
    @UsuarioId INT,
    @MetodoPago NVARCHAR(40),
    @Detalles dbo.VentaDetalleType READONLY
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1
        FROM @Detalles d
        INNER JOIN dbo.Productos p ON p.ProductoId = d.ReferenciaId
        WHERE d.TipoItem = 'Producto'
          AND p.Stock < d.Cantidad
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51003, 'Stock insuficiente para completar la venta.', 1;
    END

    DECLARE @DetalleCalculado TABLE (
        TipoItem NVARCHAR(30),
        ProductoId INT NULL,
        ServicioId INT NULL,
        Descripcion NVARCHAR(200),
        Cantidad DECIMAL(12,2),
        PrecioUnitario DECIMAL(12,2),
        Total DECIMAL(12,2)
    );

    INSERT INTO @DetalleCalculado
    SELECT 'Producto', p.ProductoId, NULL, p.Nombre, d.Cantidad, COALESCE(d.PrecioUnitario, p.Precio), d.Cantidad * COALESCE(d.PrecioUnitario, p.Precio)
    FROM @Detalles d
    INNER JOIN dbo.Productos p ON p.ProductoId = d.ReferenciaId
    WHERE d.TipoItem = 'Producto';

    INSERT INTO @DetalleCalculado
    SELECT 'Servicio', NULL, s.ServicioId, s.Nombre, d.Cantidad, COALESCE(d.PrecioUnitario, s.Precio), d.Cantidad * COALESCE(d.PrecioUnitario, s.Precio)
    FROM @Detalles d
    INNER JOIN dbo.Servicios s ON s.ServicioId = d.ReferenciaId
    WHERE d.TipoItem = 'Servicio';

    DECLARE @Subtotal DECIMAL(12,2) = (SELECT COALESCE(SUM(Total), 0) FROM @DetalleCalculado);
    DECLARE @IVA DECIMAL(12,2) = ROUND(@Subtotal * 0.12, 2);
    DECLARE @Total DECIMAL(12,2) = @Subtotal + @IVA;

    INSERT INTO dbo.Ventas (ClienteId, UsuarioId, MetodoPago, Subtotal, IVA, Total)
    VALUES (@ClienteId, @UsuarioId, @MetodoPago, @Subtotal, @IVA, @Total);

    DECLARE @VentaId INT = SCOPE_IDENTITY();

    INSERT INTO dbo.VentaDetalle (VentaId, TipoItem, ProductoId, ServicioId, Descripcion, Cantidad, PrecioUnitario, Total)
    SELECT @VentaId, TipoItem, ProductoId, ServicioId, Descripcion, Cantidad, PrecioUnitario, Total
    FROM @DetalleCalculado;

    UPDATE p
    SET p.Stock = p.Stock - d.Cantidad,
        p.ActualizadoEn = SYSUTCDATETIME()
    FROM dbo.Productos p
    INNER JOIN @DetalleCalculado d ON d.ProductoId = p.ProductoId
    WHERE d.TipoItem = 'Producto';

    INSERT INTO dbo.InventarioMovimientos (ProductoId, UsuarioId, Tipo, Cantidad, Motivo)
    SELECT ProductoId, @UsuarioId, 'Salida', Cantidad, CONCAT('Venta #', @VentaId)
    FROM @DetalleCalculado
    WHERE TipoItem = 'Producto';

    INSERT INTO dbo.Pagos (VentaId, MetodoPago, Monto)
    VALUES (@VentaId, @MetodoPago, @Total);

    COMMIT TRANSACTION;

    SELECT * FROM dbo.Ventas WHERE VentaId = @VentaId;
    SELECT * FROM dbo.VentaDetalle WHERE VentaId = @VentaId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ReporteCitasPorFecha
    @FechaInicio DATE,
    @FechaFin DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Fecha, Estado, COUNT(*) AS Total
    FROM dbo.Citas
    WHERE Fecha BETWEEN @FechaInicio AND @FechaFin
      AND Activo = 1
    GROUP BY Fecha, Estado
    ORDER BY Fecha;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ReporteTratamientos
AS
BEGIN
    SET NOCOUNT ON;

    SELECT t.Estado, COUNT(*) AS Total
    FROM dbo.Tratamientos t
    WHERE t.Activo = 1
    GROUP BY t.Estado;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ReporteInventarioBajo
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ProductoId, Nombre, Categoria, Stock, StockMinimo
    FROM dbo.Productos
    WHERE Activo = 1 AND Stock <= StockMinimo
    ORDER BY Stock ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ReporteProductosPorVencer
    @Dias INT = 60
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ProductoId, Nombre, Categoria, Lote, FechaVencimiento, Stock
    FROM dbo.Productos
    WHERE Activo = 1
      AND FechaVencimiento IS NOT NULL
      AND FechaVencimiento <= DATEADD(DAY, @Dias, CONVERT(DATE, GETDATE()))
    ORDER BY FechaVencimiento ASC;
END
GO
