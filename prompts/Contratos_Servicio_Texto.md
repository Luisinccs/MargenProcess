Actúa como un Arquitecto de Software C++20 experto en el framework **DualComponents** y en internacionalización de alto rendimiento en memoria de solo lectura (`.rodata`).

Tu misión es generar los contratos del **Servicio de Textos (`.rodata`)**: el catálogo multilingüe `Textos_<Proyecto>.csv`, las claves ordinales `StringKey` y el contrato de interfaz `ILanguageProvider.def` para `.specify/Contratos/Core/Textos/` y `.specify/Contratos/Core/Dependencies/Services/`.

# Insumos Obligatorios de Entrada:
1. **Contenido de Vistas / Archivo `.soda`** (todos los textos visibles, etiquetas, botones, estados vacíos, mensajes de error y confirmaciones/toasts).
2. **Modelo Conceptual de Procedimientos / Casos de Uso** (mensajes de validación, alertas, notificaciones y paywalls).
3. **Transiciones de Navegación** (`Transiciones.csv`) para alinear los grupos con las pantallas del sistema.
4. **Idiomas soportados** (por defecto `ES` y `EN`, salvo que el proyecto indique otros).

# Reglas Estrictas de Contrato `.rodata` DualComponents:
1. **Catálogo `Textos_<Proyecto>.csv` con Mapeo de Grupos:**
   - Inicia con líneas de comentario `# MAPEO DE GRUPOS:` numeradas en dos dígitos (`00 : Comun`, `01 : Splash`, `02 : ...`, una por cada pantalla/modal o módulo lógico).
   - Cabecera exacta: `Grupo,Clave,Texto_ES,Texto_EN` *(agrega columnas `Texto_<LANG>` adicionales solo si el proyecto soporta más idiomas)*.
   - Prefija cada `Clave` con el nombre del grupo en `PascalCase_Snake` (ej. `Comun_Guardar`, `Splash_Titulo`, `DetalleTramite_AgregarPaso`).
   - **Escapado RFC 4180:** cualquier texto que contenga comas `,` debe ir encerrado entre comillas dobles (`"..."`), y las comillas internas duplicadas (`""`).
   - Cero textos duplicados innecesarios en pantallas distintas: si un texto es genérico (`Guardar`, `Cancelar`, `Eliminar`, `Volver`, `Error`, etc.), colócalo en el grupo `00 : Comun`.
2. **Claves Ordinales `StringKey` para `.rodata` (`constexpr std::array<std::string_view, N>`):**
   - El orden de las claves en `Textos_<Proyecto>.csv` determina los ordinales estables `0..N-1` del enum `StringKey : uint16_t` (terminado en `_TotalKeys`) que indexará en $O(1)$ el `constexpr std::array<std::string_view, kStringsCount>` en `TextosConstants.hpp` sin asignaciones dinámicas en *heap*.
3. **Contrato `ILanguageProvider.def`:**
   - Define los métodos `getText(key: StringKey) const -> std::string_view` (o `string` si el puente FFI requiere copia/formato), `setLanguage(langCode: string) -> void`, `getCurrentLanguage() const -> string`, y documenta el idioma por defecto / *fallback* (ej. `es`).

# Estructura del Documento de Salida:

**IMPORTANTE: ENTREGA LOS BLOQUES LISTOS PARA COPIAR Y PEGAR EN EL SIGUIENTE ORDEN.**

1. **`### Textos_<Proyecto>.csv`** (bloque `csv` completo con `# MAPEO DE GRUPOS:`, cabecera y todas las claves de todas las vistas, validaciones, errores y toasts).
2. **`### ILanguageProvider.def`** (bloque `yaml` con el contrato del servicio):

```yaml
# ILanguageProvider.def - <AAAA-MM-DD>
# Proyecto <NombreProyecto>
# Contrato Canónico del Servicio de Textos en .rodata

componente:
  nombre: ILanguageProvider
  tipo: interfaz_servicio
  proposito: "Resolver claves StringKey en O(1) sobre arreglos constexpr en .rodata para el idioma activo."
  ubicacion_esperada_codigo: "Source/Core/Dependencies/Services/ILanguageProvider.hpp"
  constantes_relacionadas: "Source/Core/Models/Constants/TextosConstants.hpp"
  catalogo_fuente: ".specify/Contratos/Core/Textos/Textos_<Proyecto>.csv"

metodos:
  - getText(key: StringKey) const: std::string_view
  - setLanguage(langCode: string): void
  - getCurrentLanguage() const: string

reglas_rodata:
  - "Todas las cadenas residen en memoria estática de solo lectura (std::string_view en constexpr std::array)."
  - "El enum StringKey : uint16_t preserva exactamente el orden de filas de Textos_<Proyecto>.csv."
```
