# CircuitSage: Electronics Repair Business Management System

![Backend CI](https://github.com/berrytechnics/circuit-sage/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI](https://github.com/berrytechnics/circuit-sage/actions/workflows/frontend-ci.yml/badge.svg)

A comprehensive management system for electronics repair businesses with ticketing, inventory management, invoicing, and customer management features.

## Technology Stack

- **Backend**: Express.js with TypeScript
- **Frontend**: Next.js 14 with TypeScript and React
- **Database**: PostgreSQL
- **Containerization**: Docker
- **ORM**: Sequelize

## Features

- **Ticketing System**: Create, assign, track, and manage repair tickets
- **Inventory Management**: Track parts, supplies, and set reorder thresholds
- **Customer Management**: Store customer information and repair history
- **Invoicing**: Generate professional invoices from repair tickets
- **User Management**: Role-based access control (admin, technician, frontdesk)
- **Reporting**: Business analytics and performance reports

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
- API Documentation: http://localhost:4000/api-docs

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
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middlewares/    # Express middlewares
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types and interfaces
│   │   ├── utils/          # Utility functions
│   │   └── app.ts          # Express app
│   ├── Dockerfile          # Backend Docker configuration
│   ├── Dockerfile.dev      # Development Docker configuration
│   ├── package.json        # Backend dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── ...
├── frontend/               # Next.js TypeScript frontend
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # Reusable React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── styles/         # CSS and styling files
│   │   └── types/          # TypeScript types and interfaces
│   ├── Dockerfile          # Frontend Docker configuration
│   ├── Dockerfile.dev      # Development Docker configuration
│   ├── package.json        # Frontend dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── ...
├── database/
│   ├── init/               # Database initialization scripts
│   └── migrations/         # Database migration files
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
npm run link
```

#### Available Commands

Run `circuit --help` to see all available commands, or use the npm scripts:

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
npm run db:migrate          # Run database migrations
npm run db:migrate:undo     # Undo the last database migration
npm run db:migrate:reset    # Reset database (undo all migrations, then migrate)
npm run db:migrate:undo:all # Undo all migrations
npm run db:seed             # Seed the database with initial data
npm run db:seed:undo        # Undo all database seeds
```

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Docker Development

The project includes optimized Docker configurations for both development and production:

- Development containers include hot reloading, source mapping, and development dependencies
- Production containers are optimized for performance and security

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

## API Documentation

The API documentation is available at http://localhost:4000/api-docs when running the application.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

![CircuitSage Logo](./frontend/public/logo.svg)
