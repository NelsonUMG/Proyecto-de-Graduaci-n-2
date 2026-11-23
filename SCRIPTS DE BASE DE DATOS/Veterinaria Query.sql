USE VeterinariaDB;

CREATE TABLE Usuarios (
    IdUsuario INT IDENTITY(1,1) PRIMARY KEY,
    Usuario NVARCHAR(50) NOT NULL UNIQUE,
    Clave NVARCHAR(255) NOT NULL,
    Rol NVARCHAR(20) DEFAULT 'Usuario',
    Estado BIT DEFAULT 1,
    FechaCreacion DATETIME DEFAULT GETDATE()
)

--PRODECIMIENTO ALMACENADO DE LOGIN


CREATE PROCEDURE sp_Login
    @Usuario NVARCHAR(50)
AS
BEGIN
    SELECT 
        IdUsuario,
        Usuario,
        Clave, -- importante para comparar en Node
        Rol
    FROM Usuarios
    WHERE Usuario = @Usuario 
      AND Estado = 1;
END;
