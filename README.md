# CircuitSage: Electronics Repair Business Management System

![Backend CI](https://github.com/berrytechnics/circuit-sage/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI](https://github.com/berrytechnics/circuit-sage/actions/workflows/frontend-ci.yml/badge.svg)

A comprehensive management system for electronics repair businesses with ticketing, inventory management, invoicing, and customer management features.

## Technology Stack

- **Backend**: Express.js with TypeScript
- **Frontend**: Next.js 14 with TypeScript and React
- **Database**: PostgreSQL
- **Containerization**: Docker
- **ORM**: Kysely (type-safe SQL query builder)
- **Authentication**: JWT tokens with bcrypt password hashing

## Features

### Implemented Features

- **Customer Management**: Full CRUD operations for customer profiles with search functionality
- **Ticketing System**: Complete ticket management with:
  - Automated ticket numbering
  - Status tracking and updates
  - Technician assignment/unassignment
  - Priority management
  - Diagnostic and repair notes
  - Full UI integration
- **Invoicing**: Invoice generation with automated invoice numbering, tax calculation, and payment tracking
- **User Authentication**: JWT-based authentication with secure password hashing
- **Role-Based Access Control**: RBAC middleware implemented and enforced on all routes with role-based permissions
- **API Routes**: RESTful API endpoints for customers, tickets, invoices, and users
- **Frontend UI**: Complete Next.js frontend with pages for customers, tickets, invoices, and dashboard
- **Testing**: Comprehensive backend test suite with 118+ tests and E2E testing framework (Playwright)
- **Demo Tools**: Cloudflare tunnel integration for easy frontend sharing

### Planned Features

- **Inventory Management**: Track parts, supplies, and set reorder thresholds
- **Diagnostic System**: Standardized diagnostic templates and checklists
- **Communication Tools**: Email and SMS notifications for status updates
- **Reporting**: Business analytics and performance reports
- **Payment Processing**: Stripe integration for payment processing

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development outside Docker)
- npm or yarn (for local development outside Docker)

### Setup and Installation

1. Clone the repository:

```bash
git clone https://github.com/berrytechnics/circuit-sage.git
cd circuit-sage
```

2. Configure environment variables:

```bash
# Copy example .env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Start the application using the CircuitSage CLI:

```bash
# Development mode with live logs
npm run dev

# Production mode
npm run start
```

This will start the PostgreSQL database, backend API, and frontend web application.

4. Access the application:

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health Check: http://localhost:4000/health

### Default Admin Login

After initialization, you can log in with the default admin account:

- Email: admin@circuitsage.com
- Password: admin123

**Important**: Change the default admin password after the first login!

## Project Structure

```
circuit-sage/
├── backend/                # Express TypeScript backend
│   ├── src/
│   │   ├── __tests__/      # Test files
│   │   ├── config/         # Configuration files (database, errors, logger, types)
│   │   ├── middlewares/    # Express middlewares (auth, validation)
│   │   ├── routes/         # API routes (customer, ticket, invoice, user)
│   │   ├── services/       # Business logic layer
│   │   ├── utils/          # Utility functions (asyncHandler, auth)
│   │   ├── validators/     # Request validation schemas
│   │   ├── app.ts          # Express app configuration
│   │   └── server.ts        # Server entry point
│   ├── Dockerfile          # Backend Docker configuration
│   ├── Dockerfile.dev      # Development Docker configuration
│   ├── package.json        # Backend dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── jest.config.js      # Jest test configuration
├── frontend/               # Next.js TypeScript frontend
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   │   ├── customers/  # Customer management pages
│   │   │   ├── tickets/    # Ticket management pages
│   │   │   ├── invoices/   # Invoice management pages
│   │   │   ├── dashboard/  # Dashboard page
│   │   │   └── login/      # Authentication pages
│   │   ├── components/     # Reusable React components
│   │   ├── lib/            # Utility functions and API clients
│   │   └── styles/         # CSS and styling files
│   ├── Dockerfile          # Frontend Docker configuration
│   ├── Dockerfile.dev      # Development Docker configuration
│   ├── package.json        # Frontend dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── tailwind.config.js  # Tailwind CSS configuration
├── database/
│   ├── init/               # Database initialization scripts
│   └── migrations/         # Database migration files
├── planning/               # Project planning documents
│   ├── MVP.md              # MVP specification
│   ├── PLAN.md             # Development roadmap
│   └── progress/           # Progress reports
├── docker-compose.yml      # Docker composition
├── cli.js                  # CircuitSage CLI tool
├── package.json            # Root package.json with CLI commands
└── README.md               # Project documentation
```

## Development

### CircuitSage CLI

CircuitSage comes with a powerful CLI tool for managing your development and production environments.

#### Installation

From the project root directory:

```bash
# Install dependencies
npm install

# Link CLI for global use (optional)
# After linking, you can use 'circuit-sage' command globally
npm run link
```

**Note**: After linking globally, you can use `circuit-sage --help` instead of `node cli.js --help`. However, using npm scripts (like `npm run dev`) is the recommended approach.

#### Available Commands

You can run the CLI directly with `node cli.js --help` to see all available commands, or use the npm scripts (recommended):

```bash
# Development Commands
npm run dev           # Start development environment with live logs
npm run dev -- -d     # Start development environment in detached mode (no logs)

# Production Commands
npm run start         # Build and run the application in production mode

# Container Management
npm run stop          # Stop running containers without removing them
npm run stop -- -r    # Stop and remove containers
npm run cleanup       # Clean up Docker resources completely

# Database Commands
npm run db:migrate          # Run database migrations (via Sequelize CLI)
npm run db:migrate:undo     # Undo the last database migration
npm run db:migrate:reset    # Reset database (undo all migrations, then migrate)
npm run db:migrate:undo:all # Undo all migrations
npm run db:seed             # Seed the database with initial data
npm run db:seed:undo        # Undo all database seeds

# CI/CD Commands
npm run ci:backend          # Run backend CI checks (lint, typecheck, test)
npm run ci:frontend         # Run frontend CI checks (lint, typecheck, build)
npm run ci:all              # Run all CI checks

# Demo Commands
npm run demo                # Start Cloudflare tunnel for frontend demo
npm run demo -- --port 3001 # Start demo tunnel with custom port
```

### Backend Development

```bash
cd backend
npm install  # or yarn install
npm run dev   # or yarn dev
```

The backend includes:
- TypeScript with strict type checking
- Kysely ORM for type-safe database queries
- JWT authentication middleware
- Role-based access control (RBAC) middleware
- Request validation middleware
- Comprehensive error handling
- Test suite with Jest (118+ tests)

### Frontend Development

```bash
cd frontend
npm install  # or yarn install
npm run dev   # or yarn dev
```

The frontend includes:
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- React Hook Form for form management
- API client functions for backend integration

### Docker Development

The project includes optimized Docker configurations for both development and production:

- Development containers include hot reloading, source mapping, and development dependencies
- Production containers are optimized for performance and security

## Testing

The project includes comprehensive test coverage:

### Backend Tests

```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

Test files are located in `backend/src/__tests__/` and include:
- Route integration tests for customers, tickets, invoices, and users
- Service layer tests
- Authentication and validation tests

### Frontend Tests

Frontend testing setup is in progress.

## Build Optimizations

CircuitSage includes several build optimizations:

- SWC minification for faster builds
- Bundle analysis tools for optimizing code size
- Memory optimizations for large projects
- Docker caching strategies for faster rebuilds

To analyze frontend bundle size:

```bash
cd frontend
npm run analyze
```

## API Endpoints

### Authentication
- `POST /user/register` - Register a new user
- `POST /user/login` - Login and receive JWT token

### Customers
- `GET /customer` - List all customers (with optional search query)
- `GET /customer/search` - Search customers
- `GET /customer/:id` - Get customer by ID
- `POST /customer` - Create new customer
- `PUT /customer/:id` - Update customer
- `DELETE /customer/:id` - Delete customer (soft delete)
- `GET /customer/:id/tickets` - Get customer's tickets

### Tickets
- `GET /ticket` - List all tickets (with optional filters: customerId, status)
- `GET /ticket/:id` - Get ticket by ID
- `POST /ticket` - Create new ticket
- `PUT /ticket/:id` - Update ticket
- `DELETE /ticket/:id` - Delete ticket (soft delete)
- `POST /ticket/:id/assign` - Assign or unassign technician
- `POST /ticket/:id/status` - Update ticket status
- `POST /ticket/:id/diagnostic-notes` - Add diagnostic notes
- `POST /ticket/:id/repair-notes` - Add repair notes

### Invoices
- `GET /invoice` - List all invoices (with optional filters: customerId, status)
- `GET /invoice/:id` - Get invoice by ID
- `POST /invoice` - Create new invoice
- `PUT /invoice/:id` - Update invoice
- `DELETE /invoice/:id` - Delete invoice (soft delete)
- `POST /invoice/:id/items` - Add item to invoice
- `PUT /invoice/:id/items/:itemId` - Update invoice item
- `DELETE /invoice/:id/items/:itemId` - Remove invoice item
- `POST /invoice/:id/paid` - Mark invoice as paid
- `GET /customer/:id/invoices` - Get customer's invoices

### Health Check
- `GET /health` - Health check endpoint

All endpoints (except `/user/register`, `/user/login`, and `/health`) require authentication via JWT token in the `Authorization` header: `Bearer <token>`

## Project Status

**Current Progress: ~67% Complete**

### Completed
- ✅ Database schema for all core entities
- ✅ Backend services and routes (customers, tickets, invoices, users)
- ✅ Advanced ticket endpoints (assign, status, notes)
- ✅ JWT authentication system
- ✅ Frontend UI components and pages
- ✅ API client functions with full integration
- ✅ Request validation
- ✅ Comprehensive test suite for backend routes (118+ tests)
- ✅ Role-based access control (RBAC) middleware implemented and enforced on all routes
- ✅ Permission-based route protection on all frontend pages (21 pages protected)
- ✅ Company-specific RBAC permissions management with editable permissions screen
- ✅ Ticket management UI fully functional
- ✅ Invoice item management fully implemented (add, update, delete)
- ✅ E2E testing framework established (Playwright)
- ✅ Customer management UI fully functional
- ✅ Inventory management system complete
- ✅ Purchase orders system complete
- ✅ Demo tunnel script for sharing frontend

### In Progress
- 🟡 Frontend unit testing

### Planned
- ⏳ Diagnostic checklist system
- ⏳ Communication tools (email/SMS)
- ⏳ Payment processing integration
- ⏳ Reporting and analytics

See `planning/progress/` for detailed progress reports.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

![CircuitSage Logo](./frontend/public/logo.svg)
