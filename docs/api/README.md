# API Documentation

This directory contains comprehensive documentation about the tRPC API layer used in Events-Ting.

## 📚 Contents

### [tRPC Overview](./trpc-overview.md)
Introduction to tRPC and how it's used as the core API layer for Events-Ting. Learn about the benefits of end-to-end type safety, developer experience improvements, and how tRPC eliminates the need for REST endpoints or GraphQL schemas.

**Topics covered:**
- Why tRPC?
- Key benefits and features
- Basic usage patterns
- Type inference and validation

### [API Routers Reference](./routers.md)
Comprehensive reference of all tRPC routers and their procedures organized by domain feature. Includes quick reference tables, procedure details, and usage examples.

**Topics covered:**
- All 9 routers (event, ticket, registration, schedule, speaker, cfp, attendee, communication, user)
- Procedure signatures and parameters
- Authentication requirements
- Return types and examples

### [Authentication & Authorization](./authentication.md)
Details about authentication and authorization patterns used in the tRPC API layer, including procedure types, session management, and organizer authorization.

**Topics covered:**
- Procedure types (public, protected, organizer)
- Session management
- Authorization patterns
- Organizer access control
- Usage examples and best practices

### [Error Handling](./error-handling.md)
Error handling patterns in the tRPC API layer, including TRPCError codes, validation errors, and frontend error handling strategies.

**Topics covered:**
- TRPCError codes and their meanings
- Custom error messages
- Validation error handling
- Frontend error handling patterns
- Best practices and examples

## 🔗 Related Documentation

- [Architecture Overview](../architecture/system-overview.md) - System-wide architecture patterns
- [Development Setup](../development/setup.md) - Setting up your development environment
- [Data Model](../architecture/data-model.md) - Database schema and relationships

## 🚀 Quick Start

To understand the API layer, we recommend reading the documents in this order:

1. **tRPC Overview** - Understand the fundamentals
2. **API Routers Reference** - Explore available endpoints
3. **Authentication & Authorization** - Learn about access control
4. **Error Handling** - Handle errors gracefully

## 💡 Common Tasks

- **Creating a new router**: See [tRPC Overview](./trpc-overview.md#creating-a-router)
- **Adding authentication**: See [Authentication](./authentication.md#procedure-types)
- **Handling errors**: See [Error Handling](./error-handling.md#best-practices)
- **Finding an endpoint**: See [API Routers Reference](./routers.md#quick-reference-table)
