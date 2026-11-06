# FinanTrack API

Backend REST de FinanTrack para administrar cuentas, categorías, personas y movimientos financieros. La API está construida con NestJS, usa PostgreSQL mediante TypeORM y protege los recursos privados con JWT.

## Funcionalidades

- Registro e inicio de sesión.
- Autenticación mediante Bearer Token (JWT).
- Gestión de cuentas y cálculo dinámico de saldos.
- Gestión de categorías de ingresos y gastos.
- Gestión de personas asociadas a deudas y pagos.
- Registro y filtrado de transacciones.
- Resumen financiero mensual para el dashboard.
- Validación global de las solicitudes.
- Documentación interactiva con Swagger.

## Tecnologías

- Node.js y TypeScript
- NestJS 11
- PostgreSQL
- TypeORM
- Passport y JWT
- Argon2 para contraseñas
- class-validator y class-transformer
- Swagger / OpenAPI
- Jest

## Requisitos

- Node.js 20 o superior
- npm
- Una instancia de PostgreSQL local o remota

## Instalación

Desde la carpeta del backend:

```bash
cd finantrack
npm install
```

## Variables de entorno

Crea el archivo `.env` a partir de `.env.example`:

```powershell
Copy-Item .env.example .env
```

En macOS o Linux:

```bash
cp .env.example .env
```

Configura los siguientes valores:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contrasena
DB_NAME=finantrack
DB_SSL=false
DB_SYNCHRONIZE=true

JWT_SECRET=una_clave_larga_y_segura
JWT_EXPIRATION=7d
```

| Variable | Descripción | Valor habitual |
|---|---|---|
| `PORT` | Puerto de la API | `3000` |
| `FRONTEND_URL` | Origen permitido por CORS | `http://localhost:5173` |
| `DB_HOST` | Servidor de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USER` | Usuario de la base de datos | `postgres` |
| `DB_PASSWORD` | Contraseña de la base de datos | — |
| `DB_NAME` | Nombre de la base de datos | `finantrack` |
| `DB_SSL` | Habilita SSL para la conexión | `false` local, normalmente `true` en servicios administrados |
| `DB_SYNCHRONIZE` | Sincroniza el esquema automáticamente | `true` solo durante desarrollo |
| `JWT_SECRET` | Clave usada para firmar los tokens | Debe ser secreta y robusta |
| `JWT_EXPIRATION` | Duración del token | `7d` |

> No publiques el archivo `.env`. Para producción usa migraciones y establece `DB_SYNCHRONIZE=false`, ya que la sincronización automática puede alterar el esquema.

## Ejecución

```bash
# Desarrollo con recarga automática
npm run start:dev

# Ejecución normal
npm run start

# Compilar y ejecutar la versión de producción
npm run build
npm run start:prod
```

La API queda disponible en `http://localhost:3000`. La documentación Swagger se encuentra en `http://localhost:3000/api/docs`.

## Autenticación

Los endpoints de registro e inicio de sesión son públicos. Los demás requieren el token recibido en la propiedad `access_token`:

```http
Authorization: Bearer <access_token>
```

Ejemplo de registro:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Pérez","email":"ana@example.com","password":"clave-segura-123"}'
```

Ejemplo de inicio de sesión:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"clave-segura-123"}'
```

## Endpoints

### Autenticación

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| `POST` | `/auth/register` | Registra un usuario y devuelve un token | Público |
| `POST` | `/auth/login` | Inicia sesión y devuelve un token | Público |

### Cuentas

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/accounts` | Crea una cuenta |
| `GET` | `/accounts` | Lista las cuentas del usuario |
| `GET` | `/accounts/:id` | Consulta una cuenta |
| `GET` | `/accounts/:id/balance` | Obtiene el saldo calculado |
| `PUT` | `/accounts/:id` | Actualiza una cuenta |
| `DELETE` | `/accounts/:id` | Elimina una cuenta |

Tipos de cuenta: `BANK`, `DIGITAL_WALLET`, `CASH` y `CREDIT_CARD`.

### Categorías

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/categories` | Crea una categoría |
| `GET` | `/categories` | Lista las categorías del usuario |
| `GET` | `/categories/:id` | Consulta una categoría |
| `PUT` | `/categories/:id` | Actualiza una categoría |
| `DELETE` | `/categories/:id` | Elimina una categoría |

Tipos de categoría: `INCOME` y `EXPENSE`.

### Personas

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/persons` | Crea una persona |
| `GET` | `/persons` | Lista las personas del usuario |
| `GET` | `/persons/:id` | Consulta una persona |
| `PUT` | `/persons/:id` | Actualiza una persona |
| `DELETE` | `/persons/:id` | Elimina una persona |

### Transacciones

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/transactions` | Registra una transacción |
| `GET` | `/transactions` | Lista y filtra transacciones |
| `GET` | `/transactions/:id` | Consulta una transacción |
| `PUT` | `/transactions/:id` | Actualiza una transacción |
| `DELETE` | `/transactions/:id` | Elimina una transacción |

Filtros disponibles en `GET /transactions`:

| Parámetro | Descripción |
|---|---|
| `accountId` | UUID de la cuenta |
| `categoryId` | UUID de la categoría |
| `personId` | UUID de la persona |
| `type` | `INCOME`, `EXPENSE` o `TRANSFER` |
| `purpose` | `NORMAL`, `DEBT` o `REPAYMENT` |
| `startDate` | Fecha inicial en formato ISO |
| `endDate` | Fecha final en formato ISO |

Las operaciones con propósito `DEBT` deben ser gastos y las operaciones `REPAYMENT` deben ser ingresos. Ambas requieren una persona asociada.

### Dashboard

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/dashboard` | Devuelve balance total, ingresos, gastos, balance neto, saldos por cuenta, gastos por categoría y cuentas por cobrar del mes actual |

## Cálculo de saldos

El saldo de una cuenta no se almacena como un campo independiente. Se calcula con el saldo inicial y sus movimientos:

```text
saldo = saldo inicial + ingresos - gastos
```

Actualmente las transacciones de tipo `TRANSFER` no modifican este cálculo.

## Estructura principal

```text
src/
├── accounts/       # Cuentas y cálculo de saldos
├── auth/           # Registro, login, JWT y guards
├── categories/     # Categorías de ingresos y gastos
├── dashboard/      # Resumen financiero mensual
├── persons/        # Personas relacionadas con deudas y pagos
├── transactions/   # Movimientos y filtros
├── users/          # Usuarios
├── app.module.ts
└── main.ts
```

## Calidad y pruebas

```bash
npm run lint
npm run format
npm test
npm run test:watch
npm run test:cov
npm run test:e2e
```

`npm run lint` y `npm run format` modifican archivos para aplicar correcciones y formato.
