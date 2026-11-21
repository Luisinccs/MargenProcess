# Modelo Conceptual de Interacción - Gestor de Trámites y Vencimientos Burocráticos/Legales con Dependencias MVP
**Fecha:** 20 de noviembre de 2026

---

### CU-01: Gestionar Trámites
- **Pantalla de Inicio:** Panel Principal / Dashboard de Trámites
- **Elementos de Entrada (Inputs de UI):** Botón "Nuevo Trámite", campo de texto "Título", selector/lista desplegable "Categoría", selector de fecha "Fecha límite final", área de texto "Notas generales", botón "Guardar", control de edición/eliminación sobre un trámite existente y confirmación de eliminación.
- **Pasos de Interacción del Usuario:**
  1. Para crear: pulsa "Nuevo Trámite", completa título, categoría, fecha límite final y notas generales, y pulsa "Guardar". (Si supera el límite Freemium y se activa el *paywall*, puede descartarlo o continuar hacia la adquisición del plan).
  2. Para consultar: selecciona un trámite de la lista para abrir su vista de detalle.
  3. Para editar o eliminar: abre un trámite existente, modifica su información (como la fecha límite) y guarda los cambios, o selecciona "Eliminar" y confirma la acción.
- **Cambio de Pantalla/Estado:** En creación válida, el nuevo trámite aparece en el panel principal con sus fechas de cuenta regresiva calculadas y alertas programadas; si se supera el límite gratuito, se superpone la pantalla contextual de *Paywall*. En edición, se actualizan los datos, las fechas calculadas y las alertas asociadas; en eliminación, el trámite desaparece del listado y se limpian sus alertas.

### CU-02: Configurar Pasos y Dependencias
- **Pantalla de Inicio:** Detalle del Trámite
- **Elementos de Entrada (Inputs de UI):** Botón "Agregar paso previo", campo de texto "Nombre del paso", control de orden/secuencia (reordenamiento o selector de posición), selector numérico y unidad de tiempo ("Días", "Semanas", "Meses") para la anticipación/duración respecto al siguiente paso o fecha límite, y botón "Guardar".
- **Pasos de Interacción del Usuario:**
  1. Dentro del trámite, pulsa "Agregar paso previo" (o selecciona un paso existente para editarlo/reordenarlo).
  2. Ingresa el nombre del paso, define su orden secuencial en la cadena de dependencias y establece el tiempo de anticipación requerido en días, semanas o meses.
  3. Reordena pasos si es necesario y pulsa "Guardar" para confirmar la estructura.
- **Cambio de Pantalla/Estado:** La lista de pasos previos se actualiza en el detalle del trámite reflejando el orden configurado y las fechas de inicio y vencimiento calculadas automáticamente en cuenta regresiva.

### CU-04: Gestionar Recaudos por Paso
- **Pantalla de Inicio:** Detalle del Trámite / Vista de Paso Previo
- **Elementos de Entrada (Inputs de UI):** Selector de paso previo, botón/campo "Agregar recaudo", campo de texto para el nombre del recaudo (ej. formulario, timbre fiscal, copia de identidad), y casilla de verificación o interruptor de estado ("Pendiente" / "Listo") por cada recaudo.
- **Pasos de Interacción del Usuario:**
  1. Selecciona el paso previo correspondiente dentro del trámite.
  2. Agrega los recaudos requeridos ingresando su denominación y confirmando su creación.
  3. A medida que obtiene cada documento o requisito, alterna su estado entre "Pendiente" y "Listo".
- **Cambio de Pantalla/Estado:** El listado de recaudos del paso muestra cada elemento con su estado actual ("Pendiente" o "Listo") y actualiza visualmente el porcentaje o indicador de avance del paso.

### CU-05: Adjuntar y Visualizar Documentos
- **Pantalla de Inicio:** Detalle del Trámite / Lista de Recaudos o Pasos
- **Elementos de Entrada (Inputs de UI):** Botón o acción "Adjuntar archivo" en un recaudo o paso, selector de origen ("Cámara" o "Archivos/Galería" para imagen o PDF), miniatura o enlace del archivo adjunto, y visor integrado de documentos.
- **Pasos de Interacción del Usuario:**
  1. Para adjuntar: selecciona un recaudo o paso, pulsa "Adjuntar archivo", elige tomar una fotografía o seleccionar una imagen/PDF desde el dispositivo y confirma la carga. (Si alcanza el límite gratuito y se muestra el *paywall*, puede cerrar el aviso o ir a la opción de plan Pro).
  2. Para visualizar: toca el archivo adjunto o su miniatura asociada al recaudo/paso, ya sea con conexión o sin conexión (*offline*).
- **Cambio de Pantalla/Estado:** Al adjuntar con éxito, el archivo queda vinculado y cifrado en almacenamiento local, mostrándose su indicador/miniatura en el recaudo o paso; si se excede el tope gratuito, aparece el *paywall* contextual. Al abrir un archivo, se despliega el visor integrado mostrando el documento o imagen de forma inmediata.

### CU-06: Consultar Progreso y Ruta Crítica
- **Pantalla de Inicio:** Panel Principal / Dashboard de Trámites
- **Elementos de Entrada (Inputs de UI):** Tarjetas o filas de trámites con indicadores de estado ("En espera/latente", "En ventana de acción", "En riesgo", "Completado"), indicador destacado del "Próximo paso crítico", y acción de selección sobre un trámite.
- **Pasos de Interacción del Usuario:**
  1. Accede al panel principal de trámites.
  2. Revisa los estados de los trámites y observa el próximo paso crítico resaltado para identificar qué acción debe ejecutar hoy.
  3. Selecciona un trámite o paso resaltado para profundizar en su detalle.
- **Cambio de Pantalla/Estado:** El panel muestra los trámites clasificados según la fecha actual y las fechas calculadas, manteniendo ocultos o atenuados los trámites en espera/latente para evitar ruido visual y destacando el próximo paso crítico; al seleccionar un trámite, navega a su vista de detalle.

### CU-07: Consultar Vista Rápida de Taquilla
- **Pantalla de Inicio:** Detalle del Trámite Activo
- **Elementos de Entrada (Inputs de UI):** Botón o pestaña "Vista rápida / Taquilla" ("Listo para cita / taquilla"), listado consolidado de recaudos, accesos directos a archivos adjuntos locales, y botón/acción para salir o volver a la vista completa del trámite.
- **Pasos de Interacción del Usuario:**
  1. Abre un trámite activo y pulsa "Vista rápida / Taquilla" (disponible también sin conexión a internet).
  2. Consulta el listado consolidado de recaudos exigidos y toca directamente el archivo adjunto necesario para revisarlo durante la cita o diligencia.
  3. Al finalizar la consulta, regresa a la vista completa del trámite o al panel principal.
- **Cambio de Pantalla/Estado:** La interfaz cambia a una vista simplificada que oculta la configuración de fechas y dependencias, exhibiendo únicamente los recaudos consolidados y los accesos directos a los archivos cifrados locales; al tocar un archivo, se abre el visor integrado.

### CU-08: Instanciar Trámite desde Plantilla
- **Pantalla de Inicio:** Panel Principal / Catálogo de Plantillas
- **Elementos de Entrada (Inputs de UI):** Botón "Desde plantilla" o acceso al catálogo de plantillas base (ej. pasaporte, licencia, seguro), tarjetas de plantillas (con indicación de disponibilidad o bloqueo en plan gratuito), selector de fecha "Fecha límite objetivo", botón "Crear trámite", y controles de edición de pasos/recaudos.
- **Pasos de Interacción del Usuario:**
  1. Abre el catálogo de plantillas base y explora las opciones disponibles.
  2. Selecciona una plantilla. (Si es usuario Freemium y la plantilla no está entre las 2 gratuitas habilitadas, se despliega el *paywall*).
  3. En una plantilla habilitada, ingresa únicamente la "Fecha límite objetivo" y pulsa "Crear trámite".
  4. Revisa el trámite generado y, si lo desea, edita, agrega o elimina pasos previos y recaudos sugeridos.
- **Cambio de Pantalla/Estado:** Si la plantilla está bloqueada en Freemium, se muestra la pantalla de *Paywall*; si se instancia correctamente, se crea el trámite con sus pasos previos, recaudos sugeridos y fechas inversas calculadas, llevando al usuario al trámite creado o al panel principal listo para personalizar.

### CU-09: Exportar Respaldo de Datos
- **Pantalla de Inicio:** Panel Principal / Configuración o Menú del Trámite
- **Elementos de Entrada (Inputs de UI):** Botón u opción "Exportar respaldo", selector de alcance (un trámite específico o todos los trámites, si aplica), y diálogo/menú nativo para guardar o compartir el archivo exportado.
- **Pasos de Interacción del Usuario:**
  1. Navega al menú de exportación o configuración y pulsa "Exportar respaldo".
  2. Selecciona el trámite o conjunto de trámites a respaldar (si aplica) y confirma la exportación.
  3. Si es usuario Freemium, interactúa con el *paywall* mostrado (puede cerrarlo o avanzar a la compra del plan Pro); si es Personal Pro, elige dónde guardar o compartir el archivo generado.
- **Cambio de Pantalla/Estado:** Para usuarios Freemium, se despliega el *Paywall* contextual bloqueando la exportación directa; para usuarios Personal Pro, el sistema genera el paquete estándar con datos y archivos adjuntos y abre el selector de guardado/compartir del dispositivo, mostrando confirmación al completarse.

### CU-12: Adquirir o Restaurar Plan Pro
- **Pantalla de Inicio:** Pantalla Contextual de *Paywall* o Configuración / Gestión de Plan
- **Elementos de Entrada (Inputs de UI):** Selector o botones de modalidad de plan ("Pago único Lifetime" / "Suscripción anual"), botón "Continuar / Comprar", botón "Restaurar compras", y controles de la pasarela nativa del sistema operativo.
- **Pasos de Interacción del Usuario:**
  1. Desde el *paywall* o desde la sección de plan/configuración, elige entre "Pago único Lifetime" o "Suscripción anual" y pulsa el botón de compra, o bien pulsa "Restaurar compras".
  2. Completa la autenticación o confirmación solicitada por la pasarela de pagos nativa de la tienda.
- **Cambio de Pantalla/Estado:** Se muestra el estado de procesamiento durante la comunicación con la pasarela nativa; al confirmarse la compra o restauración, la interfaz actualiza el perfil a "Personal Pro", cierra el *paywall* o actualiza la pantalla de plan, retira los límites gratuitos y habilita plantillas y exportación de respaldo.