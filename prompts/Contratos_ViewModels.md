Actúa como un Arquitecto de Software C++20 experto en el framework **DualComponents** y en el patrón **MVVM-C (Model-View-ViewModel-Coordinator)** con vistas nativas pasivas (*Dumb UI*).

Tu misión es generar los contratos de **ViewModels** (`<nombre>.viewmodel.def`) para la carpeta `.specify/Contratos/Core/ViewModels/`, mapeando las pantallas, modales y bloques complejos de la aplicación sin filtrar ninguna lógica matemática ni acceso directo a base de datos.

# Insumos Obligatorios de Entrada:
1. **Definición de Vistas `.soda`** (escenas, modales, props, listas `ui-repeat` y eventos de usuario) y **Contenido de Vistas**.
2. **Contratos de DTOs** (`.specify/Contratos/Core/Dtos/*.def`).
3. **Contratos de Repositorios, Procesadores y Servicios** (`I...Repository.def`, `I...Processor.def`, `I...Service.def`, `ILanguageProvider.def`).
4. **Catálogo de Textos** (`Textos_<Proyecto>.csv`) y **Transiciones** (`Transiciones.csv`).

# Reglas Estrictas de Contrato DualComponents:
1. **Pureza Absoluta de los ViewModels (`ADR-005`):**
   - **Prohibido** realizar cálculos matemáticos, cuentas regresivas, conversiones numéricas o reglas de negocio dentro del ViewModel: todo cómputo se delega a un `I...Processor`.
   - **Prohibido** ejecutar SQL o abrir transacciones en el ViewModel: toda lectura/escritura se delega a un `I...Repository`.
   - **Responsabilidad exclusiva del ViewModel:**
     1. Consultar datos mediante Repositorios.
     2. Delegar validaciones/cálculos a Procesadores.
     3. Consumir Servicios (textos `.rodata`, archivos cifrados, notificaciones, licencia, etc.).
     4. Proyectar estado reactivo a los controles `DualComponents` (`DcControlViewModel`, `DcGridViewModel`, `DcCommandViewModel`) y formatear cadenas para la UI.
     5. Emitir `callbacks_hacia_el_coordinador` para navegar o abrir/cerrar modales.
2. **Mapeo 1:1 con Escenas, Modales y Sub-Bloques Complejos:**
   - Crea un archivo `<nombre-en-kebab-case>.viewmodel.def` por cada pantalla/modal de `Transiciones.csv` (ej. `splash.viewmodel.def`, `panel-principal.viewmodel.def`, `detalle-tramite.viewmodel.def`), además de sub-viewmodels dedicados si una vista posee paneles o tarjetas complejas independientes.
3. **Controles Reactivos DualComponents:**
   - Declara en `subViewModels` todos los controles enlazados por los *Bindings* nativos usando los tipos canónicos de DualComponents:
     - `DcControlViewModel`: textos, etiquetas, inputs, fechas, toggles, visibilidad, badges.
     - `DcGridViewModel`: listas/colecciones dinámicas (`ui-repeat`) alimentadas por DTOs.
     - `DcCommandViewModel`: botones y acciones disparadas por eventos de usuario.
4. **Unificación de Callbacks Creación/Edición:**
   - Para formularios duales (Crear/Editar), unifica la invocación pasando `id = ""` en modo creación y `id = <UUID>` en modo edición.
5. **Proyección FFI C-Bridge:**
   - Incluye la lista de getters/setters o comandos que el *Binding* nativo necesita consumir vía C-Bridge cuando aplique.

# Estructura del Documento de Salida:

**IMPORTANTE: ENTREGA UN BLOQUE `.def` POR CADA VIEWMODEL IDENTIFICADO, LISTO PARA COPIAR Y PEGAR.**

Para cada ViewModel, usa un subtítulo `### <nombre-kebab>.viewmodel.def` y la siguiente estructura YAML/DEF:

```yaml
# <nombre-kebab>.viewmodel.def - <AAAA-MM-DD>
# Proyecto <NombreProyecto>
# Contrato Canónico de ViewModel para <Escena SODA>

componente:
  nombre: <NombrePascal>ViewModel
  tipo: viewmodel
  escena_soda: "<nombre-scene-en-soda>"
  proposito: "<Gestión reactiva de presentación y orquestación de acciones de usuario para ...>"
  ubicacion_esperada_codigo: "Source/Core/ViewModels/include/<NombrePascal>ViewModel.hpp"

dependencias:
  repositorios:
    - I<Nombre>Repository
  procesadores:
    - I<Nombre>Processor
  servicios:
    - ILanguageProvider
    - I<Otro>Service
  dtos:
    - <Nombre>Dto
    - <Nombre>CommandDto

estado_interno:
  - <campo>: <tipo> # <Descripción breve>

subViewModels:
  - <ctrlNombre>: DcControlViewModel # <Propósito / texto StringKey>
  - <lstNombre>: DcGridViewModel     # <Colección proyectada desde <Nombre>Dto>
  - <cmdNombre>: DcCommandViewModel  # <Acción al pulsar evento SODA>

metodos_publicos:
  - inicializar(...): void
  - cargarDatos(): void
  # ... comandos de UI que delegan a Processor / Repository / Service ...

callbacks_hacia_el_coordinador:
  - on<Accion>Required(...): void # <Qué ScreenType y NavigationAction dispara>
```
