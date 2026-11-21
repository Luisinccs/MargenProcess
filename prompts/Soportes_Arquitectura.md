Actúa como un Arquitecto de Software Senior experto en el framework **DualComponents** y documentación técnica de referencia.

Tu misión es generar los **3 Documentos de Soporte de Contexto** para la carpeta `.specify/Soportes/`, cuya función es dar a cualquier desarrollador o agente implementador una visión estructural, navegable y sin ambigüedades de todo el proyecto antes de abordar las Rebanadas Verticales y Tareas:
1. `Estructura_Archivos.txt`
2. `Site_Map.md`
3. `Modelo_Arquitectura.md`

# Insumos Obligatorios de Entrada:
1. **Estrategia de Persistencia** (plataformas objetivo, motores, almacenamiento local/remoto).
2. **Contratos de Navegación y UI:** `Transiciones.csv`, esquema de navegación y vistas `.soda` (o `01_Contenido_Vistas.md`).
3. **Contratos del Core C++ generados:**
   - `Enums/*.csv` y `Textos/Textos_*.csv`
   - `Dtos/*.def`
   - `Dependencies/Repositories/*.def`
   - `Dependencies/Processors/*.def` y `Algoritmos/IndiceAlgoritmos.md`
   - `Dependencies/Services/*.def`
   - `ViewModels/*.viewmodel.def`, `*.coordinator.def` y `Apps/bootstrap.def`

# Reglas Estrictas de Fidelidad y Consistencia:
1. **Cero Invenciones:** Todos los nombres de archivos, clases, interfaces, DTOs, `ScreenType`, `NavigationAction`, plataformas y carpetas deben coincidir literalmente con los contratos de entrada.
2. **Coherencia con DualComponents:**
   - En `Source/Platforms/<Plataforma>/`: solo código nativo pasivo (*Dumb Views* divididas en `Elements`, `Blocks`, `Screens`, `Shields`), `Bindings`, `Theme`, `AppCoordinator` y punto de entrada.
   - En `Source/Core/`: `Bootstrap`, `ViewModels`, `Models` (`Dtos`, `Enums`, `Constants`), `Dependencies` (`Repositories`, `Processors`, `Services`), `Data` (implementación SQLite/persistencia), `Processors` (implementaciones), `Services` (implementaciones) y `Compiler`/FFI C-Bridge.
3. **Diagramas y Trazabilidad Clara:** Usa diagramas Mermaid claros y tablas de referencia cruzada entre pantallas, ViewModels, definiciones SODA y acciones de navegación.

# Estructura del Documento de Salida:

**IMPORTANTE: ENTREGA LOS 3 DOCUMENTOS COMPLETOS EN BLOQUES SEPARADOS LISTOS PARA COPIAR Y GUARDAR EN `.specify/Soportes/`.**

### 1. `### Estructura_Archivos.txt`
Árbol ASCII completo (`📂` / `├──` / `📄`) de `Source/` (tanto `Source/Platforms/<PlataformasObjetivo>` como `Source/Core/` y `Tests/`), reflejando 1:1 cada contrato existente en `.specify/Contratos/Core/`.

### 2. `### Site_Map.md`
Documento Markdown con:
- **1. Topología y Filosofía de Navegación** (arranque `Splash`, raíz permanente, pila `StackPush`/`StackPop`, modales adaptativos móvil vs. desktop/tablet).
- **2. Diagrama de Flujo de Navegación (Mermaid `graph TD`)** cubriendo todas las pantallas, modales y eventos del coordinador.
- **3. Matriz de Pantallas, Paneles y Directivas FFI** (`ScreenType` | `Ordinal` | `Nombre Canónico` | `ViewModel C++` | `Definición SODA` | `Tipo de Presentación` | `Retorno Canónico`).
- **4. Convenciones de Navegación por Plataforma Objetivo**.

### 3. `### Modelo_Arquitectura.md`
Documento Markdown con:
- **Cabecera técnica** (Producto, Núcleo C++20, Framework DualComponents, Plataformas Objetivo).
- **1. Arquitectura General por Capas y Patrón FFI C-Bridge** con diagrama Mermaid `graph TD` mostrando: Capa UI Nativa (*Dumb Views* + `AppCoordinator` + `Bindings`), Puente FFI (`C-Bridge`), Core C++ (`AppBootstrap`, `MainCoordinatorViewModel`, `ViewModels`, `Processors` stateless, `Repositories` atómicos, `Services` + `ILanguageProvider` `.rodata`, `Dtos`/`Enums`).
- **2. Reglas Inquebrantables de Dependencia** (qué puede llamar a qué y qué está prohibido en UI, ViewModels, Procesadores y Repositorios).
- **3. Flujo Típico de Ejecución End-to-End** (ejemplo concreto del flujo Usuario $\to$ Binding $\to$ C-Bridge $\to$ ViewModel $\to$ Repository/Processor $\to$ UI).
