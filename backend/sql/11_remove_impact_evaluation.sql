USE VeterinariaDB;
GO

IF OBJECT_ID('dbo.MedicionesImpacto', 'U') IS NOT NULL
    DROP TABLE dbo.MedicionesImpacto;
GO

DELETE rp
FROM dbo.RolPermiso rp
INNER JOIN dbo.Permisos p ON p.PermisoId = rp.PermisoId
WHERE p.Nombre = N'evaluacion.gestionar';

DELETE FROM dbo.Permisos WHERE Nombre = N'evaluacion.gestionar';
GO
