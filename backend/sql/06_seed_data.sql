USE VeterinariaDB;
GO

MERGE dbo.Roles AS target
USING (VALUES
    ('Administrador', 'Acceso total al sistema'),
    ('Empleado', 'Operacion diaria de la clinica'),
    ('Cliente', 'Portal para registrar mascotas y solicitar citas')
) AS source (Nombre, Descripcion)
ON target.Nombre = source.Nombre
WHEN NOT MATCHED THEN
    INSERT (Nombre, Descripcion) VALUES (source.Nombre, source.Descripcion);
GO

UPDATE dbo.Roles
SET Activo = CASE WHEN Nombre IN ('Administrador', 'Empleado', 'Cliente') THEN 1 ELSE 0 END,
    ActualizadoEn = SYSUTCDATETIME()
WHERE Nombre IN ('Administrador', 'Empleado', 'Cliente', 'Veterinario', 'Recepcion');
GO

MERGE dbo.Permisos AS target
USING (VALUES
    ('dashboard.ver', 'Ver dashboard'),
    ('clientes.gestionar', 'Gestionar clientes'),
    ('mascotas.gestionar', 'Gestionar mascotas'),
    ('citas.gestionar', 'Gestionar citas'),
    ('historial.gestionar', 'Gestionar historial clinico'),
    ('tratamientos.gestionar', 'Gestionar tratamientos'),
    ('vacunas.gestionar', 'Gestionar vacunas'),
    ('inventario.gestionar', 'Gestionar inventario'),
    ('ventas.gestionar', 'Gestionar ventas'),
    ('reportes.ver', 'Ver reportes'),
    ('usuarios.gestionar', 'Gestionar usuarios'),
    ('configuracion.gestionar', 'Gestionar configuracion'),
    ('portal.citas', 'Solicitar y consultar citas propias'),
    ('portal.mascotas', 'Registrar y consultar mascotas propias')
) AS source (Nombre, Descripcion)
ON target.Nombre = source.Nombre
WHEN NOT MATCHED THEN
    INSERT (Nombre, Descripcion) VALUES (source.Nombre, source.Descripcion);
GO

INSERT INTO dbo.RolPermiso (RolId, PermisoId)
SELECT r.RolId, p.PermisoId
FROM dbo.Roles r
CROSS JOIN dbo.Permisos p
WHERE r.Nombre = 'Administrador'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.RolPermiso rp WHERE rp.RolId = r.RolId AND rp.PermisoId = p.PermisoId
  );
GO

INSERT INTO dbo.RolPermiso (RolId, PermisoId)
SELECT r.RolId, p.PermisoId
FROM dbo.Roles r
INNER JOIN dbo.Permisos p ON p.Nombre IN (
    'dashboard.ver',
    'clientes.gestionar',
    'mascotas.gestionar',
    'citas.gestionar',
    'historial.gestionar',
    'tratamientos.gestionar',
    'vacunas.gestionar',
    'inventario.gestionar',
    'ventas.gestionar',
    'reportes.ver'
)
WHERE r.Nombre = 'Empleado'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.RolPermiso rp WHERE rp.RolId = r.RolId AND rp.PermisoId = p.PermisoId
  );
GO

INSERT INTO dbo.RolPermiso (RolId, PermisoId)
SELECT r.RolId, p.PermisoId
FROM dbo.Roles r
INNER JOIN dbo.Permisos p ON p.Nombre IN ('portal.citas', 'portal.mascotas')
WHERE r.Nombre = 'Cliente'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.RolPermiso rp WHERE rp.RolId = r.RolId AND rp.PermisoId = p.PermisoId
  );
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Usuario = 'admin')
BEGIN
    INSERT INTO dbo.Usuarios (RolId, Nombre, Usuario, Email, PasswordHash, Clave, Rol)
    SELECT RolId, 'Administrador Demo', 'admin', 'admin@elganadero.local', '$2b$12$FY7N/m1VLAZkGRcD8FpyzuPBilnELRaVrCEorIzvw8vNpAoGKNSK.', '$2b$12$FY7N/m1VLAZkGRcD8FpyzuPBilnELRaVrCEorIzvw8vNpAoGKNSK.', 'Administrador'
    FROM dbo.Roles
    WHERE Nombre = 'Administrador';
END
GO

UPDATE u
SET RolId = r.RolId,
    Nombre = COALESCE(NULLIF(u.Nombre, ''), 'Administrador Demo'),
    Email = 'admin@elganadero.local',
    Rol = 'Administrador'
FROM dbo.Usuarios u
INNER JOIN dbo.Roles r ON r.Nombre = 'Administrador'
WHERE u.Usuario = 'admin';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Usuario = 'empleado')
BEGIN
    INSERT INTO dbo.Usuarios (RolId, Nombre, Usuario, Email, PasswordHash, Clave, Rol)
    SELECT RolId, 'Empleado Clinica', 'empleado', 'empleado@elganadero.local', '$2b$12$EhmEZVDq2/qhqktIIIZKJOPI0O1OAT5yFKFCRExmujhv6Z.j3ZwXi', '$2b$12$EhmEZVDq2/qhqktIIIZKJOPI0O1OAT5yFKFCRExmujhv6Z.j3ZwXi', 'Empleado'
    FROM dbo.Roles
    WHERE Nombre = 'Empleado';
END
ELSE
BEGIN
    UPDATE u
    SET RolId = r.RolId,
        Nombre = 'Empleado Clinica',
        Email = 'empleado@elganadero.local',
        Rol = 'Empleado'
    FROM dbo.Usuarios u
    INNER JOIN dbo.Roles r ON r.Nombre = 'Empleado'
    WHERE u.Usuario = 'empleado';
END
GO

DECLARE @ClientePortalId INT;

IF NOT EXISTS (SELECT 1 FROM dbo.Clientes WHERE Correo = 'marvin.lopez@example.com')
BEGIN
    INSERT INTO dbo.Clientes (Nombre, Telefono, DPI, Correo, Direccion)
    VALUES ('Marvin Lopez', '5551-2020', '2458123450101', 'marvin.lopez@example.com', 'Zona 18, Ciudad de Guatemala');
END

SELECT @ClientePortalId = ClienteId FROM dbo.Clientes WHERE Correo = 'marvin.lopez@example.com';

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Usuario = 'cliente')
BEGIN
    INSERT INTO dbo.Usuarios (RolId, ClienteId, Nombre, Usuario, Email, PasswordHash, Clave, Rol)
    SELECT RolId, @ClientePortalId, 'Marvin Lopez', 'cliente', 'marvin.lopez@example.com', '$2b$12$Lh53PYkxWY8jGGd2u3bl5uQwkOFvf/wnczHoDVLTE.Jk66ddkUBAm', '$2b$12$Lh53PYkxWY8jGGd2u3bl5uQwkOFvf/wnczHoDVLTE.Jk66ddkUBAm', 'Cliente'
    FROM dbo.Roles
    WHERE Nombre = 'Cliente';
END
ELSE
BEGIN
    UPDATE u
    SET RolId = r.RolId,
        ClienteId = @ClientePortalId,
        Nombre = 'Marvin Lopez',
        Email = 'marvin.lopez@example.com',
        Rol = 'Cliente'
    FROM dbo.Usuarios u
    INNER JOIN dbo.Roles r ON r.Nombre = 'Cliente'
    WHERE u.Usuario = 'cliente';
END
GO

MERGE dbo.Especies AS target
USING (VALUES ('Canino'), ('Felino'), ('Ave')) AS source (Nombre)
ON target.Nombre = source.Nombre
WHEN NOT MATCHED THEN INSERT (Nombre) VALUES (source.Nombre);
GO

INSERT INTO dbo.Razas (EspecieId, Nombre)
SELECT e.EspecieId, r.Nombre
FROM dbo.Especies e
INNER JOIN (VALUES
    ('Canino', 'Mestizo'),
    ('Canino', 'Labrador'),
    ('Felino', 'Siames'),
    ('Ave', 'Periquito')
) r(Especie, Nombre) ON r.Especie = e.Nombre
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Razas rx WHERE rx.EspecieId = e.EspecieId AND rx.Nombre = r.Nombre
);
GO

IF EXISTS (SELECT 1 FROM dbo.Clientes WHERE Correo = 'marvin.lopez@example.com')
   AND NOT EXISTS (
       SELECT 1
       FROM dbo.Mascotas m
       INNER JOIN dbo.Clientes c ON c.ClienteId = m.ClienteId
       WHERE c.Correo = 'marvin.lopez@example.com'
         AND m.Nombre = 'Rocky'
   )
BEGIN
    INSERT INTO dbo.Mascotas (ClienteId, EspecieId, RazaId, Nombre, Sexo, Peso, Color, FechaNacimiento, Observaciones)
    SELECT
        c.ClienteId,
        e.EspecieId,
        r.RazaId,
        'Rocky',
        'Macho',
        18.50,
        'Cafe',
        '2020-05-10',
        'Paciente registrado desde portal demo.'
    FROM dbo.Clientes c
    INNER JOIN dbo.Especies e ON e.Nombre = 'Canino'
    LEFT JOIN dbo.Razas r ON r.EspecieId = e.EspecieId AND r.Nombre = 'Mestizo'
    WHERE c.Correo = 'marvin.lopez@example.com';
END
GO

MERGE dbo.NivelesRiesgo AS target
USING (VALUES
    ('Roja', 1, 'Reanimacion / emergencia critica', 'Atencion inmediata', 'trauma severo, atropello, atropellado, convulsion, convulsivo, dificultad respiratoria, no respira, hemorragia, sangrado severo, sangre, inconsciente, colapso', '#dc2626'),
    ('Naranja', 2, 'Emergencia / riesgo de deterioro', '15 a 30 min de espera', 'dificultad para orinar, no puede orinar, parto distocico, parto complicado, fractura, hueso roto, hueso quebrado, fractura de hueso, reaccion alergica, intoxicacion, dolor severo, herida profunda', '#ea580c'),
    ('Amarilla', 3, 'Urgencia / requiere evaluacion pronta', '30 a 60 min de espera', 'vomito, vomitos, diarrea, anorexia, no come, dolor, lesion menor, herida menor, fiebre, decaimiento, enfermo', '#d97706'),
    ('Verde', 4, 'Prioritario / control con seguimiento', 'Hasta 90 min de espera', 'seguimiento, revision, control, actualizacion, tratamiento, cambio de tratamiento, progreso', '#16a34a'),
    ('Azul', 5, 'No urgente / reserva de hora', 'Reserva de hora', 'vacuna, vacunas, vacunacion, control sanitario, consulta general, desparasitacion, certificado, banio', '#2563eb')
) AS source (Nombre, Prioridad, Descripcion, TiempoAtencion, PalabrasClave, ColorHex)
ON target.Nombre = source.Nombre
WHEN MATCHED THEN
    UPDATE SET
        Prioridad = source.Prioridad,
        Descripcion = source.Descripcion,
        TiempoAtencion = source.TiempoAtencion,
        PalabrasClave = source.PalabrasClave,
        ColorHex = source.ColorHex,
        Activo = 1
WHEN NOT MATCHED THEN
    INSERT (Nombre, Prioridad, Descripcion, TiempoAtencion, PalabrasClave, ColorHex)
    VALUES (source.Nombre, source.Prioridad, source.Descripcion, source.TiempoAtencion, source.PalabrasClave, source.ColorHex);
GO

MERGE dbo.Productos AS target
USING (VALUES
    ('Vacuna rabia canina', 'Vacunas', 18, 10, 95.00, '2027-01-30', 'RB-2026-01'),
    ('Desparasitante 10 kg', 'Medicamentos', 7, 8, 55.00, '2026-08-30', 'DP-8831'),
    ('Shampoo dermatologico', 'Cuidado', 24, 6, 80.00, '2027-05-15', 'SH-4400'),
    ('Protector gastrico', 'Medicamentos', 5, 5, 45.00, '2026-07-20', 'PG-2099')
) AS source (Nombre, Categoria, Stock, StockMinimo, Precio, FechaVencimiento, Lote)
ON target.Nombre = source.Nombre AND target.Lote = source.Lote
WHEN NOT MATCHED THEN
    INSERT (Nombre, Categoria, Stock, StockMinimo, Precio, FechaVencimiento, Lote)
    VALUES (source.Nombre, source.Categoria, source.Stock, source.StockMinimo, source.Precio, source.FechaVencimiento, source.Lote);
GO

MERGE dbo.Servicios AS target
USING (VALUES
    ('Consulta general', 'Consulta', 125.00),
    ('Vacunacion', 'Prevencion', 95.00),
    ('Desparasitacion', 'Prevencion', 65.00),
    ('Emergencia', 'Urgencias', 250.00)
) AS source (Nombre, Categoria, Precio)
ON target.Nombre = source.Nombre
WHEN NOT MATCHED THEN
    INSERT (Nombre, Categoria, Precio) VALUES (source.Nombre, source.Categoria, source.Precio);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionEmpresa)
BEGIN
    INSERT INTO dbo.ConfiguracionEmpresa (NombreClinica, Direccion, Telefono, NIT, LogoUrl, Horario, RecordatoriosActivos)
    VALUES ('Clinica Veterinaria El Ganadero', '27 AV, 28 - 11, colonia Maya, zona 18, Guatemala City, Guatemala', '3603 9109', 'CF', NULL, 'Lunes a viernes 8:00 AM - 6:00 PM, sabados 8:00 AM - 1:00 PM.', 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.HorariosClinica)
BEGIN
    INSERT INTO dbo.HorariosClinica (DiaSemana, HoraInicio, HoraFin)
    VALUES
        ('Lunes', '08:00', '18:00'),
        ('Martes', '08:00', '18:00'),
        ('Miercoles', '08:00', '18:00'),
        ('Jueves', '08:00', '18:00'),
        ('Viernes', '08:00', '18:00'),
        ('Sabado', '08:00', '13:00');
END
GO
