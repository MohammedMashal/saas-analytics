# SaaS Analytics Backend

A multi-tenant analytics platform built with NestJS and PostgreSQL. Designed to handle event ingestion, aggregation, and time-series summarization across multiple tenants.

## Overview

This backend service provides a complete analytics solution with the following capabilities:

- Event ingestion and storage with tenant isolation
- Automatic daily, weekly, and monthly summary calculations
- Multi-tenant support with API key authentication
- Rate limiting and request throttling
- Comprehensive REST API for analytics queries

## Tech Stack

- NestJS 11 - Modern Node.js framework
- PostgreSQL 15+ - Primary data store
- TypeORM - Database ORM
- date-fns - Date manipulation utility
- Jest - Testing framework

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=saas_analytics
NODE_ENV=development
```

### Running the Application

Development mode with watch:

```bash
npm run start:dev
```

Production build and run:

```bash
npm run build
npm run start:prod
```

### Database Setup

Run migrations to initialize the schema:

```bash
npm run migration:run
```

Generate new migrations after schema changes:

```bash
npm run migration:generate
```

## API Overview

The service exposes the following REST endpoints:

### Events

- `POST /events` - Ingest a single event
- `POST /events/bulk` - Ingest multiple events in batch

### Analytics & Aggregates

- `GET /analytics/events/count` - Get total event count with optional filters
- `GET /analytics/events/by-type` - Get event counts grouped by type
- `GET /analytics/events/timeline` - Get event counts over time with configurable intervals (day, week, month)

### Summaries

- `GET /summaries` - Retrieve pre-calculated summaries by metric, period type, and start date

### Tenants

- `POST /tenants` - Create a new tenant

All endpoints require an API key header for authentication and tenant identification. Rate limiting is enforced with a default limit of 100-1000 requests per minute depending on the endpoint.

## Scheduled Jobs

Three cron jobs run automatically to calculate summaries:

- Daily: Runs at 1 AM, aggregates yesterday's events
- Weekly: Runs Friday at 1 AM, aggregates the previous week
- Monthly: Runs on the 1st at midnight, aggregates the previous month

These jobs use database-level aggregation for efficiency and support re-execution without creating duplicates.

## Testing

Run the full test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:cov
```

E2E tests:

```bash
npm run test:e2e
```

## Project Structure

```
src/
├── aggregates/        - Event aggregation endpoints
├── events/           - Event ingestion and storage
├── summaries/        - Time-series summary data
├── tenants/          - Multi-tenant management
├── jobs/             - Scheduled aggregation tasks
├── config/           - Configuration and validation
└── migrations/       - Database schema migrations
```

## Contributing

When modifying the database schema, always generate migrations:

```bash
npm run migration:generate -- src/migrations/DescribeMigration
```

Run linting to fix code style issues:

```bash
npm run lint
```
