# FinanTrack API

> Backend REST API para gestión de finanzas personales — construido con **NestJS**, **TypeORM** y **PostgreSQL (Supabase)**.

## Stack Tecnológico

| Tecnología | Uso |
|---|---|
| NestJS + TypeScript | Framework principal |
| PostgreSQL (Supabase) | Base de datos |
| TypeORM | ORM + migraciones |
| JWT + bcrypt | Autenticación |
| class-validator | Validaciones |
| Swagger | Documentación |

## Requisitos Previos

- Node.js >= 18
- npm >= 9
- Cuenta en [Supabase](https://supabase.com) (gratuita)

---

## 1. Configurar Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com) y crea un nuevo proyecto.
2. Cuando el proyecto esté listo, ve a **Project Settings → Database**.
3. Copia los siguientes datos:
   - **Host**: `db.<tu-ref>.supabase.co`
   - **Port**: `5432`
   - **Database name**: `postgres`
   - **User**: `postgres`
   - **Password**: la contraseña que elegiste al crear el proyecto

---

## 2. Instalación

```bash
# Clonar o navegar al directorio del proyecto
cd finantrack

# Instalar dependencias
npm install
```

---

## 3. Variables de Entorno

Copia el archivo de ejemplo y complétalo con tus credenciales de Supabase:

```bash
cp .env.example .env
```

Edita `.env`:

```env
# Application
PORT=3000
NODE_ENV=development

# Database (Supabase PostgreSQL)
DB_HOST=db.xxxxxxxxxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_contraseña_supabase
DB_NAME=postgres
DB_SSL=true

# JWT
JWT_SECRET=una_clave_secreta_muy_larga_y_aleatoria
JWT_EXPIRATION=7d
```

> **⚠️ Importante:** Nunca subas tu `.env` al control de versiones. Ya está incluido en `.gitignore`.

---

## 4. Migraciones / Sincronización de Base de Datos

El proyecto usa **TypeORM con `synchronize: true` en desarrollo**, lo que significa que las tablas se crean automáticamente al levantar la app por primera vez.

### En desarrollo (recomendado para inicio rápido)

Con `NODE_ENV=development`, la sincronización automática está activada. Al correr la aplicación por primera vez, TypeORM creará las siguientes tablas en tu base de datos Supabase:

- `users`
- `accounts`
- `categories`
- `transactions`

### En producción (migraciones manuales)

Para producción, desactiva `synchronize` y usa migraciones:

```bash
# Generar una migración
npx typeorm migration:generate src/migrations/InitialMigration -d src/data-source.ts

# Ejecutar migraciones
npx typeorm migration:run -d src/data-source.ts
```

> **Nota:** En producción, establece `NODE_ENV=production` en tu `.env`. El `synchronize` se desactivará automáticamente.

---

## 5. Levantar el Proyecto

```bash
# Modo desarrollo (con hot-reload)
npm run start:dev

# Modo producción
npm run build
npm run start:prod
```

La API estará disponible en: `http://localhost:3000`

---

## 6. Documentación Swagger

Una vez levantada la aplicación, accede a la documentación interactiva:

```
http://localhost:3000/api/docs
```

Desde Swagger puedes:
- Registrarte e iniciar sesión
- Obtener el JWT token
- Probar todos los endpoints autenticados

---

## Endpoints

### Auth
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/auth/register` | Registrar nuevo usuario |
| POST | `/auth/login` | Iniciar sesión, obtener JWT |

### Accounts
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/accounts` | Listar cuentas del usuario |
| POST | `/accounts` | Crear cuenta |
| GET | `/accounts/:id` | Obtener cuenta |
| GET | `/accounts/:id/balance` | Obtener saldo calculado |
| PUT | `/accounts/:id` | Actualizar cuenta |
| DELETE | `/accounts/:id` | Eliminar cuenta |

### Categories
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/categories` | Listar categorías |
| POST | `/categories` | Crear categoría |
| GET | `/categories/:id` | Obtener categoría |
| PUT | `/categories/:id` | Actualizar categoría |
| DELETE | `/categories/:id` | Eliminar categoría |

### Transactions
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/transactions` | Listar transacciones (con filtros) |
| POST | `/transactions` | Crear transacción |
| GET | `/transactions/:id` | Obtener transacción |
| PUT | `/transactions/:id` | Actualizar transacción |
| DELETE | `/transactions/:id` | Eliminar transacción |

**Filtros disponibles para GET `/transactions`:**
- `accountId` — Filtrar por cuenta
- `categoryId` — Filtrar por categoría
- `type` — `INCOME` | `EXPENSE` | `TRANSFER`
- `startDate` — Fecha inicio (`YYYY-MM-DD`)
- `endDate` — Fecha fin (`YYYY-MM-DD`)

### Dashboard
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/dashboard` | Resumen financiero del mes actual |

**Respuesta del dashboard:**
```json
{
  "totalBalance": 5200.00,
  "monthlyIncome": 3000.00,
  "monthlyExpenses": 1200.00,
  "netMonthly": 1800.00,
  "accountBalances": [
    { "accountId": "...", "name": "BBVA", "type": "BANK", "balance": 4200.00 }
  ],
  "expensesByCategory": [
    { "categoryId": "...", "categoryName": "Alimentación", "icon": "🛒", "total": 650.00 }
  ],
  "receivables": [
    { "person": "Carlos", "totalAmount": 500.00, "transactionCount": 2 }
  ],
  "period": { "startDate": "2024-01-01", "endDate": "2024-01-31" }
}
```

---

## Estructura del Proyecto

```
src/
├── auth/
│   ├── decorators/       # @CurrentUser()
│   ├── dto/              # RegisterDto, LoginDto
│   ├── guards/           # JwtAuthGuard
│   ├── strategies/       # JwtStrategy
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── users/
│   ├── entities/         # User entity
│   ├── users.module.ts
│   └── users.service.ts
├── accounts/
│   ├── dto/              # CreateAccountDto, UpdateAccountDto
│   ├── entities/         # Account entity
│   ├── accounts.controller.ts
│   ├── accounts.module.ts
│   └── accounts.service.ts
├── categories/
│   ├── dto/              # CreateCategoryDto, UpdateCategoryDto
│   ├── entities/         # Category entity
│   ├── categories.controller.ts
│   ├── categories.module.ts
│   └── categories.service.ts
├── transactions/
│   ├── dto/              # CreateTransactionDto, UpdateTransactionDto, FilterTransactionDto
│   ├── entities/         # Transaction entity
│   ├── transactions.controller.ts
│   ├── transactions.module.ts
│   └── transactions.service.ts
├── dashboard/
│   ├── dashboard.controller.ts
│   ├── dashboard.module.ts
│   └── dashboard.service.ts
├── app.module.ts
└── main.ts
```

---

## Lógica de Saldos

> Los saldos de cuentas **nunca se guardan en la base de datos**. Se calculan dinámicamente:
>
> `saldo = initialBalance + Σ(ingresos) - Σ(gastos)`
>
> Esto garantiza que los saldos siempre sean consistentes con las transacciones registradas.

---

## Seguridad

- Las contraseñas se hashean con **bcrypt** (12 salt rounds).
- Todos los endpoints (excepto `/auth/register` y `/auth/login`) requieren JWT válido.
- Cada usuario solo puede acceder a sus propios datos (validación de `userId` en todas las queries).
- Las variables de entorno sensibles nunca se exponen en el código.
