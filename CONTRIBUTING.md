# Contributing to EU MEP Watch

We welcome contributions to the EU MEP Watch project! This document provides guidelines for contributing.

## Getting Started

### Prerequisites
- Node.js 18+ with npm
- PostgreSQL database access
- Git for version control
- Basic knowledge of React, TypeScript, and Express.js

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/eu-mep-watch.git`
3. Install dependencies: `npm install`
4. Set up environment variables (see README.md)
5. Run database migrations: `npm run db:push`
6. Start development server: `npm run dev`

## Development Guidelines

### Code Standards
- Use TypeScript for all new code
- Follow existing code style and conventions
- Add JSDoc comments for public functions and classes
- Use descriptive variable and function names
- Keep functions small and focused

### Component Guidelines
```typescript
// Functional components with TypeScript
interface ComponentProps {
  data: MEPProfile[];
  onSelect: (mep: MEPProfile) => void;
}

export function ComponentName({ data, onSelect }: ComponentProps) {
  // Implementation
}
```

### Git Workflow
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes with clear, atomic commits
3. Write descriptive commit messages
4. Push to your fork: `git push origin feature/your-feature-name`
5. Create a pull request

### Commit Message Format
```
type(scope): brief description

Detailed explanation if needed

- List specific changes
- Reference issue numbers if applicable
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Testing

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run with coverage report
```

### Writing Tests
- Write tests for new features and bug fixes
- Use descriptive test names
- Test both happy path and error conditions
- Mock external dependencies appropriately

### Test Structure
```typescript
describe('Component/Function Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = {};
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

## API Development

### Adding New Endpoints
1. Define route in `server/routes.ts`
2. Implement business logic in appropriate service
3. Add data access methods to storage layer
4. Write comprehensive tests
5. Update API documentation

### Data Validation
- Use Zod schemas for input validation
- Validate data at API boundaries
- Return descriptive error messages
- Log validation failures for debugging

## Database Changes

### Schema Modifications
1. Update schema in `shared/schema.ts`
2. Run `npm run db:push` to apply changes
3. Test with existing data
4. Update TypeScript types if needed
5. Document breaking changes

### Data Migrations
- Use Drizzle migrations for production changes
- Test migrations with real data
- Provide rollback procedures
- Document migration steps

## Performance Considerations

### Frontend Performance
- Use React.memo for expensive components
- Implement proper caching strategies
- Optimize bundle size
- Test on slower devices/connections

### Backend Performance
- Monitor database query performance
- Implement appropriate caching
- Use database indexes effectively
- Profile memory usage

## EU Parliament Data

### Data Quality Standards
- Maintain data accuracy and completeness
- Verify against official EU Parliament sources
- Implement proper error handling for API failures
- Document data transformation logic

### API Integration
- Respect EU Parliament API rate limits
- Implement proper retry mechanisms
- Handle API changes gracefully
- Monitor data sync health

## Documentation

### Code Documentation
- Add JSDoc comments for public APIs
- Document complex business logic
- Explain non-obvious design decisions
- Keep documentation up-to-date

### User Documentation
- Update README for new features
- Add examples for new APIs
- Document configuration options
- Include troubleshooting guides

## Review Process

### Pull Request Guidelines
- Provide clear description of changes
- Include relevant tests
- Update documentation as needed
- Request review from maintainers
- Address feedback promptly

### Code Review Checklist
- [ ] Code follows project conventions
- [ ] Tests are comprehensive and passing
- [ ] Documentation is updated
- [ ] Performance impact is acceptable
- [ ] Security implications are considered

## Security

### Data Protection
- Never commit sensitive information
- Use environment variables for secrets
- Follow EU data protection guidelines
- Report security issues privately

### Dependency Management
- Keep dependencies updated
- Review security advisories
- Use npm audit regularly
- Document dependency changes

## Getting Help

### Communication Channels
- GitHub Issues for bug reports and feature requests
- GitHub Discussions for general questions
- Pull Request comments for code-specific questions

### Resources
- [Project Documentation](./docs/)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Development Guide](./docs/DEVELOPMENT_GUIDE.md)
- [EU Parliament API Documentation](https://data.europarl.europa.eu/en/developer-corner)

## Recognition

Contributors are recognized in the following ways:
- Listed in project contributors
- Mentioned in release notes for significant contributions
- Invited to join the core team for sustained contributions

## Code of Conduct

### Our Standards
- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment
- Respect different viewpoints and experiences

### Enforcement
Project maintainers are responsible for enforcing these standards and may take appropriate action for unacceptable behavior.

---

Thank you for contributing to EU MEP Watch! Your efforts help improve transparency in European democracy.