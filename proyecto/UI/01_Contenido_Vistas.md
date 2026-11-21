// C01_Vistas_Unitarias.md - 2026-11-20

# Documento de Contenido de Vistas  
**Gestor de Trámites y Vencimientos Burocráticos/Legales con Dependencias MVP**  
**2026-11-20**  

## Resumen de Vistas del Sistema
| Código | Nombre de la Vista | Caso de Uso | Tipo |
| :---: | :--- | :---: | :--- |
| **P01** | Panel Principal de Trámites | CU-01, CU-06, CU-08, CU-09 | Pantalla Completa |
| **P02** | Detalle del Trámite | CU-01, CU-02, CU-04, CU-05, CU-07 | Pantalla Completa |
| **M01** | Formulario de Trámite (Crear / Editar) | CU-01 | Modal / Bottom Sheet |
| **M02** | Confirmación de Eliminación de Trámite | CU-01 | Modal / Diálogo |
| **M03** | Configuración de Paso Previo | CU-02 | Modal / Bottom Sheet |
| **P03** | Detalle de Paso Previo y Recaudos | CU-04, CU-05 | Pantalla Completa |
| **M04** | Selector de Origen de Archivo | CU-05 | Modal / Bottom Sheet |
| **P04** | Visor Integrado de Documentos | CU-05, CU-07 | Pantalla Completa |
| **P05** | Vista Rápida de Taquilla | CU-07 | Pantalla Completa |
| **P06** | Catálogo de Plantillas Base | CU-08 | Pantalla Completa |
| **M05** | Instanciar Trámite desde Plantilla | CU-08 | Modal / Bottom Sheet |
| **P07** | Configuración y Respaldo de Datos | CU-09, CU-12 | Pantalla Completa |
| **M06** | Paywall Contextual Personal Pro | CU-01, CU-05, CU-08, CU-09, CU-12 | Modal / Bottom Sheet |

---

## 1. Panel Principal de Trámites (P01)

### Propósito
Centralizar el seguimiento de trámites activos, destacar la ruta crítica y el próximo paso a ejecutar hoy, atenuar o mantener en espera los trámites latentes para evitar ruido visual, y proveer acceso directo a la creación manual, plantillas, configuración/respaldo y detalle de cada trámite[cite: 1, 2].

### Tipo
Pantalla Completa

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Barra Superior de Navegación
  * Título de pantalla ("Mis Trámites")
  * Botón de acceso a Configuración y Respaldo (`P07`)
* Bloque de Ruta Crítica / Próximo Paso Destacado (`CU-06`)
  * Etiqueta de estado de urgencia / ventana de acción ("En ventana de acción" / "En riesgo")
  * Nombre del trámite asociado y título del próximo paso crítico
  * Fecha límite calculada o cuenta regresiva restante
  * Acción rápida para abrir el trámite o su paso crítico (`P02` / `P03`)
* Sección de Trámites Activos (En Ventana de Acción / En Riesgo)
  * Tarjeta/Fila de Trámite (repetible)
    * Indicador de estado ("En ventana de acción", "En riesgo", "Completado")
    * Título del trámite y categoría
    * Indicador del próximo paso crítico y fecha/cuenta regresiva
    * Indicador resumido de progreso de pasos/recaudos
    * Acción de selección para abrir Detalle del Trámite (`P02`)
* Sección Colapsable o Atenuada de Trámites en Espera / Latentes (`CU-06`)
  * Encabezado de sección ("En espera / Latentes") con contador
  * Tarjeta/Fila Atenuada de Trámite (repetible, sin saturación visual)
    * Título del trámite, categoría y fecha de apertura de ventana o fecha límite final
    * Acción de selección para abrir Detalle del Trámite (`P02`)
* Barra de Acciones Principales Inferiores / FAB
  * Botón "Desde plantilla" (`P06`)
  * Botón principal "Nuevo Trámite" (`M01`)

### wireframe
```txt
+-------------------------------------------------------------+
| Mis Trámites                                          [Cfg] |
+-------------------------------------------------------------+
| [!] PRÓXIMO PASO CRÍTICO (En riesgo / En ventana)           |
| Renovar Pasaporte -> Solicitar cita consular                |
| Vence paso en 4 días | Límite final: 15/05/2027     [Ver]   |
+-------------------------------------------------------------+
| ACTIVOS                                                     |
| +---------------------------------------------------------+ |
| | [En ventana de acción] Seguro Vehicular                |  |
| | Próx. paso: Reunir póliza y cédula | En 9 días         |  |
| +---------------------------------------------------------+ |
| +---------------------------------------------------------+ |
| | [Completado] Permiso Municipal                         |  |
| | Estado: Completado                                      | |
| +---------------------------------------------------------+ |
|                                                             |
| EN ESPERA / LATENTES (2) - [Mostrar / Ocultar]              |
| . . . . . . . . . . . . . . . . . . . . . . . . . . . . .   |
| . Licencia de Conducir (Abre ventana en 4 meses)          . |
| . . . . . . . . . . . . . . . . . . . . . . . . . . . . .   |
+-------------------------------------------------------------+
| [Desde plantilla]                       [+ Nuevo Trámite]   |
+-------------------------------------------------------------+
```
---

## 2. Detalle del Trámite (P02)

### Propósito
Exhibir la información general de un trámite, su fecha límite final, su cadena secuencial de pasos previos con fechas calculadas en cuenta regresiva, y proporcionar accesos directos a la vista rápida de taquilla, edición/eliminación y gestión de pasos o recaudos[cite: 1, 2].

### Tipo
Pantalla Completa

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Barra Superior de Navegación
  * Botón "Volver" al Panel Principal (`P01`)
  * Título del trámite
  * Botón de acción "Editar" (`M01`)
  * Botón de acción "Eliminar" (`M02`)
* Encabezado y Resumen del Trámite
  * Badge de categoría y badge de estado ("En espera/latente", "En ventana de acción", "En riesgo", "Completado")
  * Fecha límite final y cuenta regresiva general
  * Notas generales del trámite (si existen)
* Barra de Acceso a Taquilla (`CU-07`)
  * Botón destacado "Vista rápida / Taquilla" ("Listo para cita / taquilla") (`P05`)
* Sección de Pasos Previos y Dependencias (`CU-02`, `CU-04`)
  * Encabezado de sección ("Pasos previos y dependencias")
  * Botón de acción "Agregar paso previo" (`M03`)
  * Lista Ordenada de Pasos Previos (en secuencia de dependencia / cuenta regresiva)
    * Ítem de Paso Previo (repetible)
      * Número/orden de secuencia y nombre del paso
      * Anticipación configurada (ej. "3 semanas antes") y fecha límite/inicio calculada
      * Resumen de recaudos (ej. "2/3 recaudos listos" y cantidad de adjuntos)
      * Botón/acción para editar u ordenar el paso (`M03`)
      * Acción de selección para abrir Detalle de Paso Previo y Recaudos (`P03`)

### wireframe
```txt
+-------------------------------------------------------------+
| [<-] Renovar Pasaporte                    [Editar] [Borrar] |
+-------------------------------------------------------------+
| [Migración] [En ventana de acción]                          |
| Fecha límite final: 15/05/2027 (Faltan 176 días)            |
| Notas: Verificar vigencia mínima de 6 meses.                |
+-------------------------------------------------------------+
| [ Listo para cita / taquilla (Vista rápida offline) -> ]    |
+-------------------------------------------------------------+
| PASOS PREVIOS Y DEPENDENCIAS              [+ Agregar paso]  |
|                                                             |
| 1. Reunir recaudos base                     [Editar]        |
|    Anticipación: 2 semanas | Límite paso: 01/05/2027        |
|    Recaudos: 2/2 listos | 2 adjuntos               [Abrir]  |
|                                                             |
| 2. Solicitar cita consular                  [Editar]        |
|    Anticipación: 4 semanas | Límite paso: 17/04/2027        |
|    Recaudos: 0/1 listos | 0 adjuntos               [Abrir]  |
+-------------------------------------------------------------+
```
---

## 3. Formulario de Trámite (Crear / Editar) (M01)

### Propósito
Capturar o modificar los datos fundamentales de un trámite (título, categoría, fecha límite final y notas generales) para calcular su cuenta regresiva y programar alertas, activando el paywall contextual si se excede el límite del plan gratuito al crear[cite: 1].

### Tipo
Modal / Bottom Sheet

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Encabezado del Modal
  * Título ("Nuevo Trámite" o "Editar Trámite")
  * Botón "Cerrar / Cancelar"
* Formulario de Campos
  * Campo de texto "Título" (obligatorio)
  * Selector / lista desplegable "Categoría"
  * Selector de fecha "Fecha límite final"
  * Área de texto "Notas generales"
* Pie de Acciones
  * Botón "Cancelar"
  * Botón principal "Guardar"

### wireframe
```txt
+-------------------------------------------------------------+
| Nuevo Trámite                                           [X] |
+-------------------------------------------------------------+
|                                                             |
| Título *                                                    |
| [_________________________________________________________] |
|                                                             |
| Categoría                                                   |
| [ Seleccionar categoría v                             ] |
|                                                             |
| Fecha límite final *                                        |
| [ DD/MM/AAAA                                        [Cal] ] |
|                                                             |
| Notas generales                                             |
| [_________________________________________________________] |
| [_________________________________________________________] |
|                                                             |
| [Cancelar]                                        [Guardar] |
+-------------------------------------------------------------+
```
---

## 4. Confirmación de Eliminación de Trámite (M02)

### Propósito
Solicitar confirmación explícita antes de eliminar de forma permanente un trámite, sus pasos previos, recaudos, archivos adjuntos locales y alertas asociadas[cite: 1].

### Tipo
Modal / Diálogo

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Título del diálogo ("Eliminar trámite")
* Mensaje de advertencia indicando el nombre del trámite y la eliminación de su estructura y alertas asociadas
* Fila de botones de acción
  * Botón "Cancelar"
  * Botón destructivo "Eliminar"

### wireframe
```txt
+-------------------------------------------------------------+
|                                                             |
| +---------------------------------------------------------+ |
| | Eliminar trámite                                        | |
| |                                                         | |
| | ¿Deseas eliminar "Renovar Pasaporte"? Se borrarán sus   | |
| | pasos, recaudos, adjuntos y alertas programadas.        | |
| |                                                         | |
| | [Cancelar]                                   [Eliminar] | |
| +---------------------------------------------------------+ |
|                                                             |
+-------------------------------------------------------------+
```
---

## 5. Configuración de Paso Previo (M03)

### Propósito
Crear, editar o reordenar un paso previo dentro de la cadena de dependencias de un trámite, definiendo su nombre, orden secuencial y tiempo de anticipación (en días, semanas o meses) para recalcular automáticamente las fechas en cuenta regresiva[cite: 1, 2].

### Tipo
Modal / Bottom Sheet

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Encabezado del Modal
  * Título ("Agregar paso previo" o "Editar paso previo")
  * Botón "Cerrar"
* Formulario de Configuración del Paso
  * Campo de texto "Nombre del paso"
  * Control de orden / secuencia (selector de posición o controles subir/bajar en la secuencia)
  * Selector de anticipación / duración respecto al siguiente paso o fecha límite
    * Input numérico de cantidad
    * Selector de unidad de tiempo ("Días", "Semanas", "Meses")
  * Vista previa informativa de la fecha calculada resultante
* Pie de Acciones
  * Botón "Cancelar"
  * Botón principal "Guardar"

### wireframe
```txt
+-------------------------------------------------------------+
| Agregar paso previo                                     [X] |
+-------------------------------------------------------------+
|                                                             |
| Nombre del paso *                                           |
| [_________________________________________________________] |
|                                                             |
| Orden en la secuencia                                       |
| [ Posición 1 de 2 v ]   [Subir] [Bajar]                     |
|                                                             |
| Anticipación requerida                                      |
| [  2  ]   [ Semanas v ] (Días / Semanas / Meses)            |
| Fecha estimada calculada: 01/05/2027                        |
|                                                             |
| [Cancelar]                                        [Guardar] |
+-------------------------------------------------------------+
```
---

## 6. Detalle de Paso Previo y Recaudos (P03)

### Propósito
Permitir la gestión de recaudos de un paso previo específico, alternar su estado entre "Pendiente" y "Listo", visualizar el avance del paso, adjuntar documentos (cámara o archivos/galería) y abrir el visor de archivos adjuntos[cite: 1, 2].

### Tipo
Pantalla Completa

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Barra Superior de Navegación
  * Botón "Volver" al Detalle del Trámite (`P02`)
  * Selector rápido de paso previo (para cambiar entre pasos del mismo trámite)
* Cabecera del Paso Previo
  * Nombre del paso y orden en la cadena
  * Fecha límite/inicio calculada y anticipación configurada
  * Indicador de avance de recaudos (porcentaje o conteo "X de Y listos")
* Formulario Rápido para Agregar Recaudo (`CU-04`)
  * Campo de texto para el nombre del recaudo (ej. formulario, timbre fiscal, copia de identidad)
  * Botón / acción "Agregar recaudo"
* Listado de Recaudos del Paso (`CU-04`, `CU-05`)
  * Ítem de Recaudo (repetible)
    * Casilla de verificación / interruptor de estado ("Pendiente" / "Listo")
    * Denominación del recaudo y etiqueta de estado actual
    * Lista/miniatura de archivos adjuntos vinculados al recaudo (si existen) -> al tocar abre Visor (`P04`)
    * Botón / acción "Adjuntar archivo" en el recaudo -> abre Selector de Origen (`M04`)
* Sección de Adjuntos Generales del Paso (si aplica)
  * Botón / acción "Adjuntar archivo" al nivel del paso (`M04`)
  * Miniaturas o enlaces de archivos adjuntos del paso (`P04`)

### wireframe
```txt
+-------------------------------------------------------------+
| [<-] [Paso 1: Reunir recaudos base v]                       |
+-------------------------------------------------------------+
| Vence: 01/05/2027 (2 sem. antes) | Avance: 50% (1/2 listos) |
+-------------------------------------------------------------+
| Nuevo recaudo:                                              |
| [ Nombre del recaudo (ej. timbre fiscal) ] [+ Agregar]    |
+-------------------------------------------------------------+
| RECAUDOS DEL PASO                                           |
| +---------------------------------------------------------+ |
| | [x] Copia de cédula de identidad              [Listo]   | |
| |     Adjuntos: [Img: cedula_frente.jpg] -> [Ver]         | |
| |                                       [+ Adjuntar]      | |
| +---------------------------------------------------------+ |
| +---------------------------------------------------------+ |
| | [ ] Comprobante de pago de arancel          [Pendiente] | |
| |     Sin archivos adjuntos             [+ Adjuntar]      | |
| +---------------------------------------------------------+ |
|                                                             |
| ADJUNTOS DEL PASO                     [+ Adjuntar al paso]  |
| [PDF: planilla_solicitud.pdf] -> [Ver]                      |
+-------------------------------------------------------------+
```
---

## 7. Selector de Origen de Archivo (M04)

### Propósito
Permitir al usuario elegir el origen del documento a adjuntar a un recaudo o paso (cámara del dispositivo o archivos/galería con imagen o PDF), activando el paywall contextual si se alcanza el límite gratuito de adjuntos[cite: 1].

### Tipo
Modal / Bottom Sheet

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Encabezado del Modal
  * Título ("Adjuntar archivo")
  * Indicación del recaudo o paso destino
  * Botón "Cerrar"
* Opciones de Origen
  * Opción "Cámara" (capturar fotografía del documento/comprobante)
  * Opción "Archivos / Galería" (seleccionar imagen o PDF desde el dispositivo)
* Pie de Acción
  * Botón "Cancelar"

### wireframe
```txt
+-------------------------------------------------------------+
| Adjuntar archivo                                        [X] |
| Destino: Comprobante de pago de arancel                     |
+-------------------------------------------------------------+
|                                                             |
| [ [Cam] Tomar fotografía con Cámara                       ] |
|                                                             |
| [ [Doc] Seleccionar imagen o PDF de Archivos / Galería    ] |
|                                                             |
| [Cancelar]                                                  |
+-------------------------------------------------------------+
```
---

## 8. Visor Integrado de Documentos (P04)

### Propósito
Mostrar de forma inmediata, tanto con conexión como sin conexión (*offline*), el documento PDF o imagen cifrada almacenada localmente y vinculada a un recaudo, paso o vista rápida de taquilla[cite: 1].

### Tipo
Pantalla Completa

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Barra Superior de Navegación
  * Botón "Cerrar / Volver" a la vista de origen (`P03` o `P05`)
  * Nombre del archivo y recaudo/paso asociado
  * Indicador de disponibilidad local / offline
* Área Principal de Visualización
  * Lienzo de lectura de documento PDF o imagen con soporte de desplazamiento y zoom
* Barra Inferior de Controles de Lectura
  * Indicador de página (si es PDF multipágina) y controles de zoom / ajuste

### wireframe
```txt
+-------------------------------------------------------------+
| [X] cedula_frente.jpg (Copia de cédula)       [Offline OK] |
+-------------------------------------------------------------+
|                                                             |
|                                                             |
|                                                             |
|                  [ Vista del Documento / ]                  |
|                  [    Imagen / PDF       ]                  |
|                                                             |
|                                                             |
|                                                             |
+-------------------------------------------------------------+
| [- Zoom +]                  Página 1 / 1    [Ajustar ancho] |
+-------------------------------------------------------------+
```
---

## 9. Vista Rápida de Taquilla (P05)

### Propósito
Ofrecer una vista simplificada y disponible sin conexión para el momento de la cita o diligencia en taquilla, ocultando la configuración de fechas y dependencias para mostrar únicamente los recaudos consolidados y los accesos directos a los archivos cifrados locales[cite: 1, 2].

### Tipo
Pantalla Completa

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Barra Superior de Navegación
  * Botón "Volver al trámite" (`P02`)
  * Título ("Vista Rápida / Taquilla")
  * Nombre del trámite activo e indicador de modo offline listo
* Listado Consolidado de Recaudos Exigidos
  * Agrupación o lista limpia de recaudos del trámite
  * Ítem de Recaudo Consolidado (repetible)
    * Denominación del recaudo y estado ("Listo" / "Pendiente")
    * Botones/enlaces directos a los archivos adjuntos locales asociados -> abren Visor (`P04`)
    * Aviso si el recaudo no tiene archivo adjunto o está pendiente
* Pie de Navegación
  * Botón "Salir de Vista Rápida" (`P02` o `P01`)

### wireframe
```txt
+-------------------------------------------------------------+
| [<- Volver al trámite]   VISTA RÁPIDA / TAQUILLA [Offline]  |
| Trámite: Renovar Pasaporte                                  |
+-------------------------------------------------------------+
| RECAUDOS CONSOLIDADOS                                       |
|                                                             |
| 1. Copia de cédula de identidad                  [Listo]   |
|    [Abrir: cedula_frente.jpg]                               |
|                                                             |
| 2. Planilla de solicitud                         [Listo]   |
|    [Abrir: planilla_solicitud.pdf]                          |
|                                                             |
| 3. Comprobante de pago de arancel              [Pendiente] |
|    Sin archivo adjunto                                      |
+-------------------------------------------------------------+
| [ Salir de Vista Rápida ]                                   |
+-------------------------------------------------------------+
```
---

## 10. Catálogo de Plantillas Base (P06)

### Propósito
Presentar el catálogo de plantillas base (ej. pasaporte, licencia, seguro) indicando cuáles están habilitadas en el plan gratuito y cuáles requieren plan Pro, permitiendo instanciar un trámite o abrir el paywall contextual[cite: 1, 2].

### Tipo
Pantalla Completa

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Barra Superior de Navegación
  * Botón "Volver" al Panel Principal (`P01`)
  * Título ("Plantillas Base")
* Encabezado Introductorio
  * Breve explicación de cómo las plantillas generan pasos previos, recaudos sugeridos y fechas inversas desde una fecha límite objetivo
* Lista / Cuadrícula de Plantillas Base
  * Tarjeta de Plantilla (repetible)
    * Nombre de la plantilla (ej. Pasaporte, Licencia de Conducir, Seguro) y categoría
    * Resumen de pasos previos y recaudos sugeridos incluidos
    * Indicador de disponibilidad ("Gratuita" / "Disponible" o "Plan Pro" / bloqueada en Freemium)
    * Acción de selección: abre Instanciar Trámite (`M05`) si está habilitada, o Paywall (`M06`) si está bloqueada en Freemium

### wireframe
```txt
+-------------------------------------------------------------+
| [<-] Plantillas Base                                        |
+-------------------------------------------------------------+
| Elige una plantilla para calcular pasos y recaudos hacia   |
| atrás a partir de tu fecha límite objetivo.                 |
+-------------------------------------------------------------+
| +---------------------------------------------------------+ |
| | Pasaporte                                    [Gratuita] | |
| | Incluye 3 pasos previos y 5 recaudos sugeridos.         | |
| | [ Usar plantilla -> ]                                   | |
| +---------------------------------------------------------+ |
| +---------------------------------------------------------+ |
| | Seguro Vehicular                             [Gratuita] | |
| | Incluye 2 pasos previos y 4 recaudos sugeridos.         | |
| | [ Usar plantilla -> ]                                   | |
| +---------------------------------------------------------+ |
| +---------------------------------------------------------+ |
| | Licencia de Conducir                        [Plan Pro]  | |
| | Incluye 3 pasos previos y 4 recaudos sugeridos.         | |
| | [ Bloqueada - Ver Plan Pro ]                            | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+
```
---

## 11. Instanciar Trámite desde Plantilla (M05)

### Propósito
Permitir que el usuario ingrese únicamente la "Fecha límite objetivo" para una plantilla habilitada y cree el trámite con sus pasos previos, recaudos sugeridos y fechas inversas calculadas, pudiendo luego personalizarlos[cite: 1].

### Tipo
Modal / Bottom Sheet

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Encabezado del Modal
  * Título ("Crear desde plantilla")
  * Nombre de la plantilla seleccionada
  * Botón "Cerrar"
* Resumen de Estructura a Generar
  * Vista previa de pasos previos y recaudos sugeridos que se crearán automáticamente
* Campo de Entrada Principal
  * Selector de fecha "Fecha límite objetivo"
* Pie de Acciones
  * Botón "Cancelar"
  * Botón principal "Crear trámite"

### wireframe
```txt
+-------------------------------------------------------------+
| Crear desde plantilla: Pasaporte                        [X] |
+-------------------------------------------------------------+
| Se generarán 3 pasos previos y 5 recaudos sugeridos con     |
| fechas calculadas en cuenta regresiva.                      |
|                                                             |
| Fecha límite objetivo *                                     |
| [ DD/MM/AAAA                                        [Cal] ] |
|                                                             |
| [Cancelar]                                  [Crear trámite] |
+-------------------------------------------------------------+
```
---

## 12. Configuración y Respaldo de Datos (P07)

### Propósito
Centralizar la gestión del plan del usuario (estado actual y acceso a adquirir o restaurar el plan Pro) y la exportación de respaldo de datos (bloqueada con paywall para Freemium o disponible para Personal Pro)[cite: 1, 2].

### Tipo
Pantalla Completa

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Barra Superior de Navegación
  * Botón "Volver" al Panel Principal (`P01`)
  * Título ("Configuración y Respaldo")
* Sección de Plan y Suscripción (`CU-12`)
  * Indicador del plan actual ("Plan Gratuito / Freemium" o "Personal Pro")
  * Botón / acción "Adquirir o gestionar Plan Pro" (`M06`)
  * Botón / acción "Restaurar compras" (`CU-12`)
  * Indicador de estado de procesamiento o confirmación al restaurar/actualizar plan
* Sección de Respaldo y Exportación (`CU-09`)
  * Encabezado ("Respaldo de Datos")
  * Selector de alcance de exportación (ej. "Todos los trámites" o un trámite específico, si aplica)
  * Botón / acción "Exportar respaldo" (abre `M06` en Freemium o dispara el menú nativo de guardar/compartir en Personal Pro)
  * Mensaje de confirmación al completarse la exportación

### wireframe
```txt
+-------------------------------------------------------------+
| [<-] Configuración y Respaldo                               |
+-------------------------------------------------------------+
| PLAN ACTUAL                                                 |
| Estado: Plan Gratuito (Freemium)                            |
| [ Obtener Plan Pro (Lifetime / Anual) ]                   |
| [ Restaurar compras ]                                       |
+-------------------------------------------------------------+
| RESPALDO DE DATOS                                           |
| Alcance: [ Todos los trámites v ]                           |
| [ Exportar respaldo (Datos + Adjuntos) ]                    |
|                                                             |
| Nota: Los documentos adjuntos se resguardan cifrados en el |
| dispositivo y se incluyen en el paquete de exportación.     |
+-------------------------------------------------------------+
```
---

## 13. Paywall Contextual Personal Pro (M06)

### Propósito
Presentar de forma contextual los beneficios de Personal Pro cuando el usuario alcanza un límite del plan gratuito, selecciona una plantilla bloqueada o intenta exportar un respaldo, permitiendo elegir entre Pago único Lifetime o Suscripción anual, comprar, restaurar compras o descartar el aviso[cite: 1, 2].

### Tipo
Modal / Bottom Sheet

### Lista de Componentes Jerárquicos (Orden de Aparición)
* Encabezado del Modal
  * Título / mensaje contextual del motivo de activación (límite de trámites/adjuntos, plantilla bloqueada o exportación de respaldo)
  * Botón "Cerrar / Descartar"
* Lista de Beneficios de Personal Pro
  * Beneficios clave (trámites y adjuntos ampliados, acceso a todas las plantillas base, exportación de respaldo completa)
* Selector de Modalidad de Plan (`CU-12`)
  * Opción / botón "Pago único Lifetime"
  * Opción / botón "Suscripción anual"
* Acciones de Compra y Restauración (`CU-12`)
  * Botón principal "Continuar / Comprar" (invoca pasarela nativa del sistema operativo y muestra estado de procesamiento)
  * Botón secundario "Restaurar compras"
  * Botón "Ahora no / Cerrar"

### wireframe
```txt
+-------------------------------------------------------------+
| Desbloquea Personal Pro                                 [X] |
| Amplía tus límites, accede a todas las plantillas y exporta |
| respaldos completos de tus trámites y documentos.           |
+-------------------------------------------------------------+
| MODALIDAD DE PLAN                                           |
| (o) Pago único Lifetime       ( ) Suscripción anual         |
+-------------------------------------------------------------+
| [ Continuar / Comprar ]                                     |
| [ Restaurar compras ]                       [ Cerrar ]      |
+-------------------------------------------------------------+
```