# Guía de Usuario: Coordinador de Servicio

## Bienvenido al Sistema MARMAQ Servicios

Como **Coordinador de Servicio**, eres responsable de gestionar el flujo de órdenes de servicio, asignar técnicos, y dar seguimiento a las reparaciones. Esta guía te ayudará a realizar tu trabajo de forma eficiente.

---

## Acceso al Sistema

1. Ingresa a la aplicación desde tu navegador o abre la app instalada
2. Introduce tu correo electrónico y contraseña
3. Haz clic en "Iniciar Sesión"

> **Tip:** Instala la aplicación haciendo clic en "Instalar App" para tener acceso rápido desde tu dispositivo.

---

## Tu Menú

Como Coordinador de Servicio tienes acceso a:

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Vista general con estadísticas |
| **Órdenes** | Gestión de todas las órdenes |
| **Clientes** | Administración de clientes |
| **Materiales** | Consulta de inventario |
| **Reportes** | Métricas y análisis |

> **Nota:** No tienes acceso a Usuarios ni Configuración. Contacta al Super Admin si necesitas cambios en esas áreas.

---

## Dashboard - Tu Centro de Control

El dashboard te muestra el estado actual de la operación:

### Indicadores Clave
- **Órdenes Activas**: Cuántas órdenes están en proceso
- **Pendientes Hoy**: Órdenes que deben entregarse hoy
- **En Reparación**: Trabajo actual de los técnicos
- **Listas para Entrega**: Equipos esperando al cliente

### Sistema de Semáforo
Identifica rápidamente las órdenes que requieren atención:
- 🟢 **Verde**: En tiempo, sin problemas
- 🟡 **Amarillo**: Próximas a vencer, revisa prioridad
- 🔴 **Rojo**: Atrasadas, requieren acción inmediata

### Gráficas
- Distribución por estado
- Carga de trabajo por técnico
- Tendencia de órdenes

---

## Gestión de Órdenes

### Tu Flujo de Trabajo Diario

```
1. Revisar órdenes nuevas (RECIBIDO)
2. Asignar técnicos
3. Dar seguimiento a órdenes en proceso
4. Verificar órdenes completadas
5. Coordinar entregas
6. Notificar a clientes
```

### Crear Nueva Orden

1. Ve a **Órdenes** → **Nueva Orden**
2. Selecciona o crea el cliente
3. Elige el tipo de servicio:

| Tipo | Cuándo Usarlo |
|------|---------------|
| **Garantía** | Cliente trae factura válida y el equipo está en garantía |
| **Centro Servicio** | El cliente es otro distribuidor autorizado |
| **Por Cobrar** | Cliente pagará la reparación |
| **REPARE** | Orden de refrigeración del call center |

4. Ingresa datos del equipo:
   - Marca (Torrey, Imbera, Ojeda, Migsa, etc.)
   - Modelo
   - Número de serie

5. Registra la falla reportada por el cliente
6. Marca los accesorios que trae el equipo
7. Evalúa la condición general (Buena/Regular/Mala)
8. Guarda la orden

### Asignar Técnico

1. Abre la orden
2. Busca la sección "Técnico Asignado"
3. Selecciona el técnico de la lista
4. El técnico podrá ver la orden en su lista

> **Tip:** Considera la carga de trabajo actual de cada técnico antes de asignar.

### Flujo de Estados

```
RECIBIDO
    ↓
EN DIAGNÓSTICO (técnico revisa el equipo)
    ↓
ESPERA REFACCIONES (si se necesitan piezas)
    ↓
EN REPARACIÓN (técnico trabaja en el equipo)
    ↓
REPARADO (trabajo terminado)
    ↓
LISTO ENTREGA (equipo empacado y listo)
    ↓
ENTREGADO (cliente recogió)
```

**Para órdenes Por Cobrar:**
```
EN DIAGNÓSTICO
    ↓
COTIZACIÓN PENDIENTE → Cliente aprueba/rechaza
    ↓
EN REPARACIÓN (si aprueba)
```

### Cambiar Estado de una Orden

1. Abre la orden
2. En la barra de estados, haz clic en el siguiente estado
3. Agrega una nota si es necesario (ej: "Cliente solicitó cotización detallada")
4. El cambio queda registrado en el historial

### Agregar Notas

Para comunicarte con el técnico o dejar observaciones:
1. Abre la orden
2. Ve a la sección "Notas"
3. Escribe tu nota
4. Guarda

Las notas son visibles para todos los usuarios con acceso a la orden.

---

## Evidencias Fotográficas

Las fotos son fundamentales para documentar el trabajo:

### Tipos de Evidencia

| Tipo | Cuándo Tomarla |
|------|----------------|
| **Recepción** | Al recibir el equipo del cliente |
| **Diagnóstico** | Al identificar la falla |
| **Reparación** | Durante y después de reparar |
| **Entrega** | Antes de entregar al cliente |
| **Factura** | Para órdenes de garantía |

### Subir Fotos

1. En la vista de orden, ve a "Evidencias"
2. Haz clic en "Agregar Fotos"
3. Selecciona el tipo de evidencia
4. Toma la foto o selecciona del carrete
5. Las fotos se suben automáticamente

### Ver Galería

- Todas las fotos de una orden aparecen organizadas por tipo
- Haz clic en una foto para verla en tamaño completo

---

## Comunicación con Clientes

### Notificaciones WhatsApp

Mantén al cliente informado enviando notificaciones automáticas:

1. Abre la orden
2. Haz clic en "Notificar Cliente"
3. Elige el tipo de mensaje:
   - **Recibido**: "Hemos recibido tu equipo..."
   - **En Reparación**: "Tu equipo está siendo reparado..."
   - **Cotización**: "Te enviamos la cotización..."
   - **Listo Entrega**: "Tu equipo está listo..."
   - **Entregado**: "Gracias por tu preferencia..."

4. Se abrirá WhatsApp con el mensaje prellenado
5. Revisa y envía

> **Nota:** Los mensajes usan plantillas predefinidas. Si necesitas cambiarlas, contacta al Super Admin.

### Información de Contacto

- El teléfono del cliente aparece en la orden
- Haz clic en el número para llamar directamente (en móvil)

---

## Entrega de Equipos

### Proceso de Entrega

1. Verifica que la orden esté en "LISTO ENTREGA"
2. Confirma la identidad del cliente
3. Muestra el equipo funcionando
4. Solicita la firma digital:
   - Haz clic en "Capturar Firma"
   - El cliente firma en la pantalla
   - Confirma la firma
5. Cambia el estado a "ENTREGADO"
6. Genera el PDF de la hoja de servicio si lo solicita

### Generar Hoja de Servicio (PDF)

1. Abre la orden
2. Haz clic en "Descargar PDF"
3. El documento incluye:
   - Datos del cliente
   - Información del equipo
   - Trabajo realizado
   - Materiales usados
   - Firma del cliente

---

## Clientes

### Buscar Cliente

- Usa la barra de búsqueda
- Busca por nombre, teléfono o empresa
- Los resultados aparecen en tiempo real

### Crear Nuevo Cliente

1. Ve a **Clientes** → **Nuevo**
2. Datos obligatorios:
   - Nombre completo
   - Teléfono
3. Datos opcionales:
   - Email
   - Empresa
   - Dirección
   - Notas

### Clientes Distribuidores

Para clientes que son distribuidores (Centro Servicio):
1. Marca la casilla "Es Distribuidor"
2. Ingresa el código de distribuidor
3. Esto afecta las opciones de tipo de servicio

---

## Materiales

Puedes consultar el inventario de materiales:

### Ver Inventario
- Ve a **Materiales**
- Busca por nombre o SKU
- Verifica stock disponible

### Stock Bajo
Los materiales con stock menor al mínimo aparecen resaltados en rojo. Notifica al encargado de refacciones.

> **Nota:** No puedes modificar el inventario. Eso le corresponde al rol de Refacciones.

---

## Reportes

### Vista General
Ve a **Reportes** para ver:
- Total de órdenes por estado
- Órdenes por tipo de servicio
- Tiempo promedio de reparación

### Reportes Avanzados
1. Ve a **Reportes** → **Avanzados**
2. Filtra por:
   - Fechas
   - Tipo de servicio
   - Técnico
   - Estado
3. Analiza:
   - Productividad por técnico
   - Tiempos de reparación
   - Tendencias

### Exportar Datos
- Haz clic en "Exportar a Excel"
- Descarga el reporte filtrado

---

## Modo Offline

La aplicación funciona sin internet:

### Funciona Offline:
- Ver órdenes cargadas
- Crear nuevas órdenes
- Tomar fotos

### Indicadores:
- **Barra amarilla**: Sin conexión
- **Barra verde**: Conexión restaurada, sincronizando

### Sincronización:
Los cambios se guardan localmente y se envían cuando regrese la conexión.

---

## Tips para tu Día a Día

### Por la Mañana
1. Revisa el dashboard
2. Identifica órdenes atrasadas (rojas)
3. Verifica entregas del día
4. Asigna técnicos a nuevas órdenes

### Durante el Día
1. Da seguimiento a órdenes en proceso
2. Notifica a clientes de avances
3. Atiende solicitudes de cotización

### Al Cerrar
1. Verifica que todas las entregas estén registradas
2. Revisa órdenes que cambiaron de estado
3. Identifica pendientes para mañana

---

## Problemas Comunes

### "No puedo ver una orden"
- Verifica que la orden exista
- Recarga la página
- Revisa tu conexión a internet

### "El cliente no recibe WhatsApp"
- Verifica que el número esté correcto
- Asegúrate de incluir el código de país
- Confirma que el cliente tenga WhatsApp

### "No puedo cambiar el estado"
- Algunos estados requieren pasos previos
- Verifica que la información esté completa
- Contacta al Super Admin si persiste

---

## Contacto

Para soporte técnico o cambios en el sistema, contacta al Super Administrador.

---

*MARMAQ Servicios - Sistema de Gestión de Órdenes de Servicio*
