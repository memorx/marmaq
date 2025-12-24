# Guía de Usuario: Encargado de Refacciones

## Bienvenido al Sistema MARMAQ Servicios

Como **Encargado de Refacciones**, tu responsabilidad principal es gestionar el inventario de materiales y asegurar que los técnicos tengan las piezas necesarias para las reparaciones. Esta guía te ayudará a mantener el control del inventario.

---

## Acceso al Sistema

1. Ingresa a la aplicación desde tu navegador o abre la app instalada
2. Introduce tu correo electrónico y contraseña
3. Haz clic en "Iniciar Sesión"

> **Tip:** Instala la aplicación haciendo clic en "Instalar App" para acceso rápido.

---

## Tu Menú

Como Encargado de Refacciones tienes acceso a:

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Vista general del sistema |
| **Órdenes** | Consulta de órdenes (solo lectura) |
| **Clientes** | Consulta de clientes |
| **Materiales** | Gestión completa del inventario |
| **Reportes** | Reportes de uso de materiales |

> **Nota:** No tienes acceso a Usuarios ni Configuración.

---

## Dashboard

El dashboard te muestra información general:

### Lo que te Interesa
- **Órdenes en Espera de Refacciones**: Equipos que necesitan piezas
- **Materiales con Stock Bajo**: Alertas de reabastecimiento

Usa esta información para priorizar tu trabajo.

---

## Gestión de Materiales

Esta es tu sección principal de trabajo.

### Ver Inventario

1. Ve a **Materiales**
2. Verás la lista de todos los materiales con:
   - SKU (código)
   - Nombre
   - Categoría
   - Stock actual
   - Stock mínimo
   - Estado (normal/bajo)

### Buscar Material

- Usa la barra de búsqueda
- Busca por SKU, nombre o categoría
- Los resultados se filtran en tiempo real

### Filtrar por Categoría

Haz clic en los filtros para ver:
- **Refacciones**: Piezas de repuesto
- **Consumibles**: Materiales de uso único
- **Herramientas**: Equipo de trabajo

### Indicadores de Stock

| Indicador | Significado |
|-----------|-------------|
| 🟢 **Verde** | Stock suficiente |
| 🟡 **Amarillo** | Stock bajo (menor al mínimo) |
| 🔴 **Rojo** | Sin stock |

---

## Agregar Nuevo Material

1. Ve a **Materiales** → **Nuevo Material**
2. Completa la información:

### Datos Obligatorios
- **SKU**: Código único del material (ej: "REF-TOR-001")
- **Nombre**: Nombre descriptivo
- **Categoría**: Refacciones, Consumibles, o Herramientas

### Datos de Inventario
- **Stock Actual**: Cantidad disponible
- **Stock Mínimo**: Nivel de alerta (cuando el stock baje de este número, aparecerá la alerta)

### Datos de Precio
- **Precio de Compra**: Lo que cuesta adquirirlo
- **Precio de Venta**: Precio al público (para órdenes Por Cobrar)

3. Haz clic en "Guardar"

---

## Editar Material

1. En la lista de materiales, haz clic en el material
2. Haz clic en "Editar"
3. Modifica los campos necesarios
4. Guarda los cambios

### Campos que Puedes Modificar
- Nombre y descripción
- Categoría
- Stock actual (entradas y salidas)
- Stock mínimo
- Precios
- Estado (activo/inactivo)

---

## Control de Stock

### Entrada de Materiales

Cuando recibas mercancía:

1. Ve al material
2. Haz clic en "Editar"
3. Suma la cantidad recibida al stock actual
4. Guarda

> **Tip:** Mantén un registro de las entradas para control interno.

### Salida de Materiales

Cuando un técnico usa material en una reparación:

1. El técnico o coordinador registra el material usado en la orden
2. El sistema descuenta automáticamente del inventario
3. Puedes ver el historial de uso en la orden

### Ajuste de Inventario

Si necesitas corregir el stock (por conteo físico):

1. Ve al material
2. Edita el stock actual
3. En las notas, indica el motivo del ajuste

---

## Materiales con Stock Bajo

### Identificar Faltantes

1. Ve a **Materiales**
2. Los materiales con stock bajo aparecen resaltados
3. También puedes filtrar por "Stock Bajo"

### Lista de Reabastecimiento

1. Revisa todos los materiales con stock bajo
2. Genera tu lista de compras
3. Actualiza el stock cuando recibas la mercancía

---

## Ver Órdenes

Puedes consultar las órdenes para saber qué materiales se necesitan:

### Órdenes en Espera de Refacciones

1. Ve a **Órdenes**
2. Filtra por estado "ESPERA_REFACCIONES"
3. Revisa qué piezas se necesitan

### Ver Materiales Usados en una Orden

1. Abre la orden
2. Ve a la sección "Materiales Usados"
3. Verás la lista de piezas utilizadas

> **Nota:** Solo puedes ver las órdenes, no editarlas. Para cambios, contacta al Coordinador de Servicio.

---

## Reportes de Materiales

### Ver Uso de Materiales

1. Ve a **Reportes**
2. Consulta:
   - Materiales más usados
   - Consumo por período
   - Tendencias de uso

### Exportar Datos

Puedes exportar la información a Excel para:
- Reportes de inventario
- Análisis de rotación
- Planificación de compras

---

## Categorías de Materiales

### Refacciones
Piezas de repuesto para equipos:
- Platos para básculas
- Celdas de carga
- Displays
- Motores
- Compresores
- Termostatos

### Consumibles
Materiales de uso único:
- Gas refrigerante
- Soldadura
- Cinta aislante
- Tornillería
- Cables
- Conectores

### Herramientas
Equipo de trabajo (no se consume):
- Multímetros
- Cautínes
- Pinzas
- Desarmadores
- Equipo de refrigeración

---

## Buenas Prácticas

### Mantén el Inventario Actualizado
- Registra entradas inmediatamente
- Verifica que las salidas se registren en las órdenes
- Haz conteos físicos periódicos

### Define Buenos Niveles de Stock Mínimo
- Considera el tiempo de reposición
- Analiza la frecuencia de uso
- Ajusta según la temporada

### Organización de SKU
Usa un sistema consistente:
```
REF-TOR-001  = Refacción para Torrey, número 001
CON-GEN-015  = Consumible genérico, número 015
HER-ELE-003  = Herramienta eléctrica, número 003
```

---

## Modo Offline

La aplicación funciona sin internet:

### Funciona Offline:
- Ver inventario cargado
- Consultar órdenes

### No Funciona Offline:
- Agregar nuevos materiales
- Actualizar stock

### Indicadores:
- **Barra amarilla**: Sin conexión
- **Barra verde**: Conexión restaurada

---

## Tu Rutina Diaria

### Por la Mañana
1. Revisa alertas de stock bajo
2. Verifica órdenes en espera de refacciones
3. Prepara materiales para las reparaciones del día

### Durante el Día
1. Atiende solicitudes de técnicos
2. Registra entradas y salidas
3. Actualiza pedidos pendientes

### Al Cerrar
1. Verifica que el stock esté actualizado
2. Prepara lista de materiales a pedir
3. Revisa materiales para mañana

---

## Problemas Comunes

### "El stock no coincide con el físico"
1. Haz un conteo físico
2. Verifica órdenes recientes
3. Ajusta el stock en el sistema
4. Investiga la diferencia

### "No encuentro un material"
1. Busca por diferentes términos (SKU, nombre)
2. Verifica que esté activo
3. Si no existe, créalo

### "El técnico usó material no registrado"
1. Pide al técnico que registre el uso en la orden
2. El sistema descontará automáticamente
3. Si ya lo registró, verifica el historial

---

## Contacto

Para soporte técnico o cambios en el sistema, contacta al Super Administrador.

---

*MARMAQ Servicios - Sistema de Gestión de Órdenes de Servicio*
