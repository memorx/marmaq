# MARMAQ Servicios

Sistema de gestión de órdenes de servicio técnico para equipos industriales.

## Descripción

MARMAQ Servicios es una aplicación web progresiva (PWA) diseñada para gestionar el flujo completo de órdenes de servicio técnico, desde la recepción del equipo hasta su entrega al cliente. El sistema soporta diferentes tipos de servicio: Garantía, Centro de Servicio, Por Cobrar y REPARE.

## Tecnologías

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Autenticación**: NextAuth.js v5
- **Almacenamiento**: Supabase Storage
- **PWA**: next-pwa con Workbox
- **Testing**: Vitest + React Testing Library
- **Charts**: Recharts

## Requisitos Previos

- Node.js 18+
- PostgreSQL (o cuenta de Supabase)
- npm o pnpm

## Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd marmaq-servicios

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar migraciones
npx prisma migrate dev

# Generar iconos PWA (requiere sharp)
npm install sharp --save-dev
node scripts/generate-icons.js

# Iniciar servidor de desarrollo
npm run dev
```

## Variables de Entorno

```env
# Base de datos
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Auth
AUTH_SECRET="tu-secreto-seguro"
AUTH_URL="http://localhost:3000"
```

## Estructura del Proyecto

```
src/
├── app/                    # App Router (páginas y API routes)
│   ├── (dashboard)/        # Páginas protegidas del dashboard
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── ordenes/        # Gestión de órdenes
│   │   ├── clientes/       # Gestión de clientes
│   │   ├── materiales/     # Inventario de materiales
│   │   ├── usuarios/       # Gestión de usuarios
│   │   ├── reportes/       # Reportes y métricas
│   │   └── configuracion/  # Configuración del sistema
│   ├── api/                # API Routes
│   ├── login/              # Página de login
│   └── offline/            # Página offline (PWA)
├── components/             # Componentes React
│   ├── ui/                 # Componentes UI base
│   ├── layout/             # Layout components
│   ├── dashboard/          # Componentes del dashboard
│   ├── ordenes/            # Componentes de órdenes
│   ├── pwa/                # Componentes PWA
│   └── reportes/           # Componentes de reportes
├── lib/                    # Utilidades y configuración
│   ├── auth/               # Configuración de autenticación
│   ├── db/                 # Cliente Prisma
│   ├── supabase/           # Cliente Supabase
│   ├── whatsapp/           # Templates de WhatsApp
│   └── offline/            # Cola offline (IndexedDB)
├── hooks/                  # Custom hooks
├── types/                  # Definiciones de tipos
└── __tests__/              # Tests unitarios
```

## Roles de Usuario

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **SUPER_ADMIN** | Administrador del sistema | Acceso total, gestión de usuarios, configuración |
| **COORD_SERVICIO** | Coordinador de servicio | Gestión de órdenes, reportes, ver configuración |
| **REFACCIONES** | Encargado de refacciones | Gestión de materiales, ver órdenes |
| **TECNICO** | Técnico de servicio | Ver y actualizar sus órdenes asignadas |

## Funcionalidades Principales

### Gestión de Órdenes
- Crear, editar y seguir órdenes de servicio
- Sistema de semáforo para priorización visual
- Timeline de estados con historial completo
- Asignación de técnicos
- Cotizaciones para servicio Por Cobrar

### Evidencias Fotográficas
- Subida de fotos por tipo (Recepción, Diagnóstico, Reparación, Entrega)
- Almacenamiento en Supabase Storage
- Galería con preview

### Firma Digital del Cliente
- Canvas táctil para firma
- Captura automática al entregar
- Integración en PDF de hoja de servicio

### Notificaciones WhatsApp
- Plantillas personalizables por tipo de notificación
- Variables dinámicas ({nombre}, {folio}, {marca}, etc.)
- Generación de links wa.me para envío manual

### Reportes y Métricas
- Dashboard con KPIs en tiempo real
- Gráficas de estado de órdenes
- Reporte de tiempos de servicio
- Productividad por técnico
- Exportación de datos

### PWA (Progressive Web App)
- Instalable en dispositivos móviles
- Funcionamiento offline
- Cola de sincronización para operaciones pendientes
- Cache de páginas y assets
- Notificaciones de estado de conexión

## API Endpoints

### Órdenes
- `GET /api/ordenes` - Listar órdenes con filtros
- `POST /api/ordenes` - Crear nueva orden
- `GET /api/ordenes/[id]` - Obtener detalle de orden
- `PATCH /api/ordenes/[id]` - Actualizar orden
- `DELETE /api/ordenes/[id]` - Eliminar orden

### Evidencias
- `GET /api/ordenes/[id]/evidencias` - Listar evidencias
- `POST /api/ordenes/[id]/evidencias` - Subir evidencias
- `DELETE /api/ordenes/[id]/evidencias` - Eliminar evidencia

### Firma
- `GET /api/ordenes/[id]/firma` - Obtener info de firma
- `POST /api/ordenes/[id]/firma` - Guardar firma
- `DELETE /api/ordenes/[id]/firma` - Eliminar firma (admin)

### PDF
- `GET /api/ordenes/[id]/pdf` - Generar hoja de servicio

### WhatsApp
- `GET /api/notificaciones/whatsapp` - Listar notificaciones
- `POST /api/notificaciones/whatsapp` - Crear notificación

### Otros
- `GET /api/clientes` - Listar clientes
- `GET /api/materiales` - Listar materiales
- `GET /api/usuarios` - Listar usuarios
- `GET /api/dashboard/stats` - Estadísticas del dashboard
- `GET /api/reportes/avanzados` - Reportes con métricas

## Scripts

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar producción
npm start

# Tests
npm test

# Linting
npm run lint

# Generar cliente Prisma
npx prisma generate

# Migraciones
npx prisma migrate dev --name <nombre>

# Generar iconos PWA
node scripts/generate-icons.js
```

## Configuración PWA

El proyecto incluye soporte completo para PWA:

1. **Manifest** (`public/manifest.json`): Metadatos de la aplicación
2. **Service Worker**: Generado automáticamente por next-pwa
3. **Iconos**: Generar con `node scripts/generate-icons.js`
4. **Offline**: Cola de operaciones en IndexedDB

### Estrategias de Cache

- **Network First**: Páginas y API
- **Cache First**: Imágenes, fuentes, Supabase Storage
- **Stale While Revalidate**: JS/CSS

## Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con coverage
npm test -- --coverage

# Ejecutar tests en modo watch
npm test -- --watch
```

Tests cubren:
- API endpoints (órdenes, WhatsApp, firma, reportes)
- Utilidades (templates, formateo)
- Componentes UI

## Deployment

### Vercel (Recomendado)
```bash
vercel --prod
```

### Docker
```dockerfile
# Ver Dockerfile si está disponible
docker build -t marmaq-servicios .
docker run -p 3000:3000 marmaq-servicios
```

### Variables de entorno en producción
- Configurar todas las variables de `.env.example`
- Asegurar que `AUTH_URL` apunte al dominio de producción
- Configurar bucket de Supabase como público para evidencias y firmas

## Supabase Setup

### Buckets de Storage
1. Crear bucket `evidencias` (público)
2. Crear bucket `firmas` (público)

### Políticas RLS
Configurar políticas de seguridad según necesidades del proyecto.

## Contribución

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

Proyecto privado - MARMAQ

---

Desarrollado con Next.js 15, React 18, y TypeScript.
