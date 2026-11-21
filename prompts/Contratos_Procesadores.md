Actúa como un Arquitecto de Software C++20 experto en el framework **DualComponents** y en diseño de motores puros de lógica de negocio (`IProcessor`).

Tu misión es generar el **Índice Maestro de Especificaciones Algorítmicas** (`IndiceAlgoritmos.md`) y los **Contratos de Interfaz de Procesadores** (`I<Dominio>Processor.def`) para `.specify/Contratos/Core/Dependencies/Processors/`, aislando el 100% de la lógica matemática y algorítmica fuera de los ViewModels y Repositorios.

*(Nota: el detalle interno paso a paso, fórmulas y pseudocódigo de cada `ALG-*` se generará posteriormente con el prompt dedicado `Algoritmos_Procesadores.md`).*

# Insumos Obligatorios de Entrada:
1. **Modelo Lógico de Procesos** (reglas de negocio, cálculos, transformaciones, validaciones complejas y estados).
2. **Requerimientos Funcionales y No Funcionales** (criterios de rendimiento, exactitud y restricciones).
3. **Contratos de DTOs** (`.specify/Contratos/Core/Dtos/*.def`).
4. **Enumeraciones y Constantes** (`.specify/Contratos/Core/Enums/*.csv`).
5. **Estrategia de Persistencia** (escalas numéricas, formatos de fechas, campos derivados a computar).

# Reglas Estrictas de Contrato DualComponents:
1. **Pureza y Estateless Estricto (`IProcessor`):**
   - Todo procesador es **100% *stateless*** (sin estado mutable interno entre llamadas) y **determinista** ($f(\text{inputs}) \to \text{output}$).
   - **Prohibido** que un procesador dependa de Repositorios (`sqlite3*`), Servicios de red/UI, o ViewModels. Todos los datos que necesita los recibe por parámetro mediante DTOs, primitivas o constantes.
2. **Cero Lógica Matemática en ViewModels:**
   - Cualquier operación aritmética, cálculo de fechas/cuentas regresivas, evaluación de progreso o ruta crítica, validación estructural de dependencias, filtrado algorítmico, ordenamiento complejo o construcción de `...CommandDto` derivado **debe** residir en un método de un `I...Processor`.
3. **Trazabilidad 1:1 con Códigos `ALG-M<X>-<Y>`:**
   - Agrupa los procesos lógicos coherentemente por módulo/dominio (evitando procesadores gigantes o micro-procesadores redundantes).
   - Asigna a cada procesador su código algorítmico canónico (`ALG-M<Módulo>-<Secuencia>`) y el nombre de su futura suite de pruebas unitarias C++ (`Tests/<Dominio>Test.cpp`).
4. **Aritmética Segura y Tipos Claros:**
   - Evita coma flotante (`float`/`double`) en cálculos monetarios, fechas o porcentajes donde el dominio exija exactitud entera; usa `int`, `int64`, fechas compactas o timestamps consistentes con los DTOs.

# Estructura del Documento de Salida:

**IMPORTANTE: ENTREGA PRIMERO `IndiceAlgoritmos.md` Y LUEGO UN BLOQUE `.def` POR CADA PROCESADOR IDENTIFICADO, LISTOS PARA COPIAR Y PEGAR.**

1. **`### IndiceAlgoritmos.md`**: tabla maestra con columnas `Código ALG | Módulo | Nombre del Algoritmo | Procesador Responsable | Procesos/CU Cubiertos | Suite de Pruebas C++ | Estado`, más la lista de secciones estándar que deberá cumplir cada documento `ALG-*`.
2. **`### I<Nombre>Processor.def`** (uno por cada procesador):

```yaml
# I<Nombre>Processor.def - <AAAA-MM-DD>
# Proyecto <NombreProyecto>
# Contrato Canónico de Procesador Puro (<Dominio>)

componente:
  nombre: I<Nombre>Processor
  tipo: interfaz_procesador
  proposito: "<Responsabilidad algorítmica pura en memoria, stateless y determinista>"
  ubicacion_esperada_codigo: "Source/Core/Dependencies/Processors/I<Nombre>Processor.hpp"
  especificacion_algoritmica: ".specify/Algoritmos/ALG-M<X>-<Y>_<NombreDescriptivo>.md"

dependencias:
  dtos:
    - <Nombre>Dto
    - <Nombre>CommandDto

metodos:
  - <nombreMetodo>(<param1>: <tipo>, ...): <tipoRetorno> # <Breve descripción del cómputo puro>
```
