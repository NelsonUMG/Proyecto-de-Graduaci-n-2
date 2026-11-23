USE VeterinariaDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_Razas_Id_Especie' AND object_id=OBJECT_ID('dbo.Razas'))
    CREATE UNIQUE INDEX UX_Razas_Id_Especie ON dbo.Razas(RazaId, EspecieId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_Mascotas_Id_Cliente' AND object_id=OBJECT_ID('dbo.Mascotas'))
    CREATE UNIQUE INDEX UX_Mascotas_Id_Cliente ON dbo.Mascotas(MascotaId, ClienteId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_Citas_Id_Mascota_Cliente' AND object_id=OBJECT_ID('dbo.Citas'))
    CREATE UNIQUE INDEX UX_Citas_Id_Mascota_Cliente ON dbo.Citas(CitaId, MascotaId, ClienteId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_Mascotas_RazaEspecie')
    ALTER TABLE dbo.Mascotas WITH CHECK ADD CONSTRAINT FK_Mascotas_RazaEspecie
      FOREIGN KEY (RazaId, EspecieId) REFERENCES dbo.Razas(RazaId, EspecieId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_Citas_MascotaCliente')
    ALTER TABLE dbo.Citas WITH CHECK ADD CONSTRAINT FK_Citas_MascotaCliente
      FOREIGN KEY (MascotaId, ClienteId) REFERENCES dbo.Mascotas(MascotaId, ClienteId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_Historial_MascotaCliente')
    ALTER TABLE dbo.HistorialClinico WITH CHECK ADD CONSTRAINT FK_Historial_MascotaCliente
      FOREIGN KEY (MascotaId, ClienteId) REFERENCES dbo.Mascotas(MascotaId, ClienteId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_Historial_CitaRelacion')
    ALTER TABLE dbo.HistorialClinico WITH CHECK ADD CONSTRAINT FK_Historial_CitaRelacion
      FOREIGN KEY (CitaId, MascotaId, ClienteId) REFERENCES dbo.Citas(CitaId, MascotaId, ClienteId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_Tratamientos_Fechas')
    ALTER TABLE dbo.Tratamientos WITH CHECK ADD CONSTRAINT CK_Tratamientos_Fechas
      CHECK (FechaFin IS NULL OR FechaFin >= FechaInicio);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_Vacunas_ProximaDosis')
    ALTER TABLE dbo.Vacunas WITH CHECK ADD CONSTRAINT CK_Vacunas_ProximaDosis
      CHECK (ProximaDosis IS NULL OR ProximaDosis >= FechaAplicacion);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_Vacunas_Vencimiento')
    ALTER TABLE dbo.Vacunas WITH CHECK ADD CONSTRAINT CK_Vacunas_Vencimiento
      CHECK (FechaVencimientoProducto IS NULL OR FechaVencimientoProducto >= FechaAplicacion);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_HorariosClinica_Rango')
    ALTER TABLE dbo.HorariosClinica WITH CHECK ADD CONSTRAINT CK_HorariosClinica_Rango
      CHECK (HoraFin > HoraInicio);
GO
