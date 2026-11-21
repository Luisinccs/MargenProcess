Actúa como un Arquitecto de Software C++20 experto en el framework **DualComponents**, orquestación de navegación **MVVM-C** y puentes **FFI C-Bridge**.

Tu misión es generar los contratos del **Coordinador (o Coordinadores modulares)** (`*.coordinator.def`) y del **Bootstrap de Aplicación** (`bootstrap.def`) en `.specify/Contratos/Core/ViewModels/` y `.specify/Contratos/Core/Apps/`, uniendo la capa nativa pasiva (*Dumb UI*) con el núcleo C++.

# Insumos Obligatorios de Entrada:
1. **Contratos de ViewModels** (`.specify/Contratos/Core/ViewModels/*.viewmodel.def`, especialmente sus `callbacks_hacia_el_coordinador`).
2. **Transiciones de Navegación** (`Transiciones.csv`: `ScreenType` y `NavigationAction`).
3. **Esquema de Navegación / Journeys `.soda`** (flujos principales, retornos, modales, diálogos nativos y refrescos tras cerrar modales).
4. **Contratos de Repositorios, Procesadores y Servicios** (para definir el orden de inicialización en `ServiceRegister` / `AppBootstrap`).

# Reglas Estrictas de Contrato DualComponents:
1. **Modularidad de Coordinadores (Evitar Monolitos Pesados):**
   - Evalúa el volumen total de pantallas y transiciones del proyecto:
     - **Proyectos simples / medianos** (hasta ~12–15 pantallas o un único flujo principal): genera un único `main.coordinator.def` (`MainCoordinatorViewModel`).
     - **Proyectos extensos o multi-módulo** (si un solo coordinador supera ~15 pantallas o mezcla dominios pesados): divide la orquestación en `main.coordinator.def` (arranque `Splash`, raíz `Dashboard`/`Workspace`, enrutamiento de alto nivel) + **sub-coordinadores modulares** (`<modulo>.coordinator.def`) inyectados y coordinados por el principal.
2. **Responsabilidad Exclusiva del Coordinador:**
   - **Única responsabilidad:** instanciar/retener los ViewModels activos, suscribir sus `callbacks_hacia_el_coordinador` y despachar directivas de navegación (`NavigationDirectiveCb(ctx, action, screen, viewModelPtr, extraPayloadJson)`) hacia el `AppCoordinator` nativo de cada plataforma.
   - **Prohibido:** inicializar SQLite, registrar servicios en el contenedor, ejecutar SQL o realizar cálculos de negocio.
3. **Cobertura Total de Transiciones y Refrescos Post-Modal / Post-Pop:**
   - Toda combinación `origen` + `evento` hacia `destino` debe declarar la `NavigationAction` exacta de `Transiciones.csv` (`StackReset`, `StackPush`, `StackPop`, `ModalPresent`, `ModalDismiss`, `ToastShow`, `FileDialog...`).
   - En todo `ModalDismiss` o `StackPop` tras guardar/eliminar cambios, especifica explícitamente qué método de recarga se invoca en el ViewModel subyacente (ej. `refresca PanelPrincipal.cargarDatos()`).
4. **Contrato `Apps/bootstrap.def` (`AppBootstrap` y `ServiceRegister`):**
   - Especifica los métodos de arranque (`init(...)`), configuración de idioma y rutas locales, callbacks nativos (logs, notificaciones/puentes), el **orden topológico exacto de registro** en `ServiceRegister` (Servicios base $\to$ Textos `.rodata` $\to$ BD/Repositorios $\to$ Procesadores $\to$ Servicios de dominio) y la lista de funciones `extern "C"` del puente **FFI C-Bridge** con sus reglas seguras de buffers.

# Estructura del Documento de Salida:

**IMPORTANTE: ENTREGA PRIMERO EL/LOS CONTRATO(S) DE COORDINADOR Y LUEGO `Apps/bootstrap.def`, LISTOS PARA COPIAR Y PEGAR.**

1. **`### main.coordinator.def`** *(y `### <modulo>.coordinator.def` si se divide por complejidad)*:
```yaml
# main.coordinator.def - <AAAA-MM-DD>
# Proyecto <NombreProyecto>

componente:
  nombre: MainCoordinatorViewModel
  proposito: "Gestionar exclusivamente la lógica de transiciones entre pantallas/modales y el ciclo de vida de sus ViewModels."
  ubicacion_esperada_codigo: "Source/Core/ViewModels/include/MainCoordinatorViewModel.hpp"

responsabilidad:
  - "Orquestación de navegación, retención de ViewModels y refresco tras retornos."
  - "Prohibido: inicializar BD, registrar servicios o contener lógica matemática."

pantallas_gestionadas:
  - <NombrePantalla> (ScreenType::<Nombre>, ordinal <N>[, modal])

flujo_inicial:
  punto_de_partida: start()
  accion_inicial: "<Instancia SplashViewModel, registra callback y despacha StackReset>"

transiciones:
  - origen: <PantallaOrigen>
    evento: <onCallbackViewModel(...)>
    destino: <PantallaDestino>
    accion: <NavigationAction> (<Efecto secundario de recarga si aplica>)

interfaz_plataforma_ffi:
  registro_callback: setupNavigationCallback(NavigationDirectiveCb callback, void* ctx)
  arranque: start()
```

2. **`### bootstrap.def`**:
```yaml
# bootstrap.def - <AAAA-MM-DD>
# Proyecto <NombreProyecto>

componente:
  nombre: AppBootstrap
  namespace: "<Proyecto>::Bootstrap"
  ubicacion_esperada_codigo: "Source/Core/Bootstrap/include/AppBootstrap.hpp"
  proposito: "Inicializar almacenamiento, idioma y registrar dependencias globales en ServiceRegister, exponiendo C-Bridge."

registro_y_orden:
  - <1. Servicios base / Logger / Almacenamiento>
  - <2. LanguageProvider (.rodata)>
  - <3. Base de datos y Repositorios>
  - <4. Procesadores stateless>
  - <5. Servicios específicos del proyecto>

metodos_cpp:
  - init(...): void
  - setLanguage(language: const char*): void
  - getText(stringKey: uint16, buffer: char*, maxLen: int): void

ffi:
  - "<Proyecto>Bootstrap_Init(...)"
  - "<Proyecto>Bootstrap_SetLanguage(...)"
  - "<Proyecto>Bootstrap_GetText(...)"

reglas_ffi:
  - "Los getters de buffer validan buffer != nullptr y maxLen > 0, garantizan terminación NUL y truncan a maxLen - 1."
```
