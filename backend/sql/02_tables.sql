SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE VeterinariaDB;
GO

IF OBJECT_ID('dbo.Roles', 'U') IS NULL
CREATE TABLE dbo.Roles (
    RolId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(80) NOT NULL UNIQUE,
    Descripcion NVARCHAR(250) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Roles_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Roles_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL
);
GO

IF OBJECT_ID('dbo.Permisos', 'U') IS NULL
CREATE TABLE dbo.Permisos (
    PermisoId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(120) NOT NULL UNIQUE,
    Descripcion NVARCHAR(250) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Permisos_Activo DEFAULT 1
);
GO

IF OBJECT_ID('dbo.RolPermiso', 'U') IS NULL
CREATE TABLE dbo.RolPermiso (
    RolId INT NOT NULL,
    PermisoId INT NOT NULL,
    CONSTRAINT PK_RolPermiso PRIMARY KEY (RolId, PermisoId),
    CONSTRAINT FK_RolPermiso_Roles FOREIGN KEY (RolId) REFERENCES dbo.Roles(RolId),
    CONSTRAINT FK_RolPermiso_Permisos FOREIGN KEY (PermisoId) REFERENCES dbo.Permisos(PermisoId)
);
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
CREATE TABLE dbo.Usuarios (
    UsuarioId INT IDENTITY(1,1) PRIMARY KEY,
    RolId INT NOT NULL,
    ClienteId INT NULL,
    Nombre NVARCHAR(140) NOT NULL,
    Usuario NVARCHAR(80) NOT NULL UNIQUE,
    Email NVARCHAR(160) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Clave NVARCHAR(255) NULL,
    Rol NVARCHAR(20) NULL,
    Estado BIT NOT NULL CONSTRAINT DF_Usuarios_Estado DEFAULT 1,
    FechaCreacion DATETIME NOT NULL CONSTRAINT DF_Usuarios_FechaCreacion DEFAULT GETDATE(),
    IntentosFallidos INT NOT NULL CONSTRAINT DF_Usuarios_Intentos DEFAULT 0,
    BloqueadoHasta DATETIME2 NULL,
    UltimoAcceso DATETIME2 NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Usuarios_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL,
    CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (RolId) REFERENCES dbo.Roles(RolId)
);
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'UsuarioId') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD UsuarioId INT NULL;
    EXEC('UPDATE dbo.Usuarios SET UsuarioId = IdUsuario WHERE UsuarioId IS NULL');
    ALTER TABLE dbo.Usuarios ALTER COLUMN UsuarioId INT NOT NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'RolId') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD RolId INT NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'ClienteId') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD ClienteId INT NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'Nombre') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD Nombre NVARCHAR(140) NULL;
    EXEC('UPDATE dbo.Usuarios SET Nombre = Usuario WHERE Nombre IS NULL');
    ALTER TABLE dbo.Usuarios ALTER COLUMN Nombre NVARCHAR(140) NOT NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'Email') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD Email NVARCHAR(160) NULL;
    EXEC('UPDATE dbo.Usuarios SET Email = CONCAT(Usuario, ''@elganadero.local'') WHERE Email IS NULL');
    ALTER TABLE dbo.Usuarios ALTER COLUMN Email NVARCHAR(160) NOT NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'PasswordHash') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD PasswordHash NVARCHAR(255) NULL;
    EXEC('UPDATE dbo.Usuarios SET PasswordHash = Clave WHERE PasswordHash IS NULL');
    ALTER TABLE dbo.Usuarios ALTER COLUMN PasswordHash NVARCHAR(255) NOT NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'IntentosFallidos') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD IntentosFallidos INT NOT NULL CONSTRAINT DF_Usuarios_Intentos DEFAULT 0;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'BloqueadoHasta') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD BloqueadoHasta DATETIME2 NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'UltimoAcceso') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD UltimoAcceso DATETIME2 NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'Activo') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD Activo BIT NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT 1;
    IF COL_LENGTH('dbo.Usuarios', 'Estado') IS NOT NULL
        EXEC('UPDATE dbo.Usuarios SET Activo = Estado');
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'CreadoEn') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Usuarios_CreadoEn DEFAULT SYSUTCDATETIME();
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'ActualizadoEn') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios ADD ActualizadoEn DATETIME2 NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL
BEGIN
    UPDATE u
    SET RolId = r.RolId
    FROM dbo.Usuarios u
    INNER JOIN dbo.Roles r ON r.Nombre = CASE
        WHEN u.Rol IN ('Administrador', 'Admin') THEN 'Administrador'
        WHEN u.Rol IN ('Veterinario', 'Medico', 'Recepcion', 'Usuario', 'Empleado') THEN 'Empleado'
        ELSE 'Administrador'
    END
    WHERE u.RolId IS NULL;

    UPDATE dbo.Usuarios
    SET RolId = (SELECT TOP 1 RolId FROM dbo.Roles WHERE Nombre = 'Administrador')
    WHERE RolId IS NULL;
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL AND COL_LENGTH('dbo.Usuarios', 'RolId') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Usuarios ALTER COLUMN RolId INT NOT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Usuarios_UsuarioId')
BEGIN
    ALTER TABLE dbo.Usuarios ADD CONSTRAINT UQ_Usuarios_UsuarioId UNIQUE (UsuarioId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Usuarios_Email')
BEGIN
    CREATE UNIQUE INDEX UQ_Usuarios_Email ON dbo.Usuarios(Email);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Usuarios_Roles')
BEGIN
    ALTER TABLE dbo.Usuarios ADD CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (RolId) REFERENCES dbo.Roles(RolId);
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL
   AND COLUMNPROPERTY(OBJECT_ID('dbo.Usuarios'), 'UsuarioId', 'IsIdentity') = 0
BEGIN
    IF OBJECT_ID('dbo.SeqUsuariosCompat', 'SO') IS NULL
    BEGIN
        DECLARE @SiguienteUsuarioId INT = (SELECT ISNULL(MAX(UsuarioId), 0) + 1 FROM dbo.Usuarios);
        DECLARE @SqlSequence NVARCHAR(MAX) =
            N'CREATE SEQUENCE dbo.SeqUsuariosCompat AS INT START WITH ' +
            CAST(@SiguienteUsuarioId AS NVARCHAR(20)) +
            N' INCREMENT BY 1';
        EXEC(@SqlSequence);
    END
END
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL
   AND COLUMNPROPERTY(OBJECT_ID('dbo.Usuarios'), 'UsuarioId', 'IsIdentity') = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_Usuarios_UsuarioId')
    BEGIN
        ALTER TABLE dbo.Usuarios ADD CONSTRAINT DF_Usuarios_UsuarioId DEFAULT NEXT VALUE FOR dbo.SeqUsuariosCompat FOR UsuarioId;
    END
END
GO

IF OBJECT_ID('dbo.Clientes', 'U') IS NULL
CREATE TABLE dbo.Clientes (
    ClienteId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(140) NOT NULL,
    Telefono NVARCHAR(30) NOT NULL,
    DPI NVARCHAR(20) NULL,
    Correo NVARCHAR(160) NULL,
    Direccion NVARCHAR(300) NULL,
    FechaRegistro DATE NOT NULL CONSTRAINT DF_Clientes_Fecha DEFAULT CONVERT(DATE, GETDATE()),
    Activo BIT NOT NULL CONSTRAINT DF_Clientes_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Clientes_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Usuarios_Clientes')
BEGIN
    ALTER TABLE dbo.Usuarios ADD CONSTRAINT FK_Usuarios_Clientes FOREIGN KEY (ClienteId) REFERENCES dbo.Clientes(ClienteId);
END
GO

IF OBJECT_ID('dbo.Especies', 'U') IS NULL
CREATE TABLE dbo.Especies (
    EspecieId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(80) NOT NULL UNIQUE,
    Activo BIT NOT NULL CONSTRAINT DF_Especies_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Especies_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL
);
GO

IF OBJECT_ID('dbo.Razas', 'U') IS NULL
CREATE TABLE dbo.Razas (
    RazaId INT IDENTITY(1,1) PRIMARY KEY,
    EspecieId INT NOT NULL,
    Nombre NVARCHAR(100) NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Razas_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Razas_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL,
    CONSTRAINT FK_Razas_Especies FOREIGN KEY (EspecieId) REFERENCES dbo.Especies(EspecieId),
    CONSTRAINT UQ_Razas_Especie_Nombre UNIQUE (EspecieId, Nombre)
);
GO

IF OBJECT_ID('dbo.Mascotas', 'U') IS NULL
CREATE TABLE dbo.Mascotas (
    MascotaId INT IDENTITY(1,1) PRIMARY KEY,
    ClienteId INT NOT NULL,
    EspecieId INT NOT NULL,
    RazaId INT NULL,
    Nombre NVARCHAR(100) NOT NULL,
    Sexo NVARCHAR(30) NOT NULL,
    Peso DECIMAL(8,2) NULL,
    Color NVARCHAR(80) NULL,
    FechaNacimiento DATE NULL,
    FotoUrl NVARCHAR(500) NULL,
    Observaciones NVARCHAR(1000) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Mascotas_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Mascotas_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL,
    CONSTRAINT FK_Mascotas_Clientes FOREIGN KEY (ClienteId) REFERENCES dbo.Clientes(ClienteId),
    CONSTRAINT FK_Mascotas_Especies FOREIGN KEY (EspecieId) REFERENCES dbo.Especies(EspecieId),
    CONSTRAINT FK_Mascotas_Razas FOREIGN KEY (RazaId) REFERENCES dbo.Razas(RazaId)
);
GO

IF OBJECT_ID('dbo.NivelesRiesgo', 'U') IS NULL
CREATE TABLE dbo.NivelesRiesgo (
    NivelRiesgoId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(40) NOT NULL UNIQUE,
    Prioridad INT NOT NULL UNIQUE,
    Descripcion NVARCHAR(250) NULL,
    TiempoAtencion NVARCHAR(120) NULL,
    PalabrasClave NVARCHAR(1200) NULL,
    ColorHex NVARCHAR(20) NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_NivelesRiesgo_Activo DEFAULT 1
);
GO

IF OBJECT_ID('dbo.NivelesRiesgo', 'U') IS NOT NULL AND COL_LENGTH('dbo.NivelesRiesgo', 'TiempoAtencion') IS NULL
BEGIN
    ALTER TABLE dbo.NivelesRiesgo ADD TiempoAtencion NVARCHAR(120) NULL;
END
GO

IF OBJECT_ID('dbo.NivelesRiesgo', 'U') IS NOT NULL AND COL_LENGTH('dbo.NivelesRiesgo', 'PalabrasClave') IS NULL
BEGIN
    ALTER TABLE dbo.NivelesRiesgo ADD PalabrasClave NVARCHAR(1200) NULL;
END
GO

IF OBJECT_ID('dbo.Citas', 'U') IS NULL
CREATE TABLE dbo.Citas (
    CitaId INT IDENTITY(1,1) PRIMARY KEY,
    ClienteId INT NOT NULL,
    MascotaId INT NOT NULL,
    NivelRiesgoId INT NOT NULL,
    UsuarioRegistroId INT NOT NULL,
    Fecha DATE NOT NULL,
    Hora TIME(0) NOT NULL,
    Motivo NVARCHAR(300) NOT NULL,
    Sintomas NVARCHAR(1000) NULL,
    Estado NVARCHAR(40) NOT NULL CONSTRAINT DF_Citas_Estado DEFAULT 'Pendiente',
    RiesgoModificadoPorId INT NULL,
    RiesgoModificadoEn DATETIME2 NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Citas_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Citas_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL,
    CONSTRAINT FK_Citas_Clientes FOREIGN KEY (ClienteId) REFERENCES dbo.Clientes(ClienteId),
    CONSTRAINT FK_Citas_Mascotas FOREIGN KEY (MascotaId) REFERENCES dbo.Mascotas(MascotaId),
    CONSTRAINT FK_Citas_NivelesRiesgo FOREIGN KEY (NivelRiesgoId) REFERENCES dbo.NivelesRiesgo(NivelRiesgoId),
    CONSTRAINT FK_Citas_UsuarioRegistro FOREIGN KEY (UsuarioRegistroId) REFERENCES dbo.Usuarios(UsuarioId),
    CONSTRAINT FK_Citas_RiesgoUsuario FOREIGN KEY (RiesgoModificadoPorId) REFERENCES dbo.Usuarios(UsuarioId),
    CONSTRAINT CK_Citas_Estado CHECK (Estado IN ('Pendiente','Confirmada','En espera','En atencion','Atendida','Finalizada','Cancelada','No asistio'))
);
GO

IF OBJECT_ID('dbo.Citas', 'U') IS NOT NULL
   AND EXISTS (
       SELECT 1
       FROM sys.check_constraints
       WHERE name = 'CK_Citas_Estado'
         AND parent_object_id = OBJECT_ID('dbo.Citas')
         AND definition NOT LIKE '%Atendida%'
   )
BEGIN
    ALTER TABLE dbo.Citas DROP CONSTRAINT CK_Citas_Estado;
    ALTER TABLE dbo.Citas ADD CONSTRAINT CK_Citas_Estado CHECK (Estado IN ('Pendiente','Confirmada','En espera','En atencion','Atendida','Finalizada','Cancelada','No asistio'));
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Citas_FechaHora_Activas')
CREATE UNIQUE INDEX IX_Citas_FechaHora_Activas
ON dbo.Citas(Fecha, Hora)
WHERE Activo = 1 AND Estado <> 'Cancelada' AND Estado <> 'No asistio';
GO

IF OBJECT_ID('dbo.HistorialClinico', 'U') IS NULL
CREATE TABLE dbo.HistorialClinico (
    HistorialClinicoId INT IDENTITY(1,1) PRIMARY KEY,
    MascotaId INT NOT NULL,
    ClienteId INT NOT NULL,
    CitaId INT NULL,
    VeterinarioId INT NULL,
    MotivoConsulta NVARCHAR(300) NOT NULL,
    Sintomas NVARCHAR(1000) NULL,
    Diagnostico NVARCHAR(1000) NULL,
    Tratamiento NVARCHAR(1000) NULL,
    Medicamentos NVARCHAR(1000) NULL,
    Observaciones NVARCHAR(1000) NULL,
    ProximaCita DATE NULL,
    Activo BIT NOT NULL CONSTRAINT DF_HistorialClinico_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_HistorialClinico_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL,
    CONSTRAINT FK_Historial_Mascotas FOREIGN KEY (MascotaId) REFERENCES dbo.Mascotas(MascotaId),
    CONSTRAINT FK_Historial_Clientes FOREIGN KEY (ClienteId) REFERENCES dbo.Clientes(ClienteId),
    CONSTRAINT FK_Historial_Citas FOREIGN KEY (CitaId) REFERENCES dbo.Citas(CitaId),
    CONSTRAINT FK_Historial_Veterinarios FOREIGN KEY (VeterinarioId) REFERENCES dbo.Usuarios(UsuarioId)
);
GO

IF OBJECT_ID('dbo.Tratamientos', 'U') IS NULL
CREATE TABLE dbo.Tratamientos (
    TratamientoId INT IDENTITY(1,1) PRIMARY KEY,
    MascotaId INT NOT NULL,
    VeterinarioId INT NULL,
    Estado NVARCHAR(40) NOT NULL CONSTRAINT DF_Tratamientos_Estado DEFAULT 'Activo',
    FechaInicio DATE NOT NULL,
    FechaFin DATE NULL,
    MedicamentoServicio NVARCHAR(200) NOT NULL,
    DosisIndicaciones NVARCHAR(500) NULL,
    Observaciones NVARCHAR(500) NULL,
    Seguimiento NVARCHAR(500) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Tratamientos_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Tratamientos_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL,
    CONSTRAINT FK_Tratamientos_Mascotas FOREIGN KEY (MascotaId) REFERENCES dbo.Mascotas(MascotaId),
    CONSTRAINT FK_Tratamientos_Veterinarios FOREIGN KEY (VeterinarioId) REFERENCES dbo.Usuarios(UsuarioId),
    CONSTRAINT CK_Tratamientos_Estado CHECK (Estado IN ('Activo','Finalizado','Suspendido'))
);
GO

IF OBJECT_ID('dbo.Vacunas', 'U') IS NULL
CREATE TABLE dbo.Vacunas (
    VacunaId INT IDENTITY(1,1) PRIMARY KEY,
    MascotaId INT NOT NULL,
    VeterinarioId INT NULL,
    NombreVacuna NVARCHAR(160) NOT NULL,
    FechaAplicacion DATE NOT NULL,
    ProximaDosis DATE NULL,
    Lote NVARCHAR(80) NULL,
    FechaVencimientoProducto DATE NULL,
    Observaciones NVARCHAR(500) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Vacunas_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Vacunas_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL,
    CONSTRAINT FK_Vacunas_Mascotas FOREIGN KEY (MascotaId) REFERENCES dbo.Mascotas(MascotaId),
    CONSTRAINT FK_Vacunas_Veterinarios FOREIGN KEY (VeterinarioId) REFERENCES dbo.Usuarios(UsuarioId)
);
GO

IF OBJECT_ID('dbo.Productos', 'U') IS NULL
CREATE TABLE dbo.Productos (
    ProductoId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(160) NOT NULL,
    Categoria NVARCHAR(100) NOT NULL,
    Stock DECIMAL(12,2) NOT NULL CONSTRAINT DF_Productos_Stock DEFAULT 0,
    StockMinimo DECIMAL(12,2) NOT NULL CONSTRAINT DF_Productos_StockMinimo DEFAULT 0,
    Precio DECIMAL(12,2) NOT NULL,
    FechaVencimiento DATE NULL,
    Lote NVARCHAR(80) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Productos_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Productos_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL,
    CONSTRAINT CK_Productos_Stock CHECK (Stock >= 0),
    CONSTRAINT CK_Productos_Precio CHECK (Precio >= 0)
);
GO

IF OBJECT_ID('dbo.Servicios', 'U') IS NULL
CREATE TABLE dbo.Servicios (
    ServicioId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(160) NOT NULL,
    Categoria NVARCHAR(100) NOT NULL,
    Precio DECIMAL(12,2) NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_Servicios_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Servicios_CreadoEn DEFAULT SYSUTCDATETIME(),
    ActualizadoEn DATETIME2 NULL,
    CONSTRAINT CK_Servicios_Precio CHECK (Precio >= 0)
);
GO

IF OBJECT_ID('dbo.InventarioMovimientos', 'U') IS NULL
CREATE TABLE dbo.InventarioMovimientos (
    InventarioMovimientoId INT IDENTITY(1,1) PRIMARY KEY,
    ProductoId INT NOT NULL,
    UsuarioId INT NULL,
    Tipo NVARCHAR(30) NOT NULL,
    Cantidad DECIMAL(12,2) NOT NULL,
    Motivo NVARCHAR(250) NOT NULL,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_InventarioMovimientos_CreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_InventarioMovimientos_Productos FOREIGN KEY (ProductoId) REFERENCES dbo.Productos(ProductoId),
    CONSTRAINT FK_InventarioMovimientos_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(UsuarioId),
    CONSTRAINT CK_InventarioMovimientos_Tipo CHECK (Tipo IN ('Entrada','Salida','Ajuste')),
    CONSTRAINT CK_InventarioMovimientos_Cantidad CHECK (Cantidad > 0)
);
GO

IF OBJECT_ID('dbo.Ventas', 'U') IS NULL
CREATE TABLE dbo.Ventas (
    VentaId INT IDENTITY(1,1) PRIMARY KEY,
    ClienteId INT NULL,
    UsuarioId INT NOT NULL,
    MetodoPago NVARCHAR(40) NOT NULL,
    Subtotal DECIMAL(12,2) NOT NULL,
    IVA DECIMAL(12,2) NOT NULL,
    Total DECIMAL(12,2) NOT NULL,
    Estado NVARCHAR(30) NOT NULL CONSTRAINT DF_Ventas_Estado DEFAULT 'Emitida',
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Ventas_CreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Ventas_Clientes FOREIGN KEY (ClienteId) REFERENCES dbo.Clientes(ClienteId),
    CONSTRAINT FK_Ventas_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(UsuarioId),
    CONSTRAINT CK_Ventas_MetodoPago CHECK (MetodoPago IN ('Efectivo','Debito','Credito','Transferencia'))
);
GO

IF OBJECT_ID('dbo.VentaDetalle', 'U') IS NULL
CREATE TABLE dbo.VentaDetalle (
    VentaDetalleId INT IDENTITY(1,1) PRIMARY KEY,
    VentaId INT NOT NULL,
    TipoItem NVARCHAR(30) NOT NULL,
    ProductoId INT NULL,
    ServicioId INT NULL,
    Descripcion NVARCHAR(200) NOT NULL,
    Cantidad DECIMAL(12,2) NOT NULL,
    PrecioUnitario DECIMAL(12,2) NOT NULL,
    Total DECIMAL(12,2) NOT NULL,
    CONSTRAINT FK_VentaDetalle_Ventas FOREIGN KEY (VentaId) REFERENCES dbo.Ventas(VentaId),
    CONSTRAINT FK_VentaDetalle_Productos FOREIGN KEY (ProductoId) REFERENCES dbo.Productos(ProductoId),
    CONSTRAINT FK_VentaDetalle_Servicios FOREIGN KEY (ServicioId) REFERENCES dbo.Servicios(ServicioId),
    CONSTRAINT CK_VentaDetalle_Tipo CHECK (TipoItem IN ('Producto','Servicio')),
    CONSTRAINT CK_VentaDetalle_Cantidad CHECK (Cantidad > 0)
);
GO

IF OBJECT_ID('dbo.Pagos', 'U') IS NULL
CREATE TABLE dbo.Pagos (
    PagoId INT IDENTITY(1,1) PRIMARY KEY,
    VentaId INT NOT NULL,
    MetodoPago NVARCHAR(40) NOT NULL,
    Monto DECIMAL(12,2) NOT NULL,
    Referencia NVARCHAR(120) NULL,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Pagos_CreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Pagos_Ventas FOREIGN KEY (VentaId) REFERENCES dbo.Ventas(VentaId)
);
GO

IF OBJECT_ID('dbo.Auditoria', 'U') IS NULL
CREATE TABLE dbo.Auditoria (
    AuditoriaId BIGINT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT NULL,
    Accion NVARCHAR(120) NOT NULL,
    Tabla NVARCHAR(120) NULL,
    RegistroId NVARCHAR(80) NULL,
    Detalle NVARCHAR(1000) NULL,
    Ip NVARCHAR(80) NULL,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Auditoria_CreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Auditoria_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(UsuarioId)
);
GO

IF OBJECT_ID('dbo.ConfiguracionEmpresa', 'U') IS NULL
CREATE TABLE dbo.ConfiguracionEmpresa (
    ConfiguracionEmpresaId INT IDENTITY(1,1) PRIMARY KEY,
    NombreClinica NVARCHAR(160) NOT NULL,
    Direccion NVARCHAR(250) NOT NULL,
    Telefono NVARCHAR(50) NOT NULL,
    NIT NVARCHAR(50) NOT NULL,
    LogoUrl NVARCHAR(500) NULL,
    Horario NVARCHAR(250) NULL,
    RecordatoriosActivos BIT NOT NULL CONSTRAINT DF_ConfiguracionEmpresa_Recordatorios DEFAULT 1,
    ActualizadoEn DATETIME2 NOT NULL CONSTRAINT DF_ConfiguracionEmpresa_Actualizado DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.HorariosClinica', 'U') IS NULL
CREATE TABLE dbo.HorariosClinica (
    HorarioClinicaId INT IDENTITY(1,1) PRIMARY KEY,
    DiaSemana NVARCHAR(20) NOT NULL,
    HoraInicio TIME(0) NOT NULL,
    HoraFin TIME(0) NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_HorariosClinica_Activo DEFAULT 1
);
GO

IF OBJECT_ID('dbo.Notificaciones', 'U') IS NULL
CREATE TABLE dbo.Notificaciones (
    NotificacionId INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT NULL,
    Tipo NVARCHAR(80) NOT NULL,
    Mensaje NVARCHAR(500) NOT NULL,
    Leida BIT NOT NULL CONSTRAINT DF_Notificaciones_Leida DEFAULT 0,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_Notificaciones_CreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Notificaciones_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(UsuarioId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Clientes_Busqueda')
CREATE INDEX IX_Clientes_Busqueda ON dbo.Clientes(Nombre, Telefono, Correo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Mascotas_Cliente')
CREATE INDEX IX_Mascotas_Cliente ON dbo.Mascotas(ClienteId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Historial_Mascota')
CREATE INDEX IX_Historial_Mascota ON dbo.HistorialClinico(MascotaId, CreadoEn DESC);
GO
