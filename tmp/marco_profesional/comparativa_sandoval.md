# Comparativa del Marco Metodológico

## Referencias analizadas

- Modelo estructural: `C:\Users\Nelson\Desktop\Entrega10-DefensaDeTesis-PGII-CarlosSandoval.docx`.
- SHA-256 del modelo: `71F4C5441F6B611F19A487308890CDFE19D81825254975E3C8E8DAE0711B32D0`.
- Documento autoridad de El Ganadero: `C:\Users\Nelson\Desktop\Proyecto de Graduación\MARCO DE ANEXOS.docx`.
- La comparación comprende el Capítulo III completo de Sandoval, desde `Capítulo III – Marco Metodológico` hasta el inicio del Capítulo IV.

## Comparación y decisión aplicada

| Componente | Sandoval | Versión anterior de El Ganadero | Corrección aplicada |
|---|---|---|---|
| Jerarquía | Capítulo, secciones y subsecciones con niveles visuales | Heading 1, 2 y 3 con numeración explícita | Se conservan los estilos semánticos del documento autoridad y la numeración 3.x para actualizar el índice correctamente |
| Rótulos APA | Número y título separados; el título no siempre está antes de la tabla | Número `SEQ`, título en cursiva y nota | Se conserva el patrón APA correcto: número, título, objeto y nota; campos automáticos y sin numeración estática |
| Descripción del problema | Tres preguntas en una tabla de dos columnas | Matriz de situación, consecuencia y solución | Se adopta la tabla de tres preguntas adaptada a la clínica |
| REQ | Ficha de cinco columnas con ID, prioridad, nombre y funciones numeradas | Ficha vertical de dos columnas | Las 31 fichas pasan al patrón de cinco columnas, conservando además módulo, actores, descripción, precondición, aceptación y excepciones |
| RNF | Categoría, ID y descripción | Cuatro columnas con criterio separado | Se adopta la estructura de tres columnas e integra el criterio verificable dentro de la descripción |
| Casos de uso | Un diagrama individual seguido por una ficha de cuatro bloques | Tres diagramas generales y trece fichas de nueve bloques | Se mantienen los mapas generales y se añade un diagrama UML individual antes de cada CU; las fichas usan ID, descripción, flujo básico y excepciones |
| Relaciones UML | Asociación, include y extend | Asociaciones generales por actor | Los nuevos diagramas diferencian asociación, `<<include>>` y `<<extend>>` con dirección semántica |
| Base de datos | Diagramas y explicación del modelo | Cinco diagramas por dominio, inventario de 25 tablas y matriz de dominios | Se conserva la versión de El Ganadero porque representa su SQL Server real con cardinalidades y mayor legibilidad |
| Diseño de elementos | Captura de pantalla más tabla de campos | Capturas y una tabla genérica | Cada una de las cuatro capturas incorpora su tabla de campos, valores por defecto, tipo y observación |
| Continuidad | Las tablas avanzan en el flujo del documento | La primera versión forzaba páginas | Sin saltos forzados; encabezado repetible, filas divisibles y nota solo al final |
| Evidencia | Incluye factibilidades, recursos y cronograma | Incluye además trazabilidad y pruebas cuantitativas | Se conserva la evidencia adicional porque responde a la implementación real y fortalece la defensa |

## Regla de fidelidad

Sandoval controla la secuencia metodológica y el formato de las fichas. El documento original de El Ganadero controla la identidad visual, la jerarquía APA, los índices, las secciones, los anexos y el contenido real del sistema. No se copian datos del proyecto deportivo.
