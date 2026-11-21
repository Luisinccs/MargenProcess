# Modelo Lógico de Procesos - Gestor de Trámites y Vencimientos Burocráticos/Legales con Dependencias MVP
**Fecha:** 20 de noviembre de 2026

---

### AdjuntarYVisualizarDocumentos
- **Resumen:** Adjunta de forma cifrada un archivo (imagen o PDF) a un recaudo o paso previo validando cuotas del plan activo, y permite previsualizarlo localmente sin conexión.
- **Entradas (Inputs):** `id_perfil`, `id_tramite`, `id_recaudo` (opcional), `id_paso_previo` (opcional), `modo_operacion` (`'ADJUNTAR'` | `'VISUALIZAR'`), `id_documento` (requerido si `modo_operacion = 'VISUALIZAR'`), `archivo_origen` (requerido si `modo_operacion = 'ADJUNTAR'`, con `nombre_archivo`, `formato_archivo`, `tamano_bytes`, contenido binario).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `AdjuntarYVisualizarDocumentos`.
    - Paso 2: SI `modo_operacion = 'ADJUNTAR'` ENTONCES:
        - Paso 2.1: VALIDAR que `formato_archivo` pertenezca a `{'PDF', 'JPG', 'JPEG', 'PNG', 'WEBP'}`, `tamano_bytes > 0` y `nombre_archivo` tenga longitud entre 1 y 255 caracteres. SI NO CUMPLE, DEVOLVER error de validación documental.
        - Paso 2.2: CONSULTAR `PERFIL_SUSCRIPCION` por `id_perfil` y contar el total de `DOCUMENTO_ADJUNTO` vigentes en los trámites del perfil.
        - Paso 2.3: SI `plan_activo = 'FREEMIUM'` Y `total_archivos_actuales >= limite_archivos_adjuntos` (5) ENTONCES:
            - Paso 2.3.1: INVOCAR evaluación de límite / disparador de *paywall* (`'LIMITE_ADJUNTOS'`) y DEVOLVER resultado de bloqueo comercial.
        - Paso 2.4: CIFRAR el contenido binario del archivo en reposo (`estado_cifrado = 'CIFRADO_EN_REPOSO'`) y PERSISTIRLO en el almacenamiento local generando `ruta_almacenamiento_cifrado` con `disponible_offline = 'SI'`.
        - Paso 2.5: CREAR registro `DOCUMENTO_ADJUNTO` vinculado a `id_recaudo` y/o `id_paso_previo` con `fecha_carga = fecha_hora_actual`.
        - Paso 2.6: RECALCULAR `porcentaje_avance` y `estado_operativo` del `TRAMITE` (`id_tramite`).
        - Paso 2.7: DEVOLVER registro de `DOCUMENTO_ADJUNTO` creado.
    - Paso 3: SI `modo_operacion = 'VISUALIZAR'` ENTONCES:
        - Paso 3.1: CONSULTAR `DOCUMENTO_ADJUNTO` por `id_documento` y verificar existencia local en `ruta_almacenamiento_cifrado` (sin requerir conexión a internet).
        - Paso 3.2: DESCIFRAR en memoria y ABRIR visor local para previsualización inmediata.
        - Paso 3.3: DEVOLVER referencia de visualización y metadatos del documento.
- **Salida (Output):** Metadatos del `DOCUMENTO_ADJUNTO` registrado (en modo adjuntar) o flujo de previsualización local del documento (en modo visualizar), o estado de bloqueo por límite Freemium.

---

### CalcularCuentaRegresivaInversa
- **Resumen:** Calcula de forma determinista y en cuenta regresiva las fechas de inicio y vencimiento de cada `PASO_PREVIO` a partir de `fecha_limite_final` del `TRAMITE` y las dependencias encadenadas.
- **Entradas (Inputs):** `id_tramite`, `fecha_actual` (opcional, por defecto fecha/hora actual del sistema).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `CalcularCuentaRegresivaInversa`.
    - Paso 2: OBTENER `TRAMITE` por `id_tramite` (recuperando `fecha_limite_final`) y CONSULTAR todos los `PASO_PREVIO` asociados ordenados por `orden_secuencia` descendente (desde el último paso previo hacia el primero).
    - Paso 3: SI no existen `PASO_PREVIO` asociados ENTONCES:
        - Paso 3.1: EVALUAR `estado_operativo` del `TRAMITE` según `fecha_limite_final` y `fecha_actual`, y DEVOLVER lista vacía de pasos calculados.
    - Paso 4: ESTABLECER `fecha_ancla_siguiente = fecha_limite_final` y `id_siguiente_en_cadena = NULO`.
    - Paso 5: PARA CADA `paso` en la secuencia inversa (de mayor a menor `orden_secuencia`) HACER:
        - Paso 5.1: ASIGNAR `paso.fecha_vencimiento_calculada = fecha_ancla_siguiente` y `paso.id_paso_siguiente = id_siguiente_en_cadena`.
        - Paso 5.2: CONVERTIR `paso.valor_anticipacion` según `paso.unidad_anticipacion` (`'DIAS'`, `'SEMANAS'` = 7 días, `'MESES'` = calendario/meses según regla de fecha) y RESTARLO a `fecha_ancla_siguiente` para obtener `paso.fecha_inicio_calculada`.
        - Paso 5.3: ACTUALIZAR `paso.fecha_inicio_calculada`, `paso.fecha_vencimiento_calculada` y `paso.id_paso_siguiente` en `PASO_PREVIO`.
        - Paso 5.4: ACTUALIZAR `fecha_ancla_siguiente = paso.fecha_inicio_calculada` e `id_siguiente_en_cadena = paso.id_paso_previo`.
    - Paso 6: INVOCAR `SeguimientoProgresoYRutaCritica` para `id_tramite` e INVOCAR `ProgramarYEmitirAlertas` para reprogramar avisos según las nuevas fechas calculadas.
    - Paso 7: DEVOLVER colección de `PASO_PREVIO` con fechas actualizadas.
- **Salida (Output):** Lista de `PASO_PREVIO` del trámite con `fecha_inicio_calculada`, `fecha_vencimiento_calculada` y `id_paso_siguiente` actualizados.

---

### ConfigurarDependenciasYTiemposPrevios
- **Resumen:** Permite agregar, editar, reordenar o eliminar pasos previos (`PASO_PREVIO`) y sus tiempos de anticipación dentro de un trámite, disparando el recálculo inverso de la cadena.
- **Entradas (Inputs):** `id_tramite`, `accion` (`'AGREGAR'` | `'EDITAR'` | `'REORDENAR'` | `'ELIMINAR'`), datos del paso (`id_paso_previo`, `nombre_paso`, `orden_secuencia`, `valor_anticipacion`, `unidad_anticipacion`) o nueva secuencia ordenada de pasos.
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `ConfigurarDependenciasYTiemposPrevios`.
    - Paso 2: VERIFICAR que exista el `TRAMITE` identificado por `id_tramite`. SI NO EXISTE, DEVOLVER error de trámite no encontrado.
    - Paso 3: VALIDAR que para toda alta o edición: `nombre_paso` tenga entre 1 y 150 caracteres, `orden_secuencia >= 1`, `valor_anticipacion >= 1` y `unidad_anticipacion` esté en `{'DIAS', 'SEMANAS', 'MESES'}`. SI NO CUMPLE, DEVOLVER error de validación.
    - Paso 4: EJECUTAR la operación solicitada según `accion`:
        - Paso 4.1: SI `accion = 'AGREGAR'` ENTONCES CREAR registro `PASO_PREVIO` vinculado a `id_tramite` con `estado_paso = 'PENDIENTE'` y `es_paso_critico = 'NO'`.
        - Paso 4.2: SI `accion = 'EDITAR'` ENTONCES ACTUALIZAR atributos permitidos del `PASO_PREVIO` indicado.
        - Paso 4.3: SI `accion = 'REORDENAR'` ENTONCES REASIGNAR `orden_secuencia` (`1..N`) de los pasos del trámite conforme al orden recibido.
        - Paso 4.4: SI `accion = 'ELIMINAR'` ENTONCES CANCELAR alertas pendientes del `PASO_PREVIO`, ELIMINAR registros dependientes asociados y ELIMINAR el `PASO_PREVIO`, normalizando `orden_secuencia` de los pasos restantes.
    - Paso 5: INVOCAR `RecalculoDinamico` para `id_tramite` con motivo `'CAMBIO_DEPENDENCIAS_O_TIEMPOS'`.
    - Paso 6: DEVOLVER estado actualizado de la cadena de `PASO_PREVIO` del trámite.
- **Salida (Output):** Lista actualizada y recalculada de `PASO_PREVIO` del trámite.

---

### ExportarRespaldo
- **Resumen:** Valida el plan del usuario y genera un paquete portable (`ZIP_ESTANDAR` o `JSON_ESTANDAR`) con datos estructurados y documentos adjuntos de uno o todos los trámites.
- **Entradas (Inputs):** `id_perfil`, `alcance_exportacion` (`'TRAMITE_UNICO'` | `'TODOS_LOS_TRAMITES'`), `id_tramite` (requerido si `alcance_exportacion = 'TRAMITE_UNICO'`), `formato_paquete` (`'ZIP_ESTANDAR'` | `'JSON_ESTANDAR'`).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `ExportarRespaldo`.
    - Paso 2: CONSULTAR `PERFIL_SUSCRIPCION` por `id_perfil`.
    - Paso 3: VALIDAR `permite_exportacion_respaldo = 'SI'` y `plan_activo = 'PERSONAL_PRO'`. SI NO CUMPLE, INVOCAR evaluación de límite / *paywall* (`'EXPORTACION_PRO'`) y DEVOLVER resultado de restricción comercial.
    - Paso 4: CREAR registro `PAQUETE_RESPALDO` con `estado_generacion = 'EN_PROCESO'` y `fecha_solicitud = fecha_hora_actual`.
    - Paso 5: RECOPILAR entidades de `TRAMITE`, `PASO_PREVIO`, `RECAUDO` y `DOCUMENTO_ADJUNTO` correspondientes a `id_perfil` (filtrando por `id_tramite` si `alcance_exportacion = 'TRAMITE_UNICO'`).
    - Paso 6: DESCIFRAR temporalmente en memoria los archivos adjuntos seleccionados, serializar los datos en formato estándar portable y empaquetar según `formato_paquete` (`'ZIP_ESTANDAR'` o `'JSON_ESTANDAR'`).
    - Paso 7: SI el empaquetado es exitoso ENTONCES ACTUALIZAR `PAQUETE_RESPALDO.estado_generacion = 'LISTO_PARA_ENTREGA'`; SI FALLA, ACTUALIZAR `estado_generacion = 'ERROR'` y DEVOLVER error de generación.
    - Paso 8: ENTREGAR el archivo portable al usuario y ACTUALIZAR `PAQUETE_RESPALDO.estado_generacion = 'ENTREGADO'`.
    - Paso 9: DEVOLVER `PAQUETE_RESPALDO` y referencia del archivo generado.
- **Salida (Output):** Paquete de respaldo portable (`ZIP_ESTANDAR` o `JSON_ESTANDAR`) y registro `PAQUETE_RESPALDO` con estado `'ENTREGADO'` (o respuesta de *paywall* si el perfil es Freemium).

---

### GestionarRecaudosPorPaso
- **Resumen:** Administra la lista de recaudos documentales (`RECAUDO`) dentro de un `PASO_PREVIO` y actualiza su estado (`'PENDIENTE'` o `'LISTO'`) junto con el avance del trámite.
- **Entradas (Inputs):** `id_paso_previo`, `accion` (`'AGREGAR'` | `'EDITAR'` | `'CAMBIAR_ESTADO'` | `'ELIMINAR'`), `id_recaudo` (para editar, cambiar estado o eliminar), `nombre_recaudo` (opcional), `notas_recaudo` (opcional), `estado_recaudo` (`'PENDIENTE'` | `'LISTO'`, opcional).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `GestionarRecaudosPorPaso`.
    - Paso 2: VERIFICAR la existencia del `PASO_PREVIO` identificado por `id_paso_previo` y obtener su `id_tramite`. SI NO EXISTE, DEVOLVER error de paso no encontrado.
    - Paso 3: SI `accion = 'AGREGAR'` ENTONCES:
        - Paso 3.1: VALIDAR que `nombre_recaudo` tenga entre 1 y 180 caracteres y `notas_recaudo` hasta 500 caracteres. SI NO CUMPLE, DEVOLVER error de validación.
        - Paso 3.2: CREAR registro `RECAUDO` vinculado a `id_paso_previo` con `estado_recaudo = 'PENDIENTE'`.
    - Paso 4: SI `accion = 'EDITAR'` ENTONCES:
        - Paso 4.1: VALIDAR longitudes de `nombre_recaudo` y `notas_recaudo` y ACTUALIZAR el `RECAUDO` indicado.
    - Paso 5: SI `accion = 'CAMBIAR_ESTADO'` ENTONCES:
        - Paso 5.1: VALIDAR que `estado_recaudo` pertenezca a `{'PENDIENTE', 'LISTO'}` y ACTUALIZAR `RECAUDO.estado_recaudo`.
    - Paso 6: SI `accion = 'ELIMINAR'` ENTONCES:
        - Paso 6.1: ELIMINAR documentos adjuntos asociados o desvincularlos según regla de integridad y ELIMINAR el `RECAUDO`.
    - Paso 7: RECALCULAR el avance del `PASO_PREVIO` y el `porcentaje_avance` / `estado_operativo` del `TRAMITE` padre.
    - Paso 8: DEVOLVER lista actualizada de `RECAUDO` del paso y el nuevo `porcentaje_avance` del trámite.
- **Salida (Output):** Colección actualizada de `RECAUDO` del paso previo y `porcentaje_avance` recalculado del `TRAMITE`.

---

### GestionarTramites
- **Resumen:** Crea, consulta, edita o elimina un `TRAMITE` verificando límites de plan Freemium y coordinando el cálculo inverso de fechas y el ciclo de alertas.
- **Entradas (Inputs):** `id_perfil`, `accion` (`'CREAR'` | `'CONSULTAR'` | `'EDITAR'` | `'ELIMINAR'`), `id_tramite` (requerido para consultar, editar o eliminar), `titulo` (1–150 caracteres), `categoria` (`'PASAPORTE'` | `'LICENCIA'` | `'SEGURO'` | `'LEGAL'` | `'BUROCRATICO'` | `'OTRO'`), `fecha_limite_final`, `notas_generales` (0–2000 caracteres), `id_plantilla_origen` (opcional).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `GestionarTramites`.
    - Paso 2: CONSULTAR `PERFIL_SUSCRIPCION` por `id_perfil`.
    - Paso 3: SI `accion = 'CREAR'` ENTONCES:
        - Paso 3.1: VALIDAR `titulo`, `categoria` y `fecha_limite_final`. SI NO CUMPLE, DEVOLVER error de validación.
        - Paso 3.2: CONTAR trámites activos del perfil donde `activo_en_limite = 'SI'`.
        - Paso 3.3: SI `plan_activo = 'FREEMIUM'` Y `conteo_activos >= limite_tramites_activos` (3) ENTONCES:
            - Paso 3.3.1: INVOCAR evaluación de límite / *paywall* (`'LIMITE_TRAMITES'`) y DEVOLVER resultado de bloqueo comercial.
        - Paso 3.4: CREAR `TRAMITE` con `estado_operativo = 'EN_ESPERA_LATENTE'`, `porcentaje_avance = 0`, `activo_en_limite = 'SI'` y `fecha_creacion = fecha_hora_actual`.
        - Paso 3.5: INVOCAR `CalcularCuentaRegresivaInversa` para `id_tramite`.
        - Paso 3.6: DEVOLVER el `TRAMITE` creado.
    - Paso 4: SI `accion = 'CONSULTAR'` ENTONCES:
        - Paso 4.1: RECUPERAR el `TRAMITE` solicitado (o listado del perfil) junto con sus pasos, recaudos y documentos disponibles offline.
        - Paso 4.2: DEVOLVER datos consultados.
    - Paso 5: SI `accion = 'EDITAR'` ENTONCES:
        - Paso 5.1: ACTUALIZAR campos permitidos (`titulo`, `categoria`, `fecha_limite_final`, `notas_generales`) del `TRAMITE`.
        - Paso 5.2: SI se modificó `fecha_limite_final` ENTONCES INVOCAR `RecalculoDinamico` para `id_tramite` con motivo `'CAMBIO_FECHA_LIMITE'`.
        - Paso 5.3: SI no cambió `fecha_limite_final` ENTONCES INVOCAR `SeguimientoProgresoYRutaCritica` para `id_tramite`.
        - Paso 5.4: DEVOLVER el `TRAMITE` actualizado.
    - Paso 6: SI `accion = 'ELIMINAR'` ENTONCES:
        - Paso 6.1: CANCELAR todas las `ALERTA_NOTIFICACION` asociadas a `id_tramite` en el servicio nativo y marcarlas como `'CANCELADA'`.
        - Paso 6.2: ELIMINAR el `TRAMITE` y sus entidades dependientes (`PASO_PREVIO`, `RECAUDO`, `DOCUMENTO_ADJUNTO` asociados).
        - Paso 6.3: DEVOLVER confirmación de eliminación.
- **Salida (Output):** Entidad `TRAMITE` creada/consultada/actualizada, confirmación de eliminación o respuesta de bloqueo por límite de plan.

---

### InstanciarTramiteDesdePlantilla
- **Resumen:** Clona una `PLANTILLA_TRAMITE` (con sus `PASO_PLANTILLA` y `RECAUDO_PLANTILLA`) en un nuevo `TRAMITE` editable a partir de una fecha límite final, validando el acceso según el plan del usuario.
- **Entradas (Inputs):** `id_perfil`, `id_plantilla`, `fecha_limite_final`, `titulo` (opcional, por defecto `nombre_plantilla`), `notas_generales` (opcional).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `InstanciarTramiteDesdePlantilla`.
    - Paso 2: CONSULTAR `PERFIL_SUSCRIPCION` por `id_perfil` y `PLANTILLA_TRAMITE` por `id_plantilla`. SI NO EXISTE LA PLANTILLA, DEVOLVER error de plantilla no encontrada.
    - Paso 3: SI `plan_activo = 'FREEMIUM'` Y (`acceso_nivel = 'PERSONAL_PRO'` O `id_plantilla` no está dentro de las `limite_plantillas_base` (2) habilitadas) ENTONCES:
        - Paso 3.1: INVOCAR evaluación de límite / *paywall* (`'PLANTILLA_BLOQUEADA'`) y DEVOLVER resultado de restricción comercial.
    - Paso 4: INVOCAR `GestionarTramites` en modo `'CREAR'` pasando `id_perfil`, `titulo` (o `nombre_plantilla`), `categoria` de la plantilla, `fecha_limite_final`, `notas_generales` e `id_plantilla_origen = id_plantilla`. SI falla por límite de trámites activos, DEVOLVER el resultado obtenido.
    - Paso 5: OBTENER los `PASO_PLANTILLA` de `id_plantilla` ordenados por `orden_secuencia` ascendente.
    - Paso 6: PARA CADA `paso_tpl` ENCONTRADO HACER:
        - Paso 6.1: CREAR un `PASO_PREVIO` vinculado al nuevo `TRAMITE` copiando `nombre_paso`, `orden_secuencia`, `valor_anticipacion` y `unidad_anticipacion`, con `estado_paso = 'PENDIENTE'`.
        - Paso 6.2: OBTENER los `RECAUDO_PLANTILLA` de `paso_tpl` y CREAR un `RECAUDO` por cada uno vinculado al nuevo `PASO_PREVIO`, copiando `nombre_recaudo` y `notas_recaudo = notas_sugeridas`, con `estado_recaudo = 'PENDIENTE'`.
    - Paso 7: INVOCAR `CalcularCuentaRegresivaInversa` para el nuevo `id_tramite`.
    - Paso 8: DEVOLVER el `TRAMITE` instanciado con sus pasos previos y recaudos clonados.
- **Salida (Output):** Nuevo `TRAMITE` instanciado con `PASO_PREVIO` y `RECAUDO` clonados y fechas calculadas, o respuesta de *paywall*.

---

### NotificacionesDeVentanaDeAccion
- **Resumen:** Orquesta la emisión oportuna de alertas de apertura de ventana de acción (`'APERTURA_VENTANA'`) y de riesgo de vencimiento (`'RIESGO_VENCIMIENTO'`), manteniendo en silencio los trámites latentes y garantizando persistencia tras reinicio.
- **Entradas (Inputs):** `evento_disparo` (`'EVALUACION_PROGRAMADA'` | `'REINICIO_DISPOSITIVO'` | `'ACTUALIZACION_TRAMITE'`), `fecha_actual`, `id_tramite` (opcional).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `NotificacionesDeVentanaDeAccion`.
    - Paso 2: SI `evento_disparo = 'REINICIO_DISPOSITIVO'` ENTONCES:
        - Paso 2.1: CONSULTAR todas las `ALERTA_NOTIFICACION` donde `estado_alerta = 'PROGRAMADA'` y `persistente_tras_reinicio = 'VERDADERO'`.
        - Paso 2.2: RE-REGISTRAR dichas alertas en el servicio nativo de notificaciones del dispositivo.
    - Paso 3: CONSULTAR las `ALERTA_NOTIFICACION` elegibles (filtrando por `id_tramite` si se especifica) con `estado_alerta` en `{'PROGRAMADA', 'SILENCIADA_LATENTE'}` y `fecha_programada <= fecha_actual`.
    - Paso 4: PARA CADA `alerta` ENCONTRADA HACER:
        - Paso 4.1: CONSULTAR el `TRAMITE` y `PASO_PREVIO` asociados para verificar si el trámite está `'COMPLETADO'` o en fase latente sin apertura (`'EN_ESPERA_LATENTE'` cuando `tipo_alerta = 'APERTURA_VENTANA'` y aún no inicia la ventana).
        - Paso 4.2: SI el trámite está `'COMPLETADO'` ENTONCES MARCAR `alerta.estado_alerta = 'CANCELADA'` y CONTINUAR.
        - Paso 4.3: SI aún debe mantenerse en silencio por latencia ENTONCES MARCAR `alerta.estado_alerta = 'SILENCIADA_LATENTE'` y CONTINUAR.
        - Paso 4.4: EMITIR notificación hacia el servicio nativo del dispositivo y ACTUALIZAR `alerta.estado_alerta = 'EMITIDA'` y `alerta.fecha_emision = fecha_actual`.
    - Paso 5: DEVOLVER resumen de alertas emitidas, silenciadas o re-programadas.
- **Salida (Output):** Lista de `ALERTA_NOTIFICACION` procesadas y sus estados actualizados (`'EMITIDA'`, `'SILENCIADA_LATENTE'`, `'CANCELADA'` o `'PROGRAMADA'`).

---

### RecalculoDinamico
- **Resumen:** Recalcula de forma inmediata (< 1 segundo) las fechas de inicio y vencimiento de todos los pasos previos afectados ante cambios en la fecha límite final, duraciones o dependencias, reprogramando las alertas.
- **Entradas (Inputs):** `id_tramite`, `motivo_cambio` (`'CAMBIO_FECHA_LIMITE'` | `'CAMBIO_DURACION_PASO'` | `'CAMBIO_DEPENDENCIAS'`), `fecha_actual` (opcional).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `RecalculoDinamico`.
    - Paso 2: VERIFICAR la existencia del `TRAMITE` por `id_tramite`. SI NO EXISTE, DEVOLVER error de trámite no encontrado.
    - Paso 3: MARCAR `ALERTA_NOTIFICACION` vigentes de `id_tramite` con `estado_alerta = 'PROGRAMADA'` como `'CANCELADA'` antes de regenerar la programación.
    - Paso 4: INVOCAR `CalcularCuentaRegresivaInversa` para `id_tramite` y `fecha_actual`.
    - Paso 5: INVOCAR `SeguimientoProgresoYRutaCritica` para `id_tramite` y `fecha_actual`.
    - Paso 6: INVOCAR `NotificacionesDeVentanaDeAccion` con `evento_disparo = 'ACTUALIZACION_TRAMITE'` para sincronizar las nuevas alertas.
    - Paso 7: DEVOLVER el `TRAMITE` y la lista de `PASO_PREVIO` con sus fechas recalculadas.
- **Salida (Output):** `TRAMITE` y secuencia de `PASO_PREVIO` recalculados dinámicamente, con alertas sincronizadas.

---

### SeguimientoProgresoYRutaCritica
- **Resumen:** Evalúa el avance porcentual, el estado operativo del trámite (`'EN_ESPERA_LATENTE'`, `'EN_VENTANA_DE_ACCION'`, `'EN_RIESGO'`, `'COMPLETADO'`) y determina cuál es el próximo paso crítico (`es_paso_critico = 'SI'`).
- **Entradas (Inputs):** `id_tramite`, `fecha_actual` (opcional, por defecto fecha/hora actual del sistema).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `SeguimientoProgresoYRutaCritica`.
    - Paso 2: OBTENER el `TRAMITE` por `id_tramite` junto con sus `PASO_PREVIO` y `RECAUDO` asociados.
    - Paso 3: CALCULAR `porcentaje_avance` (0 a 100) en función de los recaudos en estado `'LISTO'` y/o pasos en estado `'LISTO_COMPLETADO'` respecto al total del trámite (asignando 100 si no hay pendientes y existen elementos completados, o 0 si no hay elementos).
    - Paso 4: DETERMINAR si el trámite está completado: SI todos los pasos y recaudos requeridos están completados ENTONCES establecer `estado_operativo = 'COMPLETADO'`, marcar todos los `PASO_PREVIO` con `es_paso_critico = 'NO'` y SALTAR al Paso 7.
    - Paso 5: RECORRER los `PASO_PREVIO` en `orden_secuencia` ascendente para identificar el primer paso no completado (`estado_paso = 'PENDIENTE'`):
        - Paso 5.1: MARCAR dicho paso con `es_paso_critico = 'SI'` y los demás pasos con `es_paso_critico = 'NO'`.
        - Paso 5.2: EVALUAR `fecha_actual` frente a `fecha_inicio_calculada`, `fecha_vencimiento_calculada` y `fecha_limite_final` del trámite:
            - SI `fecha_actual >= fecha_vencimiento_calculada` O la holgura restante hasta `fecha_limite_final` es crítica/insuficiente para completar el paso ENTONCES establecer `estado_operativo = 'EN_RIESGO'`.
            - SINO SI `fecha_actual >= fecha_inicio_calculada` ENTONCES establecer `estado_operativo = 'EN_VENTANA_DE_ACCION'`.
            - SINO establecer `estado_operativo = 'EN_ESPERA_LATENTE'`.
    - Paso 6: SI todos los `PASO_PREVIO` tienen `estado_paso = 'LISTO_COMPLETADO'` pero el trámite aún no está marcado como `'COMPLETADO'`, establecer `estado_operativo = 'EN_VENTANA_DE_ACCION'` y sin paso crítico pendiente.
    - Paso 7: ACTUALIZAR `TRAMITE.porcentaje_avance`, `TRAMITE.estado_operativo` y los indicadores `es_paso_critico` de los `PASO_PREVIO`.
    - Paso 8: DEVOLVER `estado_operativo`, `porcentaje_avance` y el `PASO_PREVIO` marcado como crítico (`es_paso_critico = 'SI'`), si aplica.
- **Salida (Output):** Estado operativo actualizado del `TRAMITE`, `porcentaje_avance` (0–100) e identificador/datos del próximo paso crítico (`es_paso_critico = 'SI'`).

---

### VistaRapidaDeRecaudosListos
- **Resumen:** Genera la vista resumida ("Listo para cita / taquilla") de un trámite mostrando exclusivamente los recaudos asociados y sus archivos adjuntos disponibles offline.
- **Entradas (Inputs):** `id_tramite`, `filtro_estado` (opcional: `'TODOS'` | `'LISTO'` | `'PENDIENTE'`, por defecto `'TODOS'`).
- **Pasos (Pseudocódigo Estructurado):**
    - Paso 1: INICIAR PROCESO `VistaRapidaDeRecaudosListos`.
    - Paso 2: VERIFICAR la existencia del `TRAMITE` por `id_tramite` y recuperar sus datos básicos (`titulo`, `categoria`, `fecha_limite_final`, `estado_operativo`). SI NO EXISTE, DEVOLVER error de trámite no encontrado.
    - Paso 3: CONSULTAR todos los `RECAUDO` vinculados a los `PASO_PREVIO` del `TRAMITE`, aplicando `filtro_estado` si es `'LISTO'` o `'PENDIENTE'`.
    - Paso 4: PARA CADA `recaudo` RECUPERADO HACER:
        - Paso 4.1: CONSULTAR los `DOCUMENTO_ADJUNTO` vinculados a `recaudo.id_recaudo` (y/o a su paso previo cuando aplique), priorizando aquellos con `disponible_offline = 'SI'`.
        - Paso 4.2: ASOCIAR al recaudo su `nombre_recaudo`, `estado_recaudo`, `notas_recaudo` y la lista resumida de `DOCUMENTO_ADJUNTO` (`id_documento`, `nombre_archivo`, `formato_archivo`, `disponible_offline`).
    - Paso 5: OMITIR estructuras de configuración de dependencias, edición de cronogramas o cálculos de anticipación para mantener una vista limpia de consulta rápida.
    - Paso 6: DEVOLVER la estructura consolidada de recaudos y accesos a documentos adjuntos del trámite.
- **Salida (Output):** Vista consolidada del trámite con los `RECAUDO` filtrados y los metadatos/accesos rápidos de sus `DOCUMENTO_ADJUNTO` asociados.