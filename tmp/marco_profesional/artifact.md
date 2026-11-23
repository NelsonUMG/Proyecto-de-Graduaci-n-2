# Contrato de formato: MARCO DE ANEXOS

## Referencia

- Documento autoridad: `C:\Users\Nelson\Desktop\Proyecto de Graduación\MARCO DE ANEXOS.docx`
- SHA-256: `6EC8680D2C9F8154AD6E1F5A73A56D2368FB114D681B895428658A48EC8B2FDA`
- Evidencia visual equivalente: `C:\Users\Nelson\Desktop\Proyecto de Graduación\MARCO DE ANEXOS.pdf`
- Extensión observada: 76 páginas, 6 secciones.
- Evidencia de auditoría y render: `tmp\marco_profesional\master_pages`, `master_detail` y `master_contact`.

## Sistema de página

- Papel Carta, orientación vertical, 8.5 x 11 pulgadas.
- Márgenes de 1 pulgada en los cuatro lados.
- Las seis secciones conservan la geometría anterior; la sexta es continua.
- Numeración preliminar romana centrada y numeración principal arábiga en la esquina superior derecha, según la sección existente.
- No modificar encabezados, pies de página, saltos de sección ni portadas.

## Tipografía y ritmo

- Fuente predeterminada: Times New Roman, 12 puntos, idioma español de Guatemala.
- Texto normal: interlineado doble, 8 puntos después y sangría de primera línea de 0.5 pulgadas.
- Capítulo: estilo `Heading 1`, centrado y negrita.
- Sección: estilo `Heading 2`, alineado a la izquierda y negrita.
- Subsección: estilo `Heading 3`, alineado a la izquierda, negrita y cursiva.
- Los títulos conservan el comportamiento de mantener con el párrafo siguiente.
- Las tablas y figuras no usan sangría de primera línea.

## Tablas del capítulo metodológico

- Rótulo en párrafo separado: `Tabla` + campo `SEQ Tabla`, negrita, 12 puntos.
- Título debajo del rótulo: cursiva, 12 puntos.
- Para esta revisión se adopta la cuadrícula completa y compacta observada en el capítulo metodológico de Sandoval, por solicitud expresa del usuario.
- Todos los bordes exteriores e interiores se definen de forma explícita; no se admiten reglas horizontales aisladas después de combinaciones de celdas.
- Ancho total máximo: 6.25 pulgadas, con anchos de columna explícitos en DXA.
- Autoajuste desactivado; las filas crecen con el contenido y no tienen altura fija.
- Encabezado repetido en cada página; filas marcadas para no dividirse cuando sea posible.
- Celdas con márgenes internos uniformes; valores breves centrados y descripciones alineadas a la izquierda.
- Texto interno de 10.5 a 11 puntos, interlineado sencillo y 3 puntos después.
- Nota debajo: `Nota.` en cursiva y explicación en redonda.

## Figuras APA 7

- Rótulo en párrafo separado: `Ilustración` + campo `SEQ Ilustración`, negrita, 12 puntos.
- Título debajo en cursiva, 12 puntos.
- Imágenes insertadas en línea, centradas, sin anclaje flotante.
- Ancho máximo 6.2 pulgadas; proporción preservada y fuente de alta resolución.
- Nota debajo con `Nota.` en cursiva.
- El rótulo, título e imagen deben permanecer juntos siempre que la paginación lo permita.

## Índices y campos

- Índice general existente: campo `TOC \\o "1-3" \\h \\z \\u`.
- Índice de tablas existente: campo `TOC \\h \\z \\c "Tabla"`.
- Índice de ilustraciones existente: campo `TOC \\h \\z \\c "Ilustración"`.
- Todos los títulos de capítulo/sección/subsección usarán estilos Heading 1/2/3 reales.
- Todas las tablas e ilustraciones nuevas usarán campos SEQ con las mismas etiquetas del documento.
- `w:updateFields` debe quedar habilitado para actualizar títulos, números, páginas e índices al abrir en Word.

## Flujo y ranura editable

- Preservar íntegramente desde el inicio hasta el párrafo anterior a `Capítulo III – Marco Metodológico`.
- Sustituir únicamente el cuerpo del capítulo III.
- Preservar íntegramente desde `Anexos` hasta el final.
- Mantener el salto de página previo al capítulo III y el inicio de `Anexos` en página nueva.
- El capítulo III seguirá el orden de contenido del PDF `Marco_Metodologico.pdf`, adaptado al sistema veterinario real.

## Preservación del paquete

- Preservar estilos, temas, numbering, headers, footers, notas, relaciones, customXml, propiedades y medios ajenos al capítulo III.
- Se permiten cambios en `word/document.xml`, `word/_rels/document.xml.rels`, `word/media/*`, `[Content_Types].xml` y `word/settings.xml` solo para el capítulo sustituido, sus figuras y actualización de campos.
- No modificar el documento autoridad.

## Puertas de fidelidad

- El documento autoridad debe conservar el SHA-256 registrado.
- Deben mantenerse 6 secciones, Carta vertical y márgenes de 1 pulgada.
- `Anexos` y `Referencias` deben permanecer después del capítulo III.
- No se aceptan encabezados partidos, texto encimado, filas con altura fija, tablas vacías, figuras con texto recortado ni leyendas estáticas.
- Se ejecutarán auditorías de secciones, encabezados, imágenes, campos, geometría de tablas e integridad ZIP.
- La renderización DOCX se intentará con el renderer oficial; si LibreOffice continúa ausente, la revisión visual se respaldará con la evidencia PDF del documento autoridad y auditoría estructural del resultado.

## Ejecución ampliada de requerimientos

- Salida: `C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO\output\MARCO_DE_ANEXOS_PROFESIONAL_APA7_REQUERIMIENTOS.docx`.
- Alcance documental: REQ001-REQ031, RNF001-RNF015 y CU001-CU013.
- Modelo de datos: cinco diagramas relacionales sin flechas de secuencia, con cardinalidades y 25 tablas físicas inventariadas.
- Evidencia visual: cuatro capturas obtenidas de `/cliente/acceso`, `/empleado/acceso`, `/admin/acceso` y recuperación de clave.
- Resultado estructural: 6 secciones, 66 tablas totales, 59 tablas nuevas con geometría DXA válida, 48 imágenes en línea, 64 campos `SEQ Tabla`, 20 campos `SEQ Ilustración` y 3 campos TOC.
- Campos: 150 inicios de campo marcados como pendientes y `w:updateFields=true` para actualizar índices y páginas al abrir en Word.
- Preservación: bloques anteriores al capítulo III y bloques desde `Anexos` coinciden con el documento autoridad; SHA-256 del original sin cambios.
- Limitación de QA: el renderer oficial no pudo ejecutarse porque LibreOffice/soffice no está instalado. Se inspeccionaron individualmente las figuras nuevas y se completaron auditorías estructurales, de campos, encabezados, imágenes, accesibilidad y geometría.

## Referencia de continuidad de tablas

- Documento de referencia: `C:\Users\Nelson\Desktop\Entrega10-DefensaDeTesis-PGII-CarlosSandoval.docx`.
- SHA-256: `71F4C5441F6B611F19A487308890CDFE19D81825254975E3C8E8DAE0711B32D0`.
- Patrón aplicado: las tablas del Marco Metodológico permanecen en el flujo normal, sin salto de página forzado antes de cada ficha.
- Una tabla extensa conserva un único rótulo y título; al continuar en la página siguiente repite solamente la fila de encabezado.
- Las filas no se marcan con `w:cantSplit`, por lo que Word puede dividir una fila extensa cuando sea necesario y aprovechar el espacio disponible.
- La nota APA aparece una sola vez, después de la última fila de la tabla completa.
- Salida revisada: `C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO\output\MARCO_DE_ANEXOS_PROFESIONAL_APA7_TABLAS_CONTINUADAS.docx`.

## Corrección comparativa con Sandoval

- Comparativa detallada: `C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO\tmp\marco_profesional\comparativa_sandoval.md`.
- Salida final: `C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO\output\MARCO_DE_ANEXOS_APA7_ESTRUCTURA_SANDOVAL_CORREGIDA.docx`.
- Se revisó el Capítulo III completo de Sandoval, sus títulos, subtítulos, 32 tablas del capítulo, 15 pares de diagrama/ficha de caso de uso, base de datos, diseño de elementos, arquitectura, factibilidades, recursos y cronograma.
- Las 31 fichas REQ de El Ganadero adoptan el patrón de cinco columnas y funciones numeradas, sin perder actores, precondiciones, criterios de aceptación ni excepciones.
- Los 13 CU del sistema cuentan con diagrama UML individual y ficha inmediata de cuatro bloques: ID, descripción, flujo básico y excepciones.
- Los diagramas distinguen asociación, `<<include>>` y `<<extend>>`; se conservaron además tres mapas generales por rol.
- Las cuatro capturas de acceso y recuperación cuentan con tabla de campos, valores por defecto, tipo y observación.
- La descripción del problema adopta la matriz de tres preguntas y los RNF usan categoría, ID y descripción con criterio verificable integrado.
- Resultado estructural: 6 secciones, 70 tablas, 61 imágenes en línea, 68 campos `SEQ Tabla`, 33 campos `SEQ Ilustración`, 3 campos TOC y 167 campos marcados para actualización.
- Las 63 tablas nuevas tienen geometría DXA válida; 62 repiten encabezado y la matriz del problema carece intencionalmente de fila de encabezado. Ninguna fila nueva usa `w:cantSplit` y no existen saltos de página forzados dentro del capítulo.
- La actualización y exportación mediante Word no pudo automatizarse por el error COM `0x80070520`; `w:updateFields=true` queda configurado para que Word actualice índices y numeración al abrir.

## Revisión visual final solicitada

- Salida: `C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO\output\MARCO_DE_ANEXOS_APA7_SANDOVAL_REVISION_VISUAL_FINAL.docx`.
- SHA-256: `6DE17DC1574B4B25B0E53BCE4CF30D7191326B72DBE39D19176881D83D60B41F`.
- El capítulo usa exactamente la secuencia solicitada desde `3.1 Antecedentes` hasta `3.16 Cronograma de Actividades del Proyecto`, incluidos `3.14.4.1`, `3.14.4.2`, `3.14.4.3` y `3.14.5.1`.
- Las 31 fichas REQ se simplificaron al patrón compacto de Sandoval: identificación, prioridad, nombre, número de función y funcionalidad.
- Las 62 tablas nuevas tienen cuadrícula completa, geometría DXA válida, filas divisibles y continuidad automática; no existen saltos de página forzados dentro del capítulo.
- Los 13 casos de uso conservan ficha de cuatro bloques y diagramas individuales con el patrón visual azul de la referencia.
- Diseño de elementos incorpora cinco capturas reales: cliente, empleado, administrador, registro de cliente y recuperación de contraseña; cada una tiene tabla de campos.
- Resultado: 6 secciones, 69 tablas totales, 62 imágenes en línea, 67 campos `SEQ Tabla`, 34 campos `SEQ Ilustración`, 3 campos TOC y 167 campos pendientes de actualización automática.
- Integridad ZIP aprobada; documento autoridad y anexos preservados. El renderer oficial no pudo ejecutarse porque LibreOffice no está instalado y Word no autorizó automatización en esta sesión.
