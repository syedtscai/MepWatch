# EU MEP Watch

## Overview

EU MEP Watch is a professional web application designed for non-technical business users to monitor and access comprehensive information about EU Members of Parliament (MEPs) and Parliamentary Committees. The system provides daily updated data sourced from the European Parliament's official APIs, enabling policy analysts, lobbyists, consultants, and government affairs teams to efficiently track MEP profiles, committee memberships, and organizational changes.

The application features a modern dashboard with search and filtering capabilities, detailed profile pages, data export functionality, and change tracking to help users stay informed about the dynamic EU parliamentary landscape.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Component Structure**: Modular component architecture with reusable UI components and feature-specific components organized by domain (MEPs, Committees, Dashboard)

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **API Design**: RESTful API endpoints with structured error handling and request logging
- **Data Synchronization**: Automated service for fetching and syncing data from EU Parliament APIs
- **Export Services**: CSV, JSON, and PDF export functionality for data analysis

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon serverless platform
- **ORM**: Drizzle ORM with schema-first approach and automatic migrations
- **Schema Design**: Normalized relational schema with tables for MEPs, Committees, MEP-Committee relationships, data updates, and change logs
- **Data Relationships**: Many-to-many relationship between MEPs and Committees with role tracking

### Authentication and Authorization
- **Session Management**: PostgreSQL-based session storage using connect-pg-simple
- **Security**: CORS configuration and request validation middleware
- **Access Control**: Currently designed for authenticated business users with role-based access patterns ready for implementation

## External Dependencies

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **European Parliament APIs**: 
  - MEP list endpoint: `https://www.europarl.europa.eu/meps/en/full-list/json`
  - Individual MEP profiles: `https://www.europarl.europa.eu/meps/en/{MEP_ID}/json`

### UI and Component Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **Shadcn/ui**: Pre-built component library with consistent design system
- **Lucide React**: Icon library for consistent iconography
- **TailwindCSS**: Utility-first CSS framework with custom design tokens

### Development and Build Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Type safety across frontend and backend
- **Replit Integration**: Development environment integration with cartographer and runtime error overlay
- **ESBuild**: Fast JavaScript bundler for production builds

### Data Processing and Validation
- **Zod**: Schema validation for API requests and responses
- **Drizzle-Zod**: Integration between Drizzle ORM and Zod for type-safe database operations
- **Date-fns**: Date manipulation and formatting utilities