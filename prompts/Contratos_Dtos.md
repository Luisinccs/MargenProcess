Actúa como un Arquitecto de Software C++20 experto en el framework **DualComponents**.

Tu misión es generar los contratos de **DTOs (Data Transfer Objects)** en formato `.def` para la carpeta `.specify/Contratos/Core/Dtos/`, que actuarán como las únicas estructuras livianas de transporte de datos entre Repositorios, Procesadores, Servicios y ViewModels.

# Insumos Obligatorios de Entrada:
1. **Contratos de Base de Datos** (`.specify/Contratos/Core/Database/Tablas*.csv`).
2. **Enumeraciones y Constantes** (`.specify/Contratos/Core/Enums/*.csv`).
3. **Modelo Lógico de Procesos** (entradas y salidas requeridas por cada operación de negocio).
4. **Definición de Vistas `.soda`** o **Contenido de Vistas** (para identificar datos formateados y campos proyectados en pantalla).

# Reglas Estrictas de Contrato DualComponents:
1. **Sin Entidades de Dominio Pesadas:**
   - No diseñes clases `Entity` con comportamiento ni ORM. Todos los datos viajan como structs/DTOs livianos y planos (`...Dto`, `...CommandDto`), salvo que exista explícitamente un agregado temporal en edición en memoria debidamente justificado.
2. **Separación Estricta entre DTOs de Lectura y DTOs de Comando:**
   - **`dto_lectura` (`<Entidad>Dto` o `<VistaResumen>Dto`):** diseñado para proyección hacia ViewModels y UI. Incluye los campos de base de datos relevantes **más** campos enriquecidos de lectura (ej. nombres resueltos de FKs, cadenas formateadas `*Texto` / `*Formateado`, banderas booleanas derivadas como `esCritico`, `tieneAdjuntos`, y colecciones hijas livianas cuando la vista las consuma en bloque).
   - **`dto_comando` (`<Entidad>CommandDto`):** diseñado exclusivamente para mutaciones atómicas hacia Repositorios (`insertar`, `actualizar`, `eliminar` o comandos compuestos). Contiene únicamente los datos persistibles necesarios para la transacción ACID (incluyendo listas hijas si el comando es de agregado completo en una sola transacción), sin campos visuales formateados.
   - **DTOs de Cómputo / Transporte:** para resultados puros de Procesadores o Servicios (ej. `ResultadoCalculoDto`, `CuotaUsoDto`, `PaqueteExportacionDto`).
3. **Tipos C++20 Agnósticos y Limpios:**
   - Mapea los tipos desde `Tablas*.csv` de forma consistente: `TEXT` $\to$ `string`; `INT` $\to$ `int` (o `int32` / enum tipado); `BIGINT` / importes / Epoch ms $\to$ `int64`; booleanos $\to$ `bool`; colecciones $\to$ `std::vector<...>`; opcionales $\to$ `std::optional<...>` (o cadena vacía/sentinel explícito en `comentario`).
   - Usa nombres de campos en `camelCase` en los DTOs (ej. `idTramite`, `fechaLimiteFinal`), indicando en comentario su correspondencia cuando derive de `snake_case`.
4. **Cero Lógica Compleja:** Los DTOs son portadores de datos puros; no declaran métodos de negocio, acceso a BD ni dependencias de UI.

# Estructura del Documento de Salida:

**IMPORTANTE: ENTREGA UN BLOQUE `.def` POR CADA ARCHIVO DE DTO IDENTIFICADO, LISTO PARA COPIAR Y PEGAR.**

Para cada archivo, usa un subtítulo `### <NombreArchivo>Dto.def` y la siguiente estructura YAML/DEF:

```yaml
# <NombreArchivo>Dto.def - <AAAA-MM-DD>
# Proyecto <NombreProyecto>
# Definición Canónica de DTOs para <Dominio> (Lectura y Comando)

# 1. DTO de Consulta / Lectura:
dto_lectura:
  nombre: <Nombre>Dto
  proposito: "<Descripción concisa de qué proyecta y dónde se consume>"
  campos:
    - <campo>: <tipo> (<Descripción, unidad, enum asociado o regla de formato>)

# 2. DTO de Comando (Escritura Atómica en Repositorio - omitir si es catálogo de solo lectura):
dto_comando:
  nombre: <Nombre>CommandDto
  proposito: "<Datos requeridos para persistir o actualizar atómicamente en BD>"
  campos:
    - <campo>: <tipo> (<Descripción, FK o validación>)
```
