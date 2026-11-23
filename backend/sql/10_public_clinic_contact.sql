USE VeterinariaDB;
GO

IF COL_LENGTH('dbo.ConfiguracionEmpresa', 'TelefonoPetShop') IS NULL
    ALTER TABLE dbo.ConfiguracionEmpresa ADD TelefonoPetShop NVARCHAR(50) NOT NULL
        CONSTRAINT DF_ConfiguracionEmpresa_TelefonoPetShop DEFAULT N'2255 3453';
GO

IF COL_LENGTH('dbo.ConfiguracionEmpresa', 'CorreoContacto') IS NULL
    ALTER TABLE dbo.ConfiguracionEmpresa ADD CorreoContacto NVARCHAR(160) NOT NULL
        CONSTRAINT DF_ConfiguracionEmpresa_CorreoContacto DEFAULT N'elganadero.veterinaria@gmail.com';
GO

IF COL_LENGTH('dbo.ConfiguracionEmpresa', 'FacebookUrl') IS NULL
    ALTER TABLE dbo.ConfiguracionEmpresa ADD FacebookUrl NVARCHAR(500) NOT NULL
        CONSTRAINT DF_ConfiguracionEmpresa_FacebookUrl DEFAULT N'https://www.facebook.com/search/top?q=Agroveterinaria%20El%20Ganadero';
GO

-- Solo reemplaza datos de ejemplo originales; conserva los valores ya personalizados.
UPDATE dbo.ConfiguracionEmpresa
SET Telefono = N'3603 9109'
WHERE Telefono = N'2300-0000';

UPDATE dbo.ConfiguracionEmpresa
SET Direccion = N'27 AV, 28 - 11, colonia Maya, zona 18, Guatemala City, Guatemala'
WHERE Direccion = N'Zona 18, Ciudad de Guatemala';

UPDATE dbo.ConfiguracionEmpresa
SET Horario = N'Lunes a viernes 8:00 AM - 6:00 PM, sábados 8:00 AM - 1:00 PM.'
WHERE Horario = N'Lunes a sabado de 08:00 a 18:00';
GO
