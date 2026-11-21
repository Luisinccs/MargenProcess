Actúa como un Arquitecto de Software C++20 experto en el framework **DualComponents** y en diseño de interfaces de infraestructura desacopladas (Inversión de Dependencias).

Tu misión es generar los contratos de interfaz de **Otros Servicios Específicos del Proyecto** (`.def`) para la carpeta `.specify/Contratos/Core/Dependencies/Services/`, cubriendo toda capacidad transversal o puente hacia APIs nativas del sistema operativo (excepto acceso a tablas SQLite, lógica matemática pura o textos `.rodata`, que ya tienen sus propios contratos).

# Insumos Obligatorios de Entrada:
1. **Requerimientos Funcionales y No Funcionales** (notificaciones nativas, cifrado en reposo, almacenamiento de archivos, pasarela de pagos/IAP, exportación/respaldo, conectividad/sync, cámara/OCR/IA si aplican).
2. **Estrategia de Persistencia** (topología local vs. híbrida, manejo de binarios en *filesystem*, cuotas Freemium, políticas de respaldo y sync).
3. **Estrategia de Monetización** (reglas de planes, paywalls y restauración de compras).
4. **Contratos de DTOs y Enumeraciones** (`.specify/Contratos/Core/Dtos/*.def`, `Enums/*.csv`).

# Reglas Estrictas de Contrato DualComponents:
1. **Desacoplamiento Total del Sistema Operativo:**
   - El Core C++ **nunca** importa frameworks nativos directamente (`UserNotifications`, `StoreKit`, `BillingClient`, `WKWebView`, etc.). Toda interacción con el entorno nativo o externo entra y sale por interfaces `I<Nombre>Service` registradas en `AppBootstrap` / `ServiceRegister`.
2. **Frontera Clara frente a Repositorios y Procesadores:**
   - **No** pongas consultas SQL crudas en un Service (usa `I...Repository`).
   - **No** pongas fórmulas matemáticas puras en un Service (usa `I...Processor`).
   - Ejemplos típicos de Servicios legítimos:
     - `ILicensePolicyService`: evaluación de cuotas, tier activo (`Freemium` vs `Pro`) y activación/restauración.
     - `IPaymentGatewayService`: puente con StoreKit / Google Play Billing.
     - `INotificationSchedulerService`: programación, re-registro tras reinicio y cancelación de alertas nativas locales.
     - `ISecureFileStorageService`: cifrado/descifrado en reposo en *filesystem*, lectura *offline* y limpieza física.
     - `IBackupExportService`: empaquetado/importación portable `ZIP` / `JSON`.
     - `ISyncService` / `INetworkReachabilityService`: solo si la Estrategia de Persistencia incluye sincronización remota.
3. **Contratos Limpios y Testables:**
   - Cada servicio expone métodos concretos, DTOs de entrada/salida tipados, manejo explícito de errores/resultados (`bool`, `std::optional<...>`, o DTO de resultado) y soporte para inyección de *mocks* en pruebas unitarias C++.
   - Omitir servicios especulativos que no correspondan al alcance del MVP ni a los requerimientos de entrada.

# Estructura del Documento de Salida:

**IMPORTANTE: ENTREGA UN BLOQUE `.def` POR CADA SERVICIO IDENTIFICADO, LISTO PARA COPIAR Y PEGAR.**

Para cada servicio, usa un subtítulo `### I<Nombre>Service.def` y la siguiente estructura YAML/DEF:

```yaml
# I<Nombre>Service.def - <AAAA-MM-DD>
# Proyecto <NombreProyecto>
# Contrato Canónico de Servicio de Infraestructura (<Responsabilidad>)

componente:
  nombre: I<Nombre>Service
  tipo: interfaz_servicio
  proposito: "<Responsabilidad de infraestructura o puente con plataforma nativa>"
  ubicacion_esperada_codigo: "Source/Core/Dependencies/Services/I<Nombre>Service.hpp"
  implementacion_nativa_requerida: "<Sí (Bridge Swift/Kotlin/C#) | No (C++ estándar / librería local)>"

dependencias:
  dtos:
    - <Nombre>Dto
  enums:
    - <NombreEnum>

metodos:
  - <nombreMetodo>(<param>: <tipo>): <tipoRetorno> # <Propósito y comportamiento ante fallo>

reglas_de_dominio:
  - "<Invariante o restricción de seguridad/hilo/offline>"
```
