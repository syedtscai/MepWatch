# Development Guide - EU MEP Watch

## Overview

This guide provides comprehensive information for developers working on the EU MEP Watch application, including setup instructions, architecture explanations, and best practices.

## Quick Setup

### Prerequisites
- Node.js 18+ with npm
- PostgreSQL database (local or Neon)
- Git for version control

### Development Environment Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd eu-mep-watch
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure database connection
   DATABASE_URL=postgresql://username:password@localhost:5432/eu_mep_watch
   ```

3. **Database Setup**
   ```bash
   # Push schema to database
   npm run db:push
   
   # Run initial data sync (optional)
   npm run sync:data
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

```
eu-mep-watch/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-specific page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
├── server/                 # Backend Express application
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── storage/            # Data access layer
│   └── utils/              # Server utilities
├── shared/                 # Shared TypeScript types and schemas
├── docs/                   # Documentation files
└── README.md               # Project overview
```

## Architecture Deep Dive

### Frontend Architecture

**Core Technologies:**
- React 18 with TypeScript for type safety
- Vite for fast development and optimized builds
- TanStack Query for server state management
- Wouter for lightweight client-side routing

**Component Organization:**
```typescript
// Feature-based component structure
components/
├── meps/           # MEP-related components
├── committees/     # Committee components  
├── dashboard/      # Dashboard widgets
├── search/         # Search and filtering
└── ui/             # Reusable UI primitives
```

**State Management:**
- Server state: TanStack Query with intelligent caching
- Local state: React useState/useReducer
- Global state: Minimal, prefer prop drilling for simplicity

### Backend Architecture

**Express.js Server:**
```typescript
// Clean separation of concerns
routes/     # HTTP endpoint definitions
services/   # Business logic (data sync, transformations)
storage/    # Data access layer with caching
utils/      # Shared utilities (cache, database tools)
```

**Database Design:**
- PostgreSQL with Drizzle ORM for type safety
- Normalized schema with proper foreign key constraints
- Performance-optimized indexes on frequently queried columns

## Performance Optimizations

### Caching Strategy

**Multi-layered Caching:**
```typescript
// In-memory cache with TTL
const cache = new MemoryCache();

// Different TTLs for different data volatility
- Dashboard stats: 5 minutes (stable data)
- MEP lists: 2 minutes (moderate updates)
- Filter options: 10 minutes (rarely changes)
```

**Database Optimizations:**
- Composite indexes on search columns
- Query optimization to eliminate N+1 problems
- Batch loading for related data

### Frontend Performance

**React Query Configuration:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,      // 2 minutes
      cacheTime: 10 * 60 * 1000,     // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Component Optimizations:**
- React.memo for expensive components
- useMemo for complex calculations
- Debounced search to reduce API calls

## Data Synchronization

### EU Parliament API Integration

**Data Sources:**
```typescript
// Official EU Parliament APIs
const API_ENDPOINTS = {
  meps: 'https://data.europarl.europa.eu/api/v2/meps',
  committees: 'https://data.europarl.europa.eu/api/v2/corporate-bodies',
  events: 'https://data.europarl.europa.eu/api/v2/events'
};
```

**Sync Process:**
1. Rate-limited API requests (450 per 5 minutes)
2. Data transformation and validation
3. Change detection and audit logging
4. Cache invalidation for updated records

### Data Quality Assurance

**Validation Pipeline:**
- Zod schemas for type-safe data validation
- Business rule checks (MEP term dates, committee codes)
- Data completeness verification
- Duplicate detection and prevention

## Development Best Practices

### Code Style Guidelines

**TypeScript Standards:**
```typescript
// Always use interfaces for object shapes
interface MEPProfile {
  id: string;
  fullName: string;
  // ... other properties
}

// Use strict mode and enable all checks
// tsconfig.json: "strict": true
```

**Component Patterns:**
```typescript
// Functional components with TypeScript
interface ComponentProps {
  data: MEPProfile[];
  onSelect: (mep: MEPProfile) => void;
}

export function MEPList({ data, onSelect }: ComponentProps) {
  // Component implementation
}
```

### Error Handling

**Backend Error Patterns:**
```typescript
// Structured error responses
app.use((err, req, res, next) => {
  const response = {
    error: err.message,
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };
  
  res.status(err.status || 500).json(response);
});
```

**Frontend Error Boundaries:**
```typescript
// React Query error handling
const { data, error, isError } = useQuery({
  queryKey: ['meps'],
  queryFn: fetchMEPs,
  onError: (error) => {
    console.error('Failed to fetch MEPs:', error);
    toast.error('Unable to load MEP data');
  }
});
```

## Testing Strategy

### Unit Testing
- Jest for utility functions
- React Testing Library for components
- Vitest for Vite-based tests

### Integration Testing
- API endpoint testing with supertest
- Database integration tests
- End-to-end testing with Playwright

### Performance Testing
- Load testing for API endpoints
- Memory leak detection
- Cache effectiveness monitoring

## Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring and logging enabled
- [ ] Cache warming scripts ready
- [ ] Data sync schedules configured

### Monitoring
- Application performance monitoring
- Database query performance
- Cache hit rates
- API response times
- Error rates and alerts

## Contributing

### Git Workflow
1. Create feature branch from main
2. Make focused, atomic commits
3. Write descriptive commit messages
4. Submit pull request with clear description
5. Ensure all tests pass

### Code Review Guidelines
- Check for TypeScript compliance
- Verify error handling
- Review performance implications
- Validate data integrity measures
- Ensure documentation updates

## Security Considerations

### Data Protection
- No storage of personal sensitive data beyond EU Parliament public records
- Secure database connections with SSL
- Environment variable security
- Rate limiting on public endpoints

### API Security
- Input validation on all endpoints
- SQL injection prevention through ORM
- XSS protection in frontend
- CORS configuration for production

## Troubleshooting

### Common Issues
1. **Database Connection Errors**: Check DATABASE_URL format
2. **Cache Performance**: Monitor memory usage and TTL settings
3. **API Rate Limits**: Implement exponential backoff
4. **TypeScript Errors**: Keep dependencies updated

### Debug Mode
```bash
# Enable verbose logging
DEBUG=eu-mep-watch:* npm run dev

# Database query logging
DATABASE_LOGGING=true npm run dev
```

## Resources

- [EU Parliament API Documentation](https://data.europarl.europa.eu/en/developer-corner)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TanStack Query Guide](https://tanstack.com/query/latest)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)

---

*Last updated: August 2025*