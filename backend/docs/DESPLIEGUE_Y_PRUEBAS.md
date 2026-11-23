# Despliegue y pruebas formales

## Alcance actual

La aplicación está desplegada localmente en modo producción en
`http://localhost:4000`, sirviendo React y la API Express desde el mismo proceso.
La persistencia apunta a `VeterinariaDB` en SQL Server mediante autenticación
integrada de Windows.

Publicarla en Internet requiere infraestructura que no forma parte del repositorio:
un servidor Windows o Linux, una instancia SQL Server accesible desde ese servidor,
un dominio, certificados TLS y credenciales de administración del proveedor.

## Diseño recomendado en nube

Usar tres registros DNS que apunten al mismo proxy HTTPS:

| Público | URL recomendada | Destino interno |
| --- | --- | --- |
| Clientes | `https://citas.sudominio.com` | Node `127.0.0.1:4000` |
| Personal | `https://personal.sudominio.com` | Node `127.0.0.1:4000` |
| Administración | `https://admin.sudominio.com` | Node `127.0.0.1:4000` |

El proxy debe conservar el encabezado `Host`, forzar HTTPS y reenviar
`X-Forwarded-For` y `X-Forwarded-Proto`. Express confía en un proxy en producción
para emitir correctamente la cookie segura.

Antes de compilar el frontend:

```env
VITE_CLIENT_HOST=citas.sudominio.com
VITE_EMPLOYEE_HOST=personal.sudominio.com
VITE_ADMIN_HOST=admin.sudominio.com
```

Configurar `FRONTEND_URL` con los tres orígenes HTTPS separados por coma. No abrir
el puerto de SQL Server a Internet; permitir acceso solo desde el servidor de la app.

## Protocolo de pruebas

### Pruebas unitarias

`backend/test/riskService.test.js` valida clasificación de emergencia, tolerancia a
errores, normalización y selección manual.

### Pruebas de integración

`backend/test/api.integration.test.js` se ejecuta contra SQL Server real y valida:

1. Salud de `VeterinariaDB`.
2. Login independiente de administrador, empleado y cliente.
3. Rechazo de un empleado en el portal administrativo.
4. Permisos administrativos sobre usuarios y evaluación.
5. Bloqueo del empleado en usuarios.
6. Aislamiento del portal de cliente.

### Verificación de frontend

`npm run lint` valida estáticamente el código y `npm run build` comprueba la
compilación de producción. La prueba en navegador revisa acceso directo, restauración
de sesión, redirección por rol, ausencia de enlaces cruzados, errores de consola y
desbordamiento horizontal en escritorio y móvil.

### Postprueba de despliegue

`npm run posttest:deployment` realiza 14 controles HTTP y 20 muestras de salud. El
archivo `docs/evidencias/postdeployment-latest.json` conserva tiempos, estado de cada
control, base consultada y cantidad de fallos.

Resultado local del 20 de julio de 2026:

- 14 de 14 pruebas automatizadas aprobadas.
- 14 de 14 controles postdespliegue aprobados.
- 20 muestras de salud SQL.
- Promedio de salud: 10.52 ms.
- Percentil 95: 6.7 ms.
- Mínimo: 2.6 ms; máximo: 132.77 ms.
- 0 vulnerabilidades de producción en backend y frontend.
- 0 errores de consola durante la navegación verificada.
- Vista móvil: 0 de 17 controles fuera del ancho y 0 desbordamiento horizontal.

Las pruebas adicionales de seguridad verifican correo y usuario duplicados sin
distinguir mayúsculas, bloqueo progresivo 10/30 minutos, secuencia completa hasta
120 minutos, respuesta sin enumeración de cuentas, token de recuperación de un solo
uso e invalidación de sesiones anteriores.

## Evidencia de impacto pre/post

La tabla `dbo.MedicionesImpacto` y la pantalla administrativa `Evaluación` almacenan
evidencia real. Para evitar resultados inválidos, no se insertaron cifras de ejemplo.

Procedimiento recomendado:

1. Medir al menos 10 operaciones antes del uso del sistema.
2. Registrar tiempo para agendar, tiempo para localizar expediente, errores, citas
   duplicadas y satisfacción.
3. Capacitar al personal y operar el sistema durante un período definido.
4. Medir al menos 10 operaciones posteriores bajo condiciones comparables.
5. Exportar o capturar el resumen calculado por la pantalla `Evaluación`.

Los indicadores calculados son reducción porcentual de tiempos, errores y duplicados,
además del cambio promedio de satisfacción. Una conclusión de impacto solo debe
emitirse después de registrar ambas fases.

## Lista previa a entrega

- Cambiar las contraseñas iniciales del script de datos.
- Generar un `JWT_SECRET` largo y exclusivo del ambiente.
- Usar una cuenta SQL de mínimos privilegios o una cuenta de servicio administrada.
- Instalar certificado TLS válido y forzar HTTPS.
- Programar copias de seguridad y una prueba de restauración.
- Ejecutar la batería automatizada y guardar la evidencia JSON.
- Realizar pruebas con usuarios de cada rol y documentar aceptación.
