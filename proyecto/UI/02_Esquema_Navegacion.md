# Esquema de Navegación — Gestor de Trámites y Vencimientos Burocráticos/Legales con Dependencias (MVP)

## 1. Análisis del Contexto de Uso Real del Usuario

El usuario principal (**Mateo Paredes**, 34 años, especialista de operaciones y movilidad en logística/consultoría) opera en entornos de alta movilidad, presión operativa y variabilidad de conectividad[cite: 3]. Sus interacciones con la aplicación se concentran en **tres momentos críticos** con demandas ergonómicas y cognitivas distintas:

1. **Triage y Ejecución Diaria (Escritorio / Hogar / Traslado):**
   * **Contexto:** Revisa qué debe iniciar o empujar hoy sin saturarse con vencimientos lejanos[cite: 1, 2, 3].
   * **Exigencia UX:** Jerarquía inmediata entre **ruta crítica/próximo paso** y **trámites en espera/latentes** (colapsables/atenuados), evitando la "ilusión de tener tiempo de sobra" y el ruido de listas de tareas genéricas[cite: 1, 2, 3].
2. **Planificación y Carga Documental (En movimiento o escritorio):**
   * **Contexto:** Configura cadenas de pasos previos con anticipación inversa (días/semanas/meses), marca recaudos como *Pendiente/Listo* y adjunta comprobantes desde cámara o archivos/galería[cite: 1, 2, 3].
   * **Exigencia UX:** Controles de fácil alcance táctil (zona inferior/media en móvil), retroalimentación inmediata de fechas calculadas y progreso, y disparadores contextuales no intrusivos cuando se alcanzan límites del plan gratuito o se requiere respaldo (`Personal Pro`)[cite: 1, 2, 3].
3. **Momento de Verdad en Taquilla / Cita / Oficina (Uso a una mano, posible baja/nula conectividad, alta tensión):**
   * **Contexto:** Frente a una ventanilla, consulado o control, necesita verificar requisitos y abrir documentos (imágenes/PDF) cifrados localmente al instante[cite: 1, 2, 3].
   * **Exigencia UX:** Acceso directo a **Vista Rápida de Taquilla (`P05`)** desde el detalle del trámite (`P02`), eliminando distracciones de edición/fechas, con indicador *Offline* claro y apertura inmediata al **Visor Integrado de Documentos (`P04`)** con zoom y navegación simple[cite: 1, 2, 3].

---

## 2. Evaluación de Alternativas de Navegación

| Alternativa Evaluada | Ventajas | Limitaciones / Fricción en el Contexto del Producto | Veredicto |
| :--- | :--- | :--- | :--- |
| **A. Bottom Tab Bar de 4–5 pestañas** (Ej. Inicio, Trámites, Plantillas, Taquilla, Ajustes) | Acceso global a secciones principales con un toque. | La **Vista Rápida de Taquilla (`P05`)** y el **Detalle de Paso (`P03`)** dependen del contexto de un trámite específico; mostrarlos como pestañas globales vacías o descontextualizadas genera ambigüedad. Añade cromatismo y carga visual innecesaria en un MVP enfocado en flujo secuencial. | **Descartada** como navegación primaria. |
| **B. Navigation Drawer (Menú lateral hamburguesa)** | Libera espacio en la barra superior para títulos y acciones. | Oculta destinos clave como **Configuración y Respaldo (`P07`)** y dificulta la operación rápida con una sola mano en móviles modernos. | **Descartada** para destinos principales. |
| **C. Navegación Jerárquica Stack + Modales/Bottom Sheets Contextuales + Acceso Rápido a Taquilla** | Refleja fielmente la estructura real: **Panel (`P01`) $\rightarrow$ Trámite (`P02`) $\rightarrow$ Paso/Recaudos (`P03`) $\rightarrow$ Documento (`P04`)**, aislando la **Taquilla (`P05`)** cuando se necesita y resolviendo acciones acotadas mediante *Bottom Sheets* / diálogos sobre el contexto actual. | Requiere disciplina en la profundidad del stack y en el retorno tras completar flujos modales o paywalls. | **Seleccionada (Modelo Canónico)**. |

---

## 3. Modelo Canónico de Navegación

El sistema adopta una **Arquitectura Jerárquica de Pantallas Completas (`P01`–`P07`) con Superposiciones Modales / Bottom Sheets / Diálogos (`M01`–`M06`)**:

* **Raíz / Hub (`P01` — Panel Principal de Trámites):** Punto de entrada y retorno base. Prioriza ruta crítica/próximo paso, activos y latentes colapsables, con acciones primarias inferiores (`Desde plantilla` $\rightarrow$ `P06`; `Nuevo Trámite` $\rightarrow$ `M01`) y acceso a configuración (`P07`) en la barra superior[cite: 1, 2].
* **Profundidad por Entidad (`P02` $\rightarrow$ `P03` $\rightarrow$ `P04`):**
  * `P02` centraliza el trámite, su cuenta regresiva, la cadena de pasos previos y el salto directo a **Taquilla (`P05`)**[cite: 1, 2].
  * `P03` enfoca la ejecución de un paso y sus recaudos (con selector rápido entre pasos del mismo trámite en la barra superior para evitar rebotar a `P02` innecesariamente)[cite: 1, 2].
  * `P04` opera como visor *offline* a pantalla completa sobre el documento seleccionado desde `P03` o `P05`, regresando exactamente a la vista de origen[cite: 1, 2].
* **Modo Operativo de Campo (`P05` — Vista Rápida de Taquilla):** Vista dedicada desde `P02` para consulta rápida sin conexión; permite inspeccionar recaudos y abrir `P04`, retornando a `P02` (o saliendo a `P02`/`P01` según la acción de cierre)[cite: 1, 2].
* **Modales y Bottom Sheets Transversales (`M01`–`M06`):**
  * `M01` (Crear/Editar trámite) y `M02` (Confirmar eliminación) operan sobre `P01` o `P02` según el origen; tras eliminar en `M02`, el flujo vuelve a `P01` al destruirse `P02`[cite: 1, 2].
  * `M03` (Agregar/Editar paso previo) opera sobre `P02`[cite: 1, 2].
  * `M04` (Selector de origen de archivo) opera sobre `P03` para adjuntar desde cámara o archivos/galería[cite: 1, 2].
  * `M05` (Instanciar desde plantilla) opera sobre `P06` y, al crear el trámite, lleva al usuario al trámite creado (`P02`) o al panel principal (`P01`) listo para personalizar[cite: 1, 2].
  * `M06` (Paywall contextual `Personal Pro`) se superpone de forma contextual cuando el usuario en plan gratuito intenta exceder límites (en `M01` al crear o en `M04` al adjuntar), abre una plantilla bloqueada en `P06` o intenta exportar respaldo en `P07` (o gestiona plan/restaura compras desde `P07`)[cite: 1, 2]. Al cerrarse o completarse compra/restauración, devuelve al flujo de origen con el estado actualizado[cite: 1, 2].

---

## 4. Esquema de Transiciones (Mermaid)

```mermaid
flowchart TD
    %% Definición de Pantallas Completas (P01 - P07)
    subgraph Pantallas["Pantallas Completas"]
        P01["P01: Panel Principal de Trámites<br/>(Ruta crítica, Activos, Latentes)"]
        P02["P02: Detalle del Trámite<br/>(Cuenta regresiva, Pasos y dependencias)"]
        P03["P03: Detalle de Paso Previo y Recaudos<br/>(Checklist, Selector de paso, Adjuntos)"]
        P04["P04: Visor Integrado de Documentos<br/>(PDF / Imagen cifrada Offline)"]
        P05["P05: Vista Rápida de Taquilla<br/>(Recaudos consolidados Offline)"]
        P06["P06: Catálogo de Plantillas Base<br/>(Gratuitas / Plan Pro)"]
        P07["P07: Configuración y Respaldo de Datos<br/>(Plan / Restaurar / Exportar)"]
    end

    %% Definición de Modales / Bottom Sheets / Diálogos (M01 - M06)
    subgraph Modales["Modales / Bottom Sheets / Diálogos"]
        M01["M01: Formulario de Trámite<br/>(Crear / Editar)"]
        M02["M02: Confirmación de Eliminación<br/>(Diálogo destructivo)"]
        M03["M03: Configuración de Paso Previo<br/>(Crear / Editar / Reordenar)"]
        M04["M04: Selector de Origen de Archivo<br/>(Cámara / Archivos o Galería)"]
        M05["M05: Instanciar desde Plantilla<br/>(Fecha límite objetivo)"]
        M06["M06: Paywall Contextual Personal Pro<br/>(Lifetime / Anual / Restaurar)"]
    end

    %% Navegación Principal desde P01
    P01 -->|"Seleccionar trámite / Próximo paso crítico"| P02
    P01 -->|"Botón 'Nuevo Trámite' (CU-01)"| M01
    P01 -->|"Botón 'Desde plantilla' (CU-08)"| P06
    P01 -->|"Botón 'Configuración' (CU-09, CU-12)"| P07

    %% Retornos a P01
    P02 -->|"Volver"| P01
    P06 -->|"Volver"| P01
    P07 -->|"Volver"| P01
    P05 -->|"Salir de Vista Rápida (opcional a panel)"| P01
    M02 -->|"Confirmar eliminación (destruye P02)"| P01

    %% Flujos en Detalle del Trámite (P02)
    P02 -->|"Botón 'Editar'"| M01
    P02 -->|"Botón 'Eliminar'"| M02
    P02 -->|"Botón 'Agregar paso previo' / 'Editar paso' (CU-02)"| M03
    P02 -->|"Seleccionar paso previo / 'Abrir' (CU-04, CU-05)"| P03
    P02 -->|"Botón 'Vista rápida / Taquilla' (CU-07)"| P05

    %% Retornos a P02
    M01 -->|"Guardar / Cancelar / Cerrar"| P02
    M02 -->|"Cancelar"| P02
    M03 -->|"Guardar / Cancelar / Cerrar"| P02
    P03 -->|"Volver"| P02
    P05 -->|"Volver al trámite / Salir de Vista Rápida"| P02

    %% Flujos en Detalle de Paso y Recaudos (P03)
    P03 -->|"Selector rápido de paso previo"| P03
    P03 -->|"Botón 'Adjuntar archivo' en recaudo o paso (CU-05)"| M04
    P03 -->|"Tocar miniatura / enlace de adjunto (CU-05)"| P04

    %% Retornos a P03 y P04
    M04 -->|"Adjuntar / Cancelar / Cerrar"| P03
    P04 -->|"Cerrar / Volver (desde P03)"| P03

    %% Flujos en Vista Rápida de Taquilla (P05)
    P05 -->|"Tocar archivo adjunto local (CU-07)"| P04
    P04 -->|"Cerrar / Volver (desde P05)"| P05

    %% Flujos en Catálogo de Plantillas (P06) y M05
    P06 -->|"Seleccionar plantilla habilitada (Freemium/Pro)"| M05
    P06 -->|"Seleccionar plantilla bloqueada en Freemium"| M06
    M05 -->|"Cancelar / Cerrar"| P06
    M05 -->|"Crear trámite (hacia trámite creado o panel)"| P02
    M05 -.->|"Crear trámite (alternativa al panel)"| P01

    %% Flujos en Configuración y Respaldo (P07)
    P07 -->|"Adquirir/gestionar Plan Pro o Restaurar compras (CU-12)"| M06
    P07 -->|"Exportar respaldo en plan Freemium (CU-09)"| M06

    %% Disparadores de Paywall Contextual (M06) y Retornos
    M01 -.->|"Supera límite gratuito al crear (CU-01)"| M06
    M04 -.->|"Alcanza límite gratuito de adjuntos (CU-05)"| M06
    M06 -->|"Cerrar / Descartar / Compra o Restauración completada"| P01
    M06 -->|"Cerrar / Descartar / Compra o Restauración completada"| M01
    M06 -->|"Cerrar / Descartar / Compra o Restauración completada"| M04
    M06 -->|"Cerrar / Descartar / Compra o Restauración completada"| P06
    M06 -->|"Cerrar / Descartar / Compra o Restauración completada"| P07
    ```