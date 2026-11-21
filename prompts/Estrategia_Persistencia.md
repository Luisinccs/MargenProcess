Actúa como un Arquitecto de Software Senior especializado en Estrategias de Persistencia (Local-Only, Local-First, Sincronización Distribuida, Seguridad en Reposo y Alineación con Modelos de Monetización).

Tu misión es generar el documento canónico de **Estrategia de Persistencia** (`EstrategiaPersistencia.md`) para el proyecto, que servirá como puente técnico entre los documentos conceptuales/negocio y los contratos físicos de base de datos (`.specify/Contratos/Core/Database/*.csv`), repositorios y servicios de almacenamiento.

# Insumos Obligatorios de Entrada:
1. **Modelo Lógico de Datos** (entidades, atributos, rangos/valores aceptados, relaciones y clasificación de entidades persistentes vs. transitorias).
2. **Requerimientos Funcionales y No Funcionales** (disponibilidad offline, latencia, seguridad/cifrado, notificaciones persistentes, portabilidad/exportación).
3. **Estrategia de Monetización** (planes, límites cuantitativos, modelo de cobro *Freemium* / *Lifetime* / *Suscripción*, restricciones de costos de infraestructura).
4. **Ficha de Decisiones de Arquitectura del Proyecto** (parámetros elegidos por el usuario: plataformas objetivo, topología de almacenamiento/sincronización, motor(es) de persistencia, política de adjuntos/cifrado, respaldo y preferencias de convenciones físicas).
5. **Insumo Recomendado (si existe):** **Modelo Lógico de Procesos** (para identificar patrones de consulta/filtrado, campos calculados/derivados, transacciones atómicas y manejo de binarios).

# Reglas Estrictas de Análisis, Coherencia y Proporcionalidad:
1. **Validación Cruzada Monetización $\leftrightarrow$ Topología:**
   - Evalúa explícitamente si la topología elegida es financieramente sostenible respecto a la estrategia de monetización (por ejemplo: almacenar binarios pesados en un servidor propio para usuarios *Lifetime* o gratuitos sin cuota recurrente compromete la rentabilidad).
   - Si detectas una inconsistencia o riesgo entre las decisiones de entrada y los requerimientos/monetización, documéntalo de forma destacada en la Sección 1 con la mitigación o ajuste recomendado.
2. **Validación Offline $\leftrightarrow$ Almacenamiento Primario:**
   - Si los requerimientos exigen consulta/operación sin conexión (*offline-ready*) o entrega confiable de alertas tras reinicio del dispositivo, la fuente de verdad primaria en clientes nativos debe ser local (ej. SQLite), nunca exclusivamente remota.
3. **Proporcionalidad Arquitectónica (Cero Sobre-Ingeniería):**
   - **Si la topología es `Local-Only` (sin sincronización remota):** NO introduzcas tablas técnicas de sincronización (`OUTBOX_LOG`, `SYNC_LOG_GLOBAL`, `HISTORICO_CONFLICTOS`), políticas RLS ni borrado lógico complejo si no se justifica; mantén una arquitectura simple y declara explícitamente que los contratos de BD se generarán en **un único archivo** (`Tablas.csv`).
   - **Si la topología es `Local-First + Nube Personal` (ej. CloudKit / Google Drive) o `Híbrida Local-First + Backend Propio` (ej. SQLite + Supabase/PostgreSQL):** especifica las capas locales y remotas, los mecanismos de delta/sync, orden transaccional (`id_transaccion_sync`), resolución de conflictos, RLS multi-tenant (si aplica) y declara si los contratos de BD se dividirán en **múltiples archivos** (`TablasComunes.csv`, `TablasLocales.csv`, `TablasBackend.csv`).
4. **Cobertura Total de Entidades del Modelo Lógico:**
   - Ninguna entidad del Modelo Lógico de Datos puede quedar ambigua. Clasifica el 100% de ellas en una de las siguientes categorías:
     - *Persistente en BD* (indicando en qué archivo/capa vive).
     - *Persistente Híbrida* (metadatos en BD + payload binario cifrado en sistema de archivos / *object storage*).
     - *Transitoria / Efímera* (solo en memoria o flujo de exportación bajo demanda; excluida de tablas físicas, o justificar si se persiste como bitácora).
5. **Convenciones Físicas Inequívocas (Preparación Directa para Contratos CSV):**
   - Define de forma cerrada y sin ambigüedades:
     - **Claves Primarias (PK):** tipo físico y estrategia de generación (`UUIDv4`, `UUIDv7`, `UUIDv5` determinista o entero) justificando compatibilidad con futuros respaldos o sync.
     - **Fechas y Tiempos:** tipo físico exacto (ej. `INT` Unix Epoch ms para timestamps, `INT YYYYMMDD` para fechas calendario, o `TEXT` ISO-8601) y manejo de zonas horarias.
     - **Booleanos y Enumeraciones:** mapeo físico exacto desde los literales del Modelo Lógico (`INT 0/1` para booleanos; `INT` secuencial, `INT` *bitwise* en potencias de 2 $2^n$ cuando existan consultas/filtros combinables, o `TEXT` restringido).
     - **Campos Base Transversales (`CAMPOS BASE`):** indicar exactamente qué columnas base (si alguna) heredan las tablas de negocio (`created_at`, `updated_at`, `deleted_at`, `sync_status`, `version`).
     - **Campos Derivados / Materializados:** listar explícitamente qué campos calculados se persisten en BD (por rendimiento $O(1)$) vs. cuáles se calculan en memoria, y qué operación los recalcula atómicamente.
     - **Borrado e Integridad Referencial:** borrado físico en cascada (`ON DELETE CASCADE` / `SET NULL`) vs. borrado lógico (`deleted_at`), incluyendo comportamiento ante autorreferencias y FKs opcionales.
     - **Índices y Unicidad:** listar índices críticos de consulta, claves únicas simples/compuestas e índices únicos parciales.

# Estructura del Documento de Salida:

**IMPORTANTE: ÚNICO DOCUMENTO EN UN FRAGMENTO COMPLETO DE CÓDIGO FUENTE CON FORMATO MARKDOWN LISTO PARA COPIAR Y PEGAR.**

Genera un documento Markdown completo con exactamente la siguiente estructura:

```markdown
# Estrategia de Persistencia y Arquitectura de Datos — [Nombre del Proyecto]

**Fecha:** [AAAA-MM-DD]  
**Topología Seleccionada:** [Local-Only | Local-First + Nube Personal | Híbrida Local-First + Backend]  
**Formato de Contratos DB Resultante:** [Archivo único: `Tablas.csv` | Esquema dividido: `TablasComunes.csv`, `TablasLocales.csv`, `TablasBackend.csv`]

---

## 1. Alineación con Producto, RNF y Estrategia de Monetización
- **Resumen de decisiones de entrada:** plataformas objetivo, modelo comercial y restricciones clave.
- **Matriz de coherencia:** tabla que cruza cada RNF crítico y regla de monetización con la decisión de persistencia adoptada.
- **Riesgos o advertencias detectadas (si aplican):** análisis de sostenibilidad económica/técnica y su mitigación.

---

## 2. Topología y Arquitectura de Almacenamiento
- Descripción clara de las capas de almacenamiento (BD local, *filesystem*, servicios nativos, backend remoto si aplica).
- **Diagrama de Arquitectura (Mermaid `flowchart`):** mostrando componentes, flujo de datos, cifrado y límites de red.
- *(Solo si hay sincronización)* **Flujo de Sincronización / Resolución de Conflictos (Mermaid `sequenceDiagram` o tabla de reglas por entidad).**

---

## 3. Clasificación de Entidades del Modelo Lógico
| Entidad (Modelo Lógico) | Naturaleza | Capa / Destino | Archivo Contrato DB | Notas de Almacenamiento |
| :--- | :--- | :--- | :--- | :--- |
| `[ENTIDAD]` | Persistente / Híbrida / Transitoria | Local / Común / Backend / Memoria | `Tablas.csv` / N/A | ... |

*(Si existen tablas técnicas adicionales como outbox, estado local, sync log o perfiles, incluir una subtabla explícita listándolas).*

---

## 4. Política de Archivos Adjuntos, Cifrado y Privacidad
- Dónde y cómo se almacenan archivos binarios/imágenes/PDFs (nunca *BLOBs* pesados si se usa *filesystem* cifrado).
- Mecanismo de cifrado en reposo (y en tránsito si aplica) y gestión de claves en el dispositivo.
- Comportamiento de lectura/previsualización *offline* y limpieza de archivos huérfanos al eliminar registros.

---

## 5. Convenciones Físicas de Esquema (Reglas para Contratos CSV)
- **5.1 Tipos de Datos Permitidos:** (`TEXT`, `INT`, `BIGINT`, etc.).
- **5.2 Identificadores (PK / FK):** estrategia de generación (ej. `UUIDv4` / `UUIDv5` / `INT`).
- **5.3 Fechas y Horas:** representación física exacta y tratamiento de zona horaria.
- **5.4 Booleanos y Enumeraciones:** tabla de conversión desde valores lógicos hacia representación física (indicando expresamente qué enums son *bitwise* $2^n$ y cuáles secuenciales o texto).
- **5.5 Bloque `CAMPOS BASE`:** lista exacta de columnas transversales (o indicación explícita de omitir `CAMPOS BASE` si no aplica).
- **5.6 Campos Derivados y Atomicidad Transaccional:** qué valores calculados se materializan y en qué transacciones atómicas se recalculan.
- **5.7 Política de Borrado, Integridad Referencial e Índices:** reglas `CASCADE`/`SET NULL` o `deleted_at`, autorreferencias e índices recomendados.

---

## 6. Respaldo, Portabilidad, Límites Freemium y Almacenamiento
- Formato y flujo de exportación/importación portable (si aplica).
- Cómo la capa de persistencia consulta y hace cumplir los topes cuantitativos del plan gratuito.
- Manejo de errores críticos de almacenamiento (*storage full*, fallos de escritura y rollback transaccional).

---

## 7. Directrices Resumen para la Generación de Contratos de Base de Datos
Checklist final conciso con las reglas exactas que deberá aplicar el prompt generador de `.specify/Contratos/Core/Database/*.csv`.
```
