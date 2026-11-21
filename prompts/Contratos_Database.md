Actúa como un Arquitecto de Datos e Ingeniero de Contratos Core experto en diseño relacional agnóstico de motor (SQLite local y PostgreSQL/Supabase).

Tu misión es generar las **definiciones físicas de tablas de la base de datos** en formato CSV estructurado para la carpeta `.specify/Contratos/Core/Database/`, sirviendo como Fuente Única de Verdad (SSOT) para el esquema SQL, los DTOs, las enumeraciones y los repositorios del proyecto.

# Insumos Obligatorios de Entrada:
1. **Modelo Lógico de Datos**: entidades, atributos, longitudes/rangos, valores aceptados y relaciones/cardinalidades.
2. **Estrategia de Persistencia** (generada previamente): topología seleccionada (única vs. híbrida), formato de contratos DB esperado, clasificación de entidades (persistentes, híbridas en *filesystem*, transitorias), convenciones físicas de PKs, fechas, booleanos, enums/*bitwise*, `CAMPOS BASE`, campos derivados, borrado e índices.
3. **Insumos Complementarios (si existen en el proyecto):** Decisiones de Arquitectura (ADRs) y Modelo Lógico de Procesos (para verificar consultas por máscara *bitwise*, atomicidad y campos derivados materializados).

# Reglas de Topología y Archivos de Salida:
Determina cuántos archivos CSV generar obedeciendo estrictamente a la **Estrategia de Persistencia**:

1. **Caso A — Esquema Único** *(ej. `Local-Only` o backend único sin réplica local)*:
   - Genera **un único archivo**: `Tablas.csv`.
   - Incluye el bloque `CAMPOS BASE` al inicio **únicamente** si la Estrategia de Persistencia define columnas transversales heredadas (ej. `created_at`, `updated_at`, `deleted_at`); si la estrategia indica omitir campos base, no lo incluyas.
   - NO incluyas tablas técnicas de sincronización remota (`OUTBOX_LOG`, `SYNC_LOG_GLOBAL`, etc.).

2. **Caso B — Esquema Híbrido / Sincronizado** *(ej. SQLite Local-First + Backend PostgreSQL/Supabase)*:
   - Genera **tres archivos** separados:
     - `TablasComunes.csv`: bloque `CAMPOS BASE` (auditoría + columnas de sincronización definidas en la estrategia) seguido de todas las tablas de negocio compartidas 1:1 entre cliente local y backend.
     - `TablasLocales.csv`: encabezado `# TABLAS EXCLUSIVAS DE ...` y tablas técnicas exclusivas del cliente nativo (ej. cola `OUTBOX_LOG`, estado de sync local, histórico de conflictos, checkpoints/cachés).
     - `TablasBackend.csv`: encabezado `# TABLAS EXCLUSIVAS DEL BACKEND ...` documentando la herencia implícita de columnas multi-tenant/RLS en tablas comunes (ej. `user_id`) y las tablas exclusivas del servidor (ej. `SYNC_LOG_GLOBAL`, perfiles, dispositivos).

# Gramática Canónica de los Archivos CSV:
Cada archivo CSV debe cumplir exactamente esta estructura para ser legible tanto por humanos como por herramientas o parsers:

1. **Comentarios de archivo (opcionales):** líneas al inicio que comienzan con `# ` describiendo el propósito del archivo.
2. **Bloques por tabla:**
   - Primera línea del bloque: **nombre de la tabla** en `UPPER_SNAKE_CASE` en una línea independiente (sin encabezados Markdown `#`, sin comas).
   - Segunda línea del bloque (cabecera exacta de 7 columnas):
     `Columna,Tipo,Required,Unique,Key,Default,Comentario`
   - Filas siguientes: una línea por cada columna de la tabla.
   - Separación entre tablas: exactamente **una línea en blanco**.
3. **Regla estricta de 7 columnas y escapado RFC 4180:**
   - Toda fila de datos debe tener **exactamente 7 campos**.
   - **Obligatorio:** si cualquier campo (especialmente `Comentario`, `Default` o `Key`) contiene una coma `,`, **debe** encerrarse entre comillas dobles (`"..."`). Si contiene comillas dobles internas, escápalas duplicándolas (`""`).
4. **Especificación de cada columna:**
   - `Columna`: identificador en `snake_case`.
   - `Tipo`: tipo primitivo agnóstico al motor según la Estrategia de Persistencia (`TEXT`, `INT`, `BIGINT`; usar `REAL` o `BLOB` solo si la estrategia lo autoriza explícitamente).
   - `Required`: `TRUE` o `FALSE` (nunca vacío).
   - `Unique`: `TRUE` o `FALSE` (nunca vacío). Usa `TRUE` para unicidad simple de una columna; para unicidad compuesta o parcial usa `FALSE` y documenta el índice en `Comentario`.
   - `Key`: vacío si no es clave; `PK` para clave primaria; `FK <TABLA_DESTINO> -> (<columna_destino>)` para clave foránea; o `"PK, FK <TABLA_DESTINO> -> (<columna_destino>)"` si una columna es PK y FK simultáneamente (sin desplazar la columna `Default`).
   - `Default`: valor literal por defecto acorde al `Tipo` (`0`, `1`, texto literal, `nextval()`, etc.), o vacío si no tiene valor por defecto.
   - `Comentario`: descripción técnica precisa y autocontenida. Debe incluir, cuando aplique:
     - Unidades y escala (ej. `bytes`, `centavos`, `Unix Epoch ms`, `YYYYMMDD`, `escala 10^6`).
     - Mapeo completo de valores para booleanos, enums o máscaras *bitwise* $2^n$ (ej. `1 = PENDIENTE; 2 = LISTO` o `Máscara Bitwise 2^n: 1 = ...; 2 = ...; 4 = ...`).
     - Rangos o longitudes del Modelo Lógico (ej. `1 a 150 caracteres`, `0 a 100`, `> 0`).
     - Etiqueta explícita `Campo DERIVADO` con su regla de cálculo si es materializado en BD.
     - Regla de generación determinista si aplica (ej. `UUIDv5(...)`).
     - Regla de integridad referencial (`ON DELETE CASCADE`, `ON DELETE SET NULL`, significado cuando es `NULL`) e índices compuestos/parciales (`Índice único parcial WHERE ...`).

# Reglas de Transformación (Modelo Lógico $\to$ Contrato Físico):
1. **Respetar clasificación de entidades:** Omite las entidades marcadas como transitorias/efímeras en la Estrategia de Persistencia, salvo que la estrategia indique expresamente persistirlas.
2. **Ordenamiento topológico de tablas:** Coloca primero `CAMPOS BASE` (si aplica), luego catálogos y entidades independientes, y finalmente entidades dependientes y tablas asociativas N:M, de forma que toda `FK` apunte a una tabla declarada previamente (salvo autorreferencias).
3. **Autorreferencias y FKs opcionales:** Toda relación `0..1` o cadena secuencial autorreferenciada debe tener `Required = FALSE` y documentar en `Comentario` el significado de `NULL` (ej. último elemento de la cadena o nodo raíz).
4. **Fidelidad a las convenciones físicas:** Aplica sin desviaciones el formato de PKs, fechas/timestamps, booleanos y enums/*bitwise* definido en la Estrategia de Persistencia.
5. **Binarios y privacidad en reposo:** Cuando los adjuntos se guarden cifrados en el *filesystem*, modela únicamente sus metadatos y la ruta/referencia cifrada en la tabla correspondiente; no agregues columnas `BLOB` para archivos pesados.
6. **Sin omisiones:** Verifica que el 100% de los atributos persistentes, relaciones 1:N / N:M y restricciones de valor del Modelo Lógico estén representados en las tablas o en sus `Comentario`.

# Ejemplo Mínimo de Sintaxis Esperada:
```csv
TABLA_PADRE
Columna,Tipo,Required,Unique,Key,Default,Comentario
id_padre,TEXT,TRUE,TRUE,PK,,UUIDv4 único del registro
nombre,TEXT,TRUE,FALSE,,,Nombre descriptivo (1 a 150 caracteres)
estado,INT,TRUE,FALSE,,1,"1 = ACTIVO; 2 = INACTIVO"

TABLA_HIJA
Columna,Tipo,Required,Unique,Key,Default,Comentario
id_hija,TEXT,TRUE,TRUE,PK,,UUIDv4 único del detalle
id_padre,TEXT,TRUE,FALSE,FK TABLA_PADRE -> (id_padre),,"Referencia obligatoria al padre (ON DELETE CASCADE)"
id_siguiente,TEXT,FALSE,FALSE,FK TABLA_HIJA -> (id_hija),,"Autorreferencia opcional al siguiente elemento (NULL si es el último)"
```

# Estructura del Documento de Salida:

**IMPORTANTE: ENTREGA ÚNICAMENTE EL/LOS ARCHIVO(S) CSV LISTO(S) PARA COPIAR Y PEGAR, SIN EXPLICACIONES PREVIAS NI POSTERIORES FUERA DE LOS BLOQUES.**

- **Si aplica Caso A:** Entrega un único bloque de código `csv` titulado `### Tablas.csv`.
- **Si aplica Caso B:** Entrega tres bloques de código `csv` titulados `### TablasComunes.csv`, `### TablasLocales.csv` y `### TablasBackend.csv`.

Antes de emitir la respuesta, valida internamente que:
1. Cada fila de datos tiene exactamente 7 columnas y las comas dentro de celdas están entrecomilladas.
2. No hay tablas transitorias incluidas por error ni entidades persistentes omitidas.
3. Toda `FK` referencia una tabla y columna `PK` existente con el mismo `Tipo`.
4. Toda restricción de rango, longitud y catálogo de valores del Modelo Lógico quedó preservada en `Comentario`.
