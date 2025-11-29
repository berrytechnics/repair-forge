# CircuitSage

**A modern, full-stack management system for electronics repair businesses**

[![Backend CI](https://github.com/berrytechnics/circuit-sage/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/berrytechnics/circuit-sage/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/berrytechnics/circuit-sage/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/berrytechnics/circuit-sage/actions/workflows/frontend-ci.yml)

CircuitSage streamlines operations for electronics repair shops by providing comprehensive tools for managing customers, repair tickets, invoicing, inventory, and more—all in one integrated platform.

## Features

- **Customer Management** - Complete customer profiles with contact information and service history
- **Repair Ticketing** - Track jobs from intake to completion with status updates, technician assignment, and detailed notes
- **Invoicing** - Generate professional invoices with line items, tax calculation, and payment tracking
- **Inventory Management** - Track parts and supplies with automated reorder alerts
- **Purchase Orders** - Manage supplier orders and receiving workflows
- **Multi-Location Support** - Operate multiple locations with location-based data isolation
- **Role-Based Access Control** - Granular permissions for Admin, Manager, Technician, and Front Desk roles
- **Reporting & Analytics** - Comprehensive dashboards with charts and metrics
- **Asset Tracking** - Track customer devices and business equipment
- **Inventory Transfers** - Manage stock transfers between locations

## Tech Stack

### Backend
- **Node.js** + **Express** - RESTful API server
- **TypeScript** - Type-safe development
- **PostgreSQL 15** - Reliable relational database
- **Kysely** - Type-safe SQL query builder
- **JWT** - Secure authentication
- **Winston** - Structured logging

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe UI development
- **Tailwind CSS** - Utility-first styling
- **React Hook Form** + **Zod** - Form handling and validation
- **Zustand** - Lightweight state management
- **Chart.js** - Data visualization

### Infrastructure
- **Docker** + **Docker Compose** - Containerized development and deployment
- **GitHub Actions** - Continuous integration
- **Jest** + **Playwright** - Testing framework

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (20.10+) and **Docker Compose** (2.0+)
- **Node.js** (18+) - for local development
- **npm** or **yarn** - package manager
- **Git** - version control

Verify your installation:

```bash
docker --version
docker-compose --version
node --version
npm --version
```

## Quick Start

Get CircuitSage running in minutes:

### 1. Clone the Repository

```bash
git clone https://github.com/berrytechnics/circuit-sage.git
cd circuit-sage
```

### 2. Install Dependencies

```bash
npm install
```

This installs the CircuitSage CLI tool used to manage the application.

### 3. Start the Application

```bash
npm run dev
```

This command will:
- Create `.env` files from examples (if they don't exist)
- Build Docker images
- Start PostgreSQL, backend API, and frontend containers
- Run database migrations automatically
- Display live logs

To run in the background (detached mode):

```bash
npm run dev -- -d
```

### 4. Access the Application

Once containers are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

### 5. First Login

Use the default admin credentials:

- **Email**: `admin@circuitsage.com`
- **Password**: `admin123`

**Important**: Change this password immediately after first login!

## Project Structure

```
circuit-sage/
├── backend/              # Express TypeScript API
│   ├── src/
│   │   ├── __tests__/    # Test suites
│   │   ├── config/       # Configuration files
│   │   ├── middlewares/  # Express middlewares
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic layer
│   │   ├── integrations/ # Third-party integrations
│   │   └── utils/        # Utility functions
│   └── scripts/          # Utility scripts
├── frontend/             # Next.js TypeScript app
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities and API clients
│   └── e2e/              # Playwright E2E tests
├── database/
│   ├── migrations/       # Database migration files
│   └── init/             # Initialization scripts
├── docker-compose.yml    # Docker Compose configuration
├── cli.js                # CircuitSage CLI tool
└── package.json          # Root package.json
```

## Development

### Using the CLI

The CircuitSage CLI provides convenient commands for common tasks:

```bash
# Start development environment
npm run dev

# Start in production mode
npm run start

# Stop containers
npm run stop

# Stop and remove containers
npm run stop -- -r

# View logs
npm run logs

# View logs for specific service
npm run logs -- -s backend --follow

# Check service health
npm run health

# Open shell in container
npm run shell -- -s backend
```

### Local Development (Without Docker)

#### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials

# Start PostgreSQL (or use Docker)
docker-compose up -d postgres

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

### Database Management

```bash
# Run migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Reset database
npm run db:reset

# Create backup
npm run db:backup

# Restore backup
npm run db:restore backup.sql
```

### Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
cd frontend
npm run test:e2e

# Run all CI checks
npm run ci:all
```

## API Documentation

### Authentication

All endpoints (except `/user/register`, `/user/login`, and `/health`) require authentication via JWT token:

```
Authorization: Bearer <token>
```

### Core Endpoints

#### Customers
- `GET /api/customer` - List customers (with search)
- `GET /api/customer/:id` - Get customer details
- `POST /api/customer` - Create customer
- `PUT /api/customer/:id` - Update customer
- `DELETE /api/customer/:id` - Delete customer

#### Tickets
- `GET /api/ticket` - List tickets (with filters)
- `GET /api/ticket/:id` - Get ticket details
- `POST /api/ticket` - Create ticket
- `PUT /api/ticket/:id` - Update ticket
- `POST /api/ticket/:id/assign` - Assign technician
- `POST /api/ticket/:id/status` - Update status

#### Invoices
- `GET /api/invoice` - List invoices
- `GET /api/invoice/:id` - Get invoice details
- `POST /api/invoice` - Create invoice
- `PUT /api/invoice/:id` - Update invoice
- `POST /api/invoice/:id/paid` - Mark as paid

#### Inventory
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item

#### Purchase Orders
- `GET /api/purchase-order` - List purchase orders
- `POST /api/purchase-order` - Create purchase order
- `POST /api/purchase-order/:id/receive` - Receive order

## Architecture

### Backend Architecture

The backend follows a layered architecture:

1. **Routes Layer** - Define API endpoints
2. **Middleware Layer** - Authentication, authorization, validation, tenant isolation
3. **Service Layer** - Business logic and database operations
4. **Database Layer** - PostgreSQL with Kysely

### Request Flow

```
HTTP Request
  ↓
Route Handler
  ↓
Authentication Middleware (JWT)
  ↓
RBAC Middleware (Permissions)
  ↓
Tenant Middleware (Company/Location isolation)
  ↓
Validation Middleware
  ↓
Service Layer (Business logic)
  ↓
Database (Kysely queries)
  ↓
Response
```

### Multi-Tenancy

The system supports multiple companies, each with:
- Multiple locations
- Company-specific role permissions
- Isolated data (customers, tickets, invoices, etc.)
- Location-based filtering

## Troubleshooting

### Containers Won't Start

```bash
# Check Docker is running
docker ps

# View container logs
npm run logs

# Check container status
npm run status

# Restart containers
npm run restart
```

### Database Connection Issues

```bash
# Verify database is running
docker ps | grep circuit-sage-db

# Check database logs
npm run logs -- -s db

# Test database connection
npm run shell -- -s db
```

### Port Already in Use

If ports 3000, 4000, or 5432 are in use:

1. Stop conflicting services, or
2. Modify `docker-compose.yml` to use different ports

### Frontend Build Errors

```bash
cd frontend
rm -rf .next
npm run build
```

### Backend Type Errors

```bash
cd backend
npx tsc --noEmit
```

## Deployment

CircuitSage can be deployed to various platforms. For sandbox/client testing, we recommend Render's free tier.

### Quick Deployment to Render

1. Push code to GitHub
2. Connect Render to your repository
3. Render will auto-detect `render.yaml` and create services
4. Run database migrations
5. Access your deployed application

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Environment Variables

See [DEPLOYMENT.md](./DEPLOYMENT.md#environment-variables-reference) for complete environment variable documentation.

## Project Status

**Current Progress: ~85% Complete**

### Completed Features
- ✅ Multi-tenant architecture with company/location support
- ✅ Customer management (CRUD)
- ✅ Ticketing system with status tracking and notes
- ✅ Invoicing with line items and payment tracking
- ✅ Inventory management
- ✅ Purchase orders
- ✅ Inventory transfers
- ✅ Asset management
- ✅ Role-based access control (RBAC)
- ✅ Comprehensive backend test suite (118+ tests)
- ✅ E2E testing framework (Playwright)
- ✅ Reporting system with charts and analytics

### In Progress
- 🟡 Frontend unit testing
- 🟡 Backend tests for asset management and inventory transfers

### Planned Features
- ⏳ Diagnostic checklist system
- ⏳ Communication tools (email/SMS)
- ⏳ Payment processing integration
- ⏳ Advanced reporting and analytics

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write or update tests
5. Ensure all tests pass (`npm run ci:all`)
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Quality Checks

Before submitting a PR, run:

```bash
# Backend checks
npm run ci:backend

# Frontend checks
npm run ci:frontend

# All checks
npm run ci:all
```

## Additional Resources

- [QUICK_START.md](./QUICK_START.md) - User-focused quick start guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md) - Third-party integration setup
- `planning/MVP.md` - MVP specification
- `planning/PLAN.md` - Development roadmap

## License

This project is proprietary software. All rights reserved.

---

**Ready to get started?** Check out the [Quick Start Guide](./QUICK_START.md) for user-focused instructions.
