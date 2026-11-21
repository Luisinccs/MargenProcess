# Guía Práctica para Definir la Estrategia de Persistencia

Esta guía anexa te ayuda a tomar las **6 decisiones clave** que necesita el prompt [`Estrategia_Persistencia.md`](file:///Users/luisdandrea/Desarrollo/MargenProcess/prompts/Estrategia_Persistencia.md) para generar el documento de arquitectura de persistencia sin que el modelo tenga que adivinar tus objetivos técnicos o de negocio.

---

## Paso a Paso: Cómo Usar Esta Guía

1. Lee las opciones de los **6 parámetros de decisión** abajo y elige la que mejor encaje con tu proyecto (naturaleza de la app + modelo de monetización).
2. Copia la **Ficha de Decisiones de Arquitectura** (Sección final de esta guía) y rellénala con tus elecciones.
3. Entrega al prompt [`Estrategia_Persistencia.md`](file:///Users/luisdandrea/Desarrollo/MargenProcess/prompts/Estrategia_Persistencia.md) los siguientes documentos:
   - Modelo Lógico de Datos
   - Requerimientos (RF / RNF / Monetización)
   - Estrategia de Monetización
   - *(Opcional)* Modelo Lógico de Procesos
   - Tu **Ficha de Decisiones de Arquitectura** rellenada

---

## Los 6 Parámetros de Decisión

### 1. Plataformas Objetivo
Define dónde correrá el producto en la versión que estás especificando (MVP o actual):

| Opción | Descripción | Implicación en Persistencia |
| :--- | :--- | :--- |
| **A. Solo Móvil Nativo** (iOS / Android) | App instalada en teléfono/tablet. | Almacenamiento local nativo (SQLite) + sistema de archivos del dispositivo. |
| **B. Móvil + Desktop** (macOS / Windows) | Apps nativas en múltiples dispositivos del usuario. | Requiere decidir si los dispositivos comparten datos (sync) o son independientes con respaldo manual. |
| **C. Incluye Versión Web** | Acceso desde navegador web además de móvil/desktop. | Casi siempre exige **Backend en la nube** (el navegador no es fiable como única fuente de datos para apps de largo plazo). |

---

### 2. Topología de Almacenamiento y Sincronización (Crucial vs. Monetización)
Es la decisión más importante porque determina **cuántos archivos CSV tendrá tu base de datos** y **si tu modelo de negocio es rentable**:

| Topología | Cuándo elegirla | Relación con Monetización | Contratos DB resultantes |
| :--- | :--- | :--- | :--- |
| **Opción 1: `Local-Only` + Exportación Manual** | Apps personales de un solo dispositivo, con alta sensibilidad de privacidad, que deben funcionar 100% *offline* y no requieren acceso web en el MVP. | **Ideal para Freemium + Pago Único (*Lifetime*).** Costo de servidor = **$0**. Tu margen del *Lifetime* no se erosiona con el tiempo. | **1 archivo:** `Tablas.csv` |
| **Opción 2: `Local-First` + Nube Personal del Usuario** *(iCloud/CloudKit, Google Drive)* | Apps nativas donde el usuario quiere respaldo automático o continuidad entre su teléfono y tablet, pero sin pagar servidores propios. | **Compatible con *Lifetime* o suscripción baja**, porque el almacenamiento corre contra la cuota de iCloud/Drive del usuario (ojo: limita multiplataforma Apple $\leftrightarrow$ Android si dependes solo de CloudKit). | **2 o 3 archivos** (tablas de negocio + tablas locales de sync/estado). |
| **Opción 3: `Híbrida Local-First` + Backend Propio** *(ej. Supabase / PostgreSQL)* | Apps con versión Web, colaboración multi-usuario, o sincronización transparente entre iOS, Android, Desktop y Web (como *CalFina*). | **Exige suscripción recurrente** para cubrir servidor, BD y almacenamiento de archivos. Nunca regales nube pesada a usuarios *Lifetime* o gratuitos. | **3 archivos:** `TablasComunes.csv`, `TablasLocales.csv`, `TablasBackend.csv` |

> **Regla de oro:** Si tu app guarda documentos pesados (fotos, PDFs) y su monetización principal es **Freemium + Pago Único (*Lifetime*)** sin versión Web en el MVP, la **Opción 1 (`Local-Only` + Exportación ZIP/JSON)** suele ser la más sana financiera y técnicamente.

---

### 3. Almacenamiento de Archivos Adjuntos y Cifrado
Si tu app maneja documentos, imágenes, comprobantes o datos personales sensibles:

- **Recomendado para archivos (fotos/PDFs):** Guardar los **archivos cifrados en el sistema de archivos local** (*filesystem* privado de la app) y almacenar en la BD únicamente los **metadatos y la ruta/referencia** (`ruta_almacenamiento_cifrado`, tamaño, formato).
  - *Por qué:* Evita inflar la base de datos SQLite con `BLOB`s de varios megabytes, mantiene consultas rápidas ($< 1\text{ s}$) y facilita exportar respaldos en `.zip`.
- **Cifrado de la Base de Datos:**
  - *Nivel estándar:* Cifrado a nivel de archivos adjuntos + protección nativa del sistema operativo (iOS Data Protection / Android EncryptedFile).
  - *Nivel estricto:* Cifrado completo de la BD SQLite (ej. SQLCipher) si los textos en las tablas también contienen información altamente sensible.

---

### 4. Política de Borrado, Respaldo y Portabilidad
- **Borrado Físico en Cascada (`ON DELETE CASCADE` / `SET NULL`):**
  - Úsalo en **`Local-Only`**. Cuando el usuario borra un registro padre, se limpian sus hijos y archivos adjuntos físicos en disco. Más simple y limpio.
- **Borrado Lógico (*Soft-Delete* con `deleted_at`):**
  - Obligatorio **solo si hay sincronización entre dispositivos**, para que otros dispositivos se enteren de que el registro fue borrado y no lo resuciten en el siguiente *sync*.
- **Respaldo / Exportación:**
  - Si hay exportación portable (`ZIP` / `JSON`), decide si es una operación efímera bajo demanda (no requiere tabla en BD, o solo un log ligero) y si incluye opción de **importar/restaurar** respaldo en un teléfono nuevo.

---

### 5. Convenciones Físicas de Esquema (Recomendaciones Probadas)
Si no tienes una preferencia estricta, estas convenciones funcionan excelente tanto para SQLite como para una futura migración a PostgreSQL:

| Aspecto | Opción Recomendada por Defecto | Alternativa | Cuándo cambiar |
| :--- | :--- | :--- | :--- |
| **Claves Primarias (PK)** | `UUID` (`TEXT`, ej. UUIDv4 o UUIDv7) | Entero autoincremental (`INT`) | Usa **UUID siempre que puedas**, incluso en *Local-Only*: evita colisiones si en el futuro agregas importación de respaldos o sincronización. Usa `UUIDv5` determinista si dos procesos pueden crear el mismo registro idempotente. |
| **Fechas de Calendario** *(ej. fecha límite)* | `INT` (`YYYYMMDD`) o `TEXT` ISO-8601 (`YYYY-MM-DD`) | `INT` Epoch ms | Usa `YYYYMMDD` o ISO `YYYY-MM-DD` para fechas sin hora (evitas bugs de zona horaria al viajar entre países). |
| **Timestamps** *(ej. fecha creación, alertas)* | `INT` (Unix Epoch ms) | `TEXT` ISO-8601 UTC | `INT` Epoch ms es compacto, ordenable y rápido en SQLite/C++/Swift/Kotlin. |
| **Booleanos** | `INT` (`0` = Falso/No, `1` = Verdadero/Sí) | `TEXT` | SQLite no tiene tipo booleano nativo; `INT 0/1` es el estándar universal. |
| **Enumeraciones / Estados** | `INT` secuencial (`1, 2, 3...`) o *Bitwise* ($1, 2, 4, 8...$) | `TEXT` (`'PENDIENTE'`, etc.) | Usa **Bitwise ($2^n$)** solo si harás consultas combinando varios estados con máscaras (`(estado & 6) != 0`, como en *CalFina*). Si son categorías simples o estados excluyentes, `INT` secuencial o `TEXT` son más legibles. |
| **Campos Derivados** | Materializar en BD solo los que se leen en listados principales y actualizarlos en la misma transacción | Calcular siempre en memoria | Si un dashboard ordena o filtra por `estado_operativo` o `porcentaje_avance`, conviene materializarlo en la tabla y marcarlo como `Campo DERIVADO`. |

---

### 6. Horizonte de Evolución (No Sobre-Ingenierizar Hoy, No Bloquear Mañana)
- Pregúntate: *¿Qué quiero evitar reescribir dentro de 1 año?*
  - Si hoy eres `Local-Only`, **no** construyas tablas de *Outbox* ni servidores ahora, **pero sí** usa `UUID` como PK y deja claras las dependencias para poder exportar/migrar datos limpiamente mañana.

---

## Plantilla: Ficha de Decisiones de Arquitectura (Copiar y Llenar)

Completa este bloque y pásalo como entrada junto a tus documentos al prompt [`Estrategia_Persistencia.md`](file:///Users/luisdandrea/Desarrollo/MargenProcess/prompts/Estrategia_Persistencia.md):

```markdown
# Ficha de Decisiones de Arquitectura — [Nombre del Proyecto]

1. **Plataformas objetivo:** [Ej. iOS y Android nativo (sin versión Web en MVP)]
2. **Motor / Tecnología preferida (si ya está definida):** [Ej. SQLite local / Por definir según recomendación]
3. **Topología de almacenamiento y sincronización:**
   - [Local-Only + Exportación manual | Local-First + Nube Personal (CloudKit/Drive) | Híbrida Local-First + Backend Propio]
   - Justificación frente a monetización: [Ej. El MVP es Freemium + Pago Único Lifetime, por lo que no debe depender de servidores pagos por usuario]
4. **Archivos adjuntos y seguridad en reposo:**
   - Almacenamiento de binarios: [Archivos cifrados en filesystem local + metadatos en BD / Object Storage remoto]
   - Cifrado de BD: [Cifrado por archivo adjunto + protección nativa del SO / SQLCipher completo]
5. **Política de borrado y respaldo:**
   - Borrado: [Físico con ON DELETE CASCADE y limpieza de archivos en disco / Soft-delete con deleted_at]
   - Respaldo/Portabilidad: [Exportación bajo demanda en ZIP/JSON (sin persistir entidad transitoria / persistiendo historial) + opción de restauración]
6. **Convenciones físicas preferidas:**
   - PKs: [UUID (TEXT) / INT autoincremental]
   - Fechas calendario vs. Timestamps: [Ej. TEXT ISO-8601 o INT YYYYMMDD para fechas; INT Unix Epoch ms para timestamps]
   - Booleanos: [INT (0/1)]
   - Enumeraciones: [INT secuencial / INT Bitwise 2^n donde aplique filtros múltiples / TEXT]
   - Campos base transversales: [Ej. created_at y updated_at solamente / Sin CAMPOS BASE / Completo con deleted_at + sync_status + version]
   - Campos derivados: [Materializar en BD los usados en tablero/ordenamiento / Calcular en memoria]
7. **Notas adicionales o restricciones:** [Ej. Preparar PKs en UUID pensando en futura expansión familiar/multi-dispositivo en v2]
```

---

## Referencia Rápida: Comparativa de Dos Perfiles Reales

| Dimensión | Perfil Tipo *MargenProcess* (MVP Personal / Lifetime) | Perfil Tipo *CalFina* (Híbrido Multi-Dispositivo + Web) |
| :--- | :--- | :--- |
| **Plataformas** | Móvil nativo (iOS / Android) | Móvil + Desktop + Web (*online-only*) |
| **Monetización** | Freemium + *Lifetime* / Anual bajo | Licencia local + Suscripción *Cloud Sync & Web* |
| **Topología** | `Local-Only` + Exportación `ZIP`/`JSON` | `Híbrida Local-First` (SQLite + Supabase/CloudKit) |
| **Adjuntos** | Fotos/PDFs cifrados en *filesystem* local | URL / ruta local de comprobante |
| **Borrado** | Físico (`CASCADE`) + limpieza de archivo | Lógico (`deleted_at`) + `OUTBOX_LOG` |
| **Contratos DB** | **1 archivo:** `Tablas.csv` | **3 archivos:** `TablasComunes.csv`, `TablasLocales.csv`, `TablasBackend.csv` |
