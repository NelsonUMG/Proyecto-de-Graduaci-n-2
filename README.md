# Sistema Web Veterinaria El Ganadero

Aplicación para administrar clientes, mascotas, citas, historial clínico, inventario, ventas y evaluación operativa. El sistema usa React, Express y Microsoft SQL Server. SQL Server es obligatorio; la aplicación ya no utiliza datos en memoria.

## Accesos separados

No existe un selector público que muestre los tres portales. En la instalación local:

- Clientes: `http://localhost:4000/cliente/acceso`
- Personal: `http://localhost:4000/empleado/acceso`
- Administración: `http://localhost:4000/admin/acceso`

`/` y `/acceso` llevan únicamente al portal de clientes. Cada login valida en el backend que la cuenta corresponda al portal solicitado.

Para nube se recomienda usar tres subdominios sobre la misma instalación:

- `https://citas.sudominio.com`
- `https://personal.sudominio.com`
- `https://admin.sudominio.com`

El frontend reconoce esos prefijos. También se pueden configurar nombres exactos con `VITE_CLIENT_HOST`, `VITE_EMPLOYEE_HOST` y `VITE_ADMIN_HOST` antes de compilar.

## Seguridad implementada

- Autorización por rol y permiso en cada endpoint protegido.
- Sesión JWT en cookie `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
- Contraseñas con bcrypt y bloqueo progresivo después de cada cinco fallos: 10, 30, 60, 90 y 120 minutos.
- Recuperación por correo con token aleatorio, hash en SQL, 30 minutos de vigencia y un solo uso; al cambiar la clave se invalidan las sesiones anteriores.
- Helmet, CORS por lista permitida, límites de cuerpo y rate limiting.
- Transacciones SQL serializables para citas, inventario y ventas.
- Auditoría de login, logout y operaciones sensibles en SQL Server.
- Validación de entradas con Joi y consultas SQL parametrizadas.
- Cero vulnerabilidades de producción reportadas por `npm audit --omit=dev`.

Separar u ocultar URLs no reemplaza la autorización. Aunque alguien conozca la URL administrativa, el backend rechaza cuentas de cliente o empleado.

## Requisitos

- Node.js 20 o superior.
- Microsoft SQL Server y ODBC Driver 18 for SQL Server.
- Base `VeterinariaDB` creada con los scripts de `backend/sql`.
- En Windows, la cuenta que ejecuta Node debe tener permisos sobre la base si se usa `DB_AUTH=windows`.

## Base de datos

En SSMS, abrir `backend/sql/00_EJECUTAR_TODO_VeterinariaDB.sql`, activar `Query > SQLCMD Mode` y ejecutar. El script incluye tablas, procedimientos, vistas, triggers, datos iniciales y el módulo `MedicionesImpacto`.

Para una base ya existente, ejecutar como mínimo:

```powershell
sqlcmd -S localhost -E -d VeterinariaDB -b -i backend\sql\07_production_hardening.sql
sqlcmd -S localhost -E -d VeterinariaDB -b -i backend\sql\08_auth_security.sql
```

Las cuentas iniciales del script `06_seed_data.sql` son solo para instalación. Cambiar sus contraseñas antes de entregar el sistema a una empresa.

## Desarrollo

Terminal 1:

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Vite redirige `/api` a `http://localhost:4000` durante desarrollo.

## Producción local

Preparar dependencias y frontend:

```powershell
.\scripts\Preparar-Produccion.ps1
```

Levantar frontend y API como una sola aplicación:

```powershell
.\scripts\Iniciar-Produccion.ps1
```

La aplicación queda en `http://localhost:4000`. Para una empresa se debe colocar un proxy HTTPS delante de Node y ejecutar el proceso como servicio con una cuenta dedicada de mínimos privilegios.
