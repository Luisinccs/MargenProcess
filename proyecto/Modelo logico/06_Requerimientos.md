# Documento de Especificación de Requerimientos del Producto Mínimo Viable (MVP)
**Producto:** Gestor de Trámites y Vencimientos Burocráticos/Legales con Dependencias  
**Fecha:** 20 de noviembre de 2026  

---

## Alcance y Estrategia del Sistema

### Propuesta Única de Valor (PUV)
El sistema permite gestionar trámites y vencimientos burocráticos o legales mediante **cuentas regresivas inversas con dependencias**, calculando automáticamente hacia atrás cuándo iniciar cada paso previo a partir de una fecha límite final y vinculando directamente los recaudos documentales requeridos a cada etapa del proceso.

### Alcance del MVP (Dentro del Alcance)
* Creación y gestión de trámites principales con una fecha límite objetivo (vencimiento o fecha máxima de presentación).
* Definición de pasos previos (prerequisitos) con tiempos estimados de anticipación o duración y relaciones de dependencia secuencial.
* Motor de cálculo inverso (*backward scheduling*) que determina la fecha de inicio de cada paso previo y recalcula la cadena ante cambios en fechas o duraciones.
* Gestión de estado de cada paso y recaudo (pendiente, listo/completado).
* Carga, asociación y visualización rápida de archivos adjuntos (imágenes/fotos y PDFs de recaudos) vinculados directamente a cada paso o requisito.
* Sistema de notificaciones en dos niveles: aviso de apertura de ventana de acción de cada prerequisito y alerta de proximidad de la fecha límite.
* Plantillas base preconfiguradas de trámites comunes (ej. pasaporte, licencia, seguro) clonables y editables por el usuario.
* Vista consolidada de preparación ("Listo para cita / taquilla") que agrupa los recaudos exigidos para el trámite activo.
* Control de límites de uso y desbloqueo comercial bajo modelo *Freemium* con opción de pago único (*Lifetime*) o suscripción anual.

### Exclusiones del MVP (Fuera del Alcance)
* Espacios de trabajo multi-usuario, gestión de equipos B2B, roles empresariales y reportes de auditoría organizacional.
* Perfiles familiares compartidos con sincronización multi-cuenta en tiempo real.
* Tienda o marketplace de packs de plantillas especializadas de terceros.
* Integración directa con portales gubernamentales, citas automáticas o validación oficial de documentos mediante OCR/IA.
* Sincronización bidireccional con calendarios externos de terceros.

---

## Requerimientos Funcionales (MVP)

* **RF-01 — Gestión de Trámites:** El sistema debe permitir crear, editar, consultar y eliminar trámites, definiendo un título, categoría, fecha límite final y notas generales.
* **RF-02 — Configuración de Dependencias y Tiempos Previos:** El sistema debe permitir agregar múltiples pasos previos (prerequisitos) dentro de un trámite, estableciendo su orden de dependencia secuencial y el tiempo de anticipación requerido (en días, semanas o meses) antes del paso siguiente o de la fecha límite.
* **RF-03 — Cálculo Automático de Cuenta Regresiva Inversa:** El sistema debe calcular automáticamente la fecha límite de inicio de cada paso previo contando hacia atrás desde la fecha objetivo final y encadenando las duraciones de los pasos dependientes.
* **RF-04 — Recálculo Dinámico:** El sistema debe recalcular de forma automática las fechas de inicio y vencimiento de todos los pasos afectados cuando el usuario modifique la fecha límite final, la duración de un paso previo o el orden de las dependencias.
* **RF-05 — Gestión de Recaudos por Paso:** El sistema debe permitir definir una lista de recaudos requeridos dentro de cada paso previo y marcar cada recaudo como pendiente o listo.
* **RF-06 — Adjunto y Visualización de Documentos:** El sistema debe permitir adjuntar fotografías o documentos (como cédulas, comprobantes de pago o planillas) directamente a cada recaudo o paso, así como previsualizarlos de forma inmediata desde el trámite.
* **RF-07 — Seguimiento de Progreso y Ruta Crítica:** El sistema debe mostrar el estado general del trámite (en espera/latente, en ventana de acción, en riesgo o completado) y resaltar el próximo paso crítico a ejecutar según la fecha actual.
* **RF-08 — Notificaciones de Ventana de Acción:** El sistema debe enviar notificaciones automáticas cuando se alcance la fecha calculada de inicio de un paso previo (apertura de ventana de acción) y cuando un paso entre en riesgo de retraso respecto a la fecha final.
* **RF-09 — Plantillas Base Reutilizables:** El sistema debe incluir un catálogo inicial de plantillas de trámites frecuentes con sus pasos previos y recaudos sugeridos, permitiendo al usuario instanciarlas ingresando únicamente su fecha límite y ajustarlas libremente.
* **RF-10 — Vista Rápida de Recaudos Listos:** El sistema debe ofrecer una vista resumida por trámite que muestre únicamente los recaudos asociados y sus archivos adjuntos para facilitar su consulta rápida durante una diligencia o cita.
* **RF-11 — Exportación de Respaldo:** El sistema debe permitir al usuario exportar los datos y archivos adjuntos de sus trámites para evitar la pérdida de información o dependencia exclusiva de la plataforma.

---

## Requerimientos No Funcionales (MVP)

* **RNF-01 — Seguridad y Privacidad Documental:** Todos los documentos e imágenes adjuntos (identificaciones, comprobantes y planillas) deben almacenarse cifrados en reposo y transmitirse mediante protocolos seguros cifrados en tránsito.
* **RNF-02 — Acceso Offline en Consulta:** El sistema debe permitir consultar los trámites activos, sus fechas calculadas y visualizar los recaudos ya adjuntados sin necesidad de conexión a internet (garantizando acceso en oficinas o consulados sin señal).
* **RNF-03 — Rendimiento y Fluidez:** El cálculo inverso de fechas, el recálculo de dependencias y la apertura de documentos adjuntos deben ejecutarse en menos de 1 segundo para mantener una experiencia ágil en dispositivos móviles.
* **RNF-04 — Usabilidad y Baja Fricción de Silencio:** El sistema debe mantener ocultos o en estado latente los trámites cuya ventana de acción aún no se ha abierto, evitando saturar al usuario con alertas irrelevantes antes de tiempo.
* **RNF-05 — Confiabilidad de Notificaciones:** Las alertas programadas para el inicio de ventanas de acción deben entregarse de forma puntual y persistente, operando de manera confiable incluso tras el reinicio del dispositivo.
* **RNF-06 — Portabilidad de Datos:** Los archivos adjuntos y registros deben almacenarse en formatos estándar que garanticen su exportación íntegra y legible fuera del sistema.

---

## Requerimientos de Monetización

* **Objetivo de Monetización Principal:** Validar la disposición a pagar (*willingness to pay*) de usuarios individuales mediante un modelo **Freemium** con conversión en puntos naturales de fricción hacia un **Pago Único (*Lifetime Unlock*)** o **Suscripción Anual Accesible**.
* **RM-01 — Nivel Gratuito (Freemium de Captación):** El sistema debe permitir el uso gratuito con los siguientes límites estrictos:
  * Hasta **3 trámites activos** simultáneos con cálculo inverso y dependencias.
  * Hasta **5 archivos adjuntos** en total distribuidos entre los trámites.
  * Acceso limitado a **2 plantillas base** preconfiguradas.
  * Notificaciones estándar de apertura de ventana de acción.
* **RM-02 — Nivel Pago (Personal Pro — Lifetime / Suscripción Anual):** El sistema debe habilitar el desbloqueo mediante compra integrada (pago único *Lifetime* o plan anual recurrente) otorgando:
  * Trámites activos ilimitados y cadenas de dependencias sin restricción de niveles.
  * Almacenamiento y carga ilimitada de recaudos adjuntos por requisito.
  * Acceso completo y clonación ilimitada de todas las plantillas base.
  * Habilitación de exportación completa de respaldo de trámites y documentos.
* **RM-03 — Disparadores de Conversión (*Paywalls* Contextuales):** El sistema debe presentar la oferta de actualización de plan únicamente cuando el usuario intente superar un límite del nivel gratuito (crear un 4.º trámite activo, subir un 6.º archivo adjunto, seleccionar una plantilla bloqueada o solicitar una exportación de respaldo).
* **RM-04 — Gestión de Compras y Restauración:** El sistema debe integrar la pasarela nativa de pagos de la plataforma correspondiente y ofrecer una opción clara para validar y restaurar compras previas en el dispositivo del usuario.