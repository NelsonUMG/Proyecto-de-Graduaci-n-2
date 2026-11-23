USE VeterinariaDB;
GO

IF COL_LENGTH('dbo.Usuarios', 'VersionToken') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios
        ADD VersionToken INT NOT NULL CONSTRAINT DF_Usuarios_VersionToken DEFAULT 0;
END;
GO

IF COL_LENGTH('dbo.Usuarios', 'BloqueosAcumulados') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios
        ADD BloqueosAcumulados INT NOT NULL CONSTRAINT DF_Usuarios_BloqueosAcumulados DEFAULT 0;
END;
GO

IF OBJECT_ID('dbo.PasswordResetTokens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PasswordResetTokens (
        PasswordResetTokenId BIGINT IDENTITY(1,1) PRIMARY KEY,
        UsuarioId INT NOT NULL,
        TokenHash CHAR(64) NOT NULL,
        Portal NVARCHAR(20) NOT NULL,
        ExpiraEn DATETIME2 NOT NULL,
        UsadoEn DATETIME2 NULL,
        SolicitadoDesdeIp NVARCHAR(80) NULL,
        CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_PasswordResetTokens_Creado DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_PasswordResetTokens_Usuarios
            FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(UsuarioId),
        CONSTRAINT UQ_PasswordResetTokens_Hash UNIQUE (TokenHash),
        CONSTRAINT CK_PasswordResetTokens_Portal
            CHECK (Portal IN ('cliente', 'empleado', 'admin'))
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_PasswordResetTokens_UsuarioEstado'
      AND object_id = OBJECT_ID('dbo.PasswordResetTokens')
)
BEGIN
    CREATE INDEX IX_PasswordResetTokens_UsuarioEstado
        ON dbo.PasswordResetTokens (UsuarioId, UsadoEn, ExpiraEn DESC)
        INCLUDE (CreadoEn, Portal);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_PasswordResetTokens_Expiracion'
      AND object_id = OBJECT_ID('dbo.PasswordResetTokens')
)
BEGIN
    CREATE INDEX IX_PasswordResetTokens_Expiracion
        ON dbo.PasswordResetTokens (ExpiraEn, UsadoEn);
END;
GO
