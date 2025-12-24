# Guía de Usuario: Super Administrador

## Bienvenido al Sistema MARMAQ Servicios

Como **Super Administrador**, tienes acceso completo a todas las funciones del sistema. Esta guía te ayudará a aprovechar al máximo cada herramienta disponible.

---

## Acceso al Sistema

1. Ingresa a la aplicación desde tu navegador o abre la app instalada
2. Introduce tu correo electrónico y contraseña
3. Haz clic en "Iniciar Sesión"

> **Tip:** Puedes instalar la aplicación en tu dispositivo haciendo clic en "Instalar App" que aparece en la parte superior.

---

## Menú Principal

Como Super Admin, tienes acceso a todas las secciones:

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Vista general con estadísticas en tiempo real |
| **Órdenes** | Gestión completa de órdenes de servicio |
| **Clientes** | Administración de clientes |
| **Materiales** | Control de inventario de refacciones |
| **Reportes** | Métricas y reportes avanzados |
| **Usuarios** | Gestión de usuarios del sistema |
| **Configuración** | Ajustes del sistema y plantillas |

---

## Dashboard

El dashboard muestra un resumen en tiempo real de la operación:

### Métricas Principales
- **Órdenes Activas**: Total de órdenes en proceso
- **Pendientes Hoy**: Órdenes con fecha promesa para hoy
- **En Reparación**: Órdenes actualmente siendo reparadas
- **Listas para Entrega**: Órdenes completadas esperando al cliente

### Gráficas
- Distribución de órdenes por estado
- Órdenes por tipo de servicio
- Tendencia semanal/mensual

### Sistema de Semáforo
Las órdenes se colorean según su urgencia:
- 🟢 **Verde**: En tiempo
- 🟡 **Amarillo**: Próximas a vencer
- 🔴 **Rojo**: Atrasadas

---

## Gestión de Órdenes

### Crear Nueva Orden

1. Ve a **Órdenes** → **Nueva Orden**
2. Completa los datos:
   - **Cliente**: Busca o crea un cliente nuevo
   - **Tipo de Servicio**: Garantía, Centro Servicio, Por Cobrar, o REPARE
   - **Equipo**: Marca, modelo, serie
   - **Falla Reportada**: Descripción del problema
   - **Accesorios**: Checklista de lo que trae el equipo
3. Haz clic en "Guardar"
4. Se generará un folio automático (ej: OS-2024-0001)

### Tipos de Servicio

| Tipo | Descripción | Requiere |
|------|-------------|----------|
| **Garantía** | Cubierto por fábrica | Factura, fecha de compra |
| **Centro Servicio** | Para otros distribuidores | Código de distribuidor |
| **Por Cobrar** | Cliente paga reparación | Cotización aprobada |
| **REPARE** | Refrigeración vía call center | Número REPARE |

### Ver y Editar Órdenes

1. En la lista de órdenes, haz clic en cualquier orden
2. Puedes ver:
   - Información completa del equipo
   - Timeline de estados
   - Evidencias fotográficas
   - Materiales usados
   - Historial de cambios

### Cambiar Estado

1. Abre la orden
2. Haz clic en el botón del estado deseado
3. Opcionalmente agrega una nota
4. El cambio se registra automáticamente en el historial

**Flujo de Estados:**
```
RECIBIDO → EN DIAGNÓSTICO → ESPERA REFACCIONES → EN REPARACIÓN → REPARADO → LISTO ENTREGA → ENTREGADO
                                    ↓
                          COTIZACIÓN PENDIENTE (solo Por Cobrar)
```

### Subir Evidencias

1. En la vista de orden, ve a la sección "Evidencias"
2. Haz clic en "Agregar Fotos"
3. Selecciona el tipo:
   - Recepción
   - Diagnóstico
   - Reparación
   - Entrega
4. Toma o selecciona las fotos
5. Las fotos se guardan automáticamente

### Firma del Cliente

Al entregar un equipo:
1. Cambia el estado a "ENTREGADO"
2. Aparecerá el canvas de firma
3. El cliente firma en la pantalla
4. La firma se guarda junto con la fecha/hora

### Enviar Notificaciones WhatsApp

1. En la vista de orden, haz clic en "Notificar Cliente"
2. Selecciona el tipo de notificación:
   - Equipo Recibido
   - En Reparación
   - Cotización
   - Listo para Entrega
   - Entregado
3. Se generará un mensaje usando la plantilla configurada
4. Haz clic en el link para abrir WhatsApp con el mensaje listo

### Generar PDF

1. En la vista de orden, haz clic en "Descargar PDF"
2. Se genera la hoja de servicio con:
   - Datos del cliente y equipo
   - Diagnóstico y notas
   - Firma del cliente (si ya firmó)
   - Materiales usados

---

## Gestión de Clientes

### Crear Cliente

1. Ve a **Clientes** → **Nuevo Cliente**
2. Completa:
   - Nombre completo
   - Teléfono (obligatorio para WhatsApp)
   - Email (opcional)
   - Empresa (opcional)
   - Dirección
3. Si es distribuidor, marca la casilla y agrega el código

### Buscar Clientes

- Usa la barra de búsqueda para encontrar por nombre, teléfono o empresa
- Los resultados se filtran en tiempo real

---

## Gestión de Materiales

### Agregar Material

1. Ve a **Materiales** → **Nuevo Material**
2. Completa:
   - SKU (código único)
   - Nombre
   - Categoría (Refacciones, Consumibles, Herramientas)
   - Stock actual y mínimo
   - Precios de compra y venta

### Control de Stock

- Los materiales con stock bajo se resaltan en rojo
- Al usar material en una orden, el stock se descuenta automáticamente

---

## Reportes

### Dashboard de Métricas

Ve a **Reportes** para ver:
- Órdenes por estado
- Promedio de tiempo de reparación
- Órdenes por técnico
- Tendencias mensuales

### Reportes Avanzados

1. Ve a **Reportes** → **Avanzados**
2. Filtra por:
   - Rango de fechas
   - Tipo de servicio
   - Técnico
   - Estado
3. Visualiza gráficas detalladas
4. Exporta a Excel si lo necesitas

---

## Gestión de Usuarios

### Crear Usuario

1. Ve a **Usuarios** → **Nuevo Usuario**
2. Completa:
   - Nombre completo
   - Email (será su usuario de acceso)
   - Contraseña temporal
   - Rol
3. Comparte las credenciales con el nuevo usuario

### Roles Disponibles

| Rol | Acceso |
|-----|--------|
| **Super Admin** | Todo el sistema |
| **Coord. Servicio** | Órdenes, clientes, reportes (sin usuarios/config) |
| **Refacciones** | Materiales, ver órdenes |
| **Técnico** | Solo sus órdenes asignadas |

### Desactivar Usuario

1. Busca el usuario en la lista
2. Haz clic en "Editar"
3. Desmarca "Activo"
4. El usuario ya no podrá iniciar sesión

---

## Configuración

### Plantillas de WhatsApp

1. Ve a **Configuración** → **Plantillas WhatsApp**
2. Edita cada plantilla según necesites
3. Variables disponibles:
   - `{nombre}` - Nombre del cliente
   - `{folio}` - Número de folio
   - `{marca}` - Marca del equipo
   - `{modelo}` - Modelo del equipo
   - `{fechaPromesa}` - Fecha de entrega prometida

### Ajustes Generales

- Nombre de la empresa
- Dirección
- Teléfono de contacto
- Logo (para PDFs)

---

## Modo Offline

La aplicación funciona sin conexión a internet:

### Qué puedes hacer offline:
- Ver órdenes cargadas previamente
- Crear nuevas órdenes (se sincronizarán después)
- Tomar fotos de evidencia (se subirán después)

### Indicadores:
- **Banner amarillo**: "Sin conexión - Los cambios se guardarán localmente"
- **Banner verde**: "Conexión restaurada - Sincronizando..."

### Sincronización:
Cuando vuelvas a tener conexión, los cambios pendientes se enviarán automáticamente.

---

## Atajos y Tips

1. **Búsqueda rápida**: Usa la barra de búsqueda global para encontrar órdenes por folio
2. **Filtros**: En la lista de órdenes, usa los filtros para ver solo ciertos estados
3. **Instalación**: Instala la app para acceso rápido desde el escritorio o pantalla de inicio
4. **Actualización**: La app se actualiza automáticamente, no necesitas hacer nada

---

## Soporte

Si tienes problemas con el sistema:
1. Verifica tu conexión a internet
2. Intenta recargar la página
3. Si el problema persiste, contacta al administrador del sistema

---

*MARMAQ Servicios - Sistema de Gestión de Órdenes de Servicio*
