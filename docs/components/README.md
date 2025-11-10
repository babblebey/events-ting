# Components Documentation

This directory contains comprehensive documentation about the UI component system, form patterns, data tables, and design system used in Events-Ting.

## 📚 Contents

### [UI System](./ui-system.md)
Overview of the design system built with Tailwind CSS and Flowbite React, including design philosophy, theme configuration, and component patterns.

**Topics covered:**
- Design philosophy (utility-first styling)
- Tailwind CSS configuration and customization
- Flowbite React components
- Color system and theming
- Typography and spacing
- Icons and fonts
- Responsive design patterns
- Dark mode support (future)

### [Reusable Components](./reusable-components.md)
Catalog of custom reusable UI components built for Events-Ting that extend or complement Flowbite React components.

**Topics covered:**
- FormField component
- EmptyState component
- LoadingSpinner component
- StatusBadge component
- DateDisplay component
- Custom component patterns
- Component props and usage examples
- When to create new reusable components

### [Forms Documentation](./forms.md)
Form patterns, validation, error handling, and best practices for building forms using Flowbite React, Zod validation, and tRPC mutations.

**Topics covered:**
- Form architecture
- Basic form patterns
- Form validation with Zod
- Error handling and display
- Loading states and disabled inputs
- File uploads
- Multi-step forms
- Form submission with tRPC
- Best practices and patterns

### [Tables Documentation](./tables.md)
Data table patterns, sorting, filtering, pagination, and best practices for displaying tabular data using Flowbite React Table components.

**Topics covered:**
- Basic table patterns
- Sorting (client-side and server-side)
- Filtering and search
- Pagination
- Row actions (edit, delete)
- Empty states
- Loading states
- Mobile responsive tables
- Performance optimization
- Best practices

## 🔗 Related Documentation

- [API Documentation](../api/) - Learn about data fetching with tRPC
- [Architecture: Tech Stack](../architecture/tech-stack.md) - Details about UI libraries
- [Development Setup](../development/setup.md) - Setting up your development environment

## 🚀 Quick Start

To understand the component system, we recommend reading the documents in this order:

1. **UI System** - Understand the design system foundation
2. **Reusable Components** - Explore available custom components
3. **Forms Documentation** - Learn form patterns and validation
4. **Tables Documentation** - Master data table implementations

## 💡 Common Tasks

### Building a Form
1. Read [Forms Documentation](./forms.md)
2. Use FormField from [Reusable Components](./reusable-components.md)
3. Apply Flowbite components from [UI System](./ui-system.md)

### Creating a Data Table
1. Read [Tables Documentation](./tables.md)
2. Implement sorting and filtering
3. Add pagination for large datasets

### Creating a New Component
1. Review existing components in [Reusable Components](./reusable-components.md)
2. Follow patterns from [UI System](./ui-system.md)
3. Use Tailwind utility classes
4. Ensure accessibility

### Styling Components
1. Use Tailwind utility classes ([UI System](./ui-system.md))
2. Follow the color system and spacing guidelines
3. Leverage Flowbite React for complex components
4. Maintain consistent design patterns

## 🎨 Design System Highlights

### Core Technologies
- **Tailwind CSS 4.0** - Utility-first CSS framework
- **Flowbite React 0.12** - Pre-built component library
- **React Icons** - Icon library
- **Geist Sans** - Typography

### Key Principles
- **Utility-First**: Use Tailwind utility classes for styling
- **Component Composition**: Build complex UIs from simple components
- **Accessibility**: Follow WCAG guidelines
- **Responsive**: Mobile-first design approach
- **Consistency**: Reuse components and patterns

## 📖 For Different Roles

### UI/UX Developers
Focus on [UI System](./ui-system.md) for design tokens, colors, and spacing.

### Frontend Developers
Start with [Forms Documentation](./forms.md) and [Tables Documentation](./tables.md) for common patterns.

### Component Authors
Review [Reusable Components](./reusable-components.md) for patterns and best practices.

## 🔧 Component Location

All custom components are located in:
```
src/components/
├── ui/              # Reusable UI components
├── forms/           # Form-specific components
└── tables/          # Table-specific components
```

Flowbite React components are imported directly:
```typescript
import { Button, Card, Table } from "flowbite-react";
```
