# Authentication Changes

## Summary

Discord OAuth authentication has been replaced with traditional username/password (credentials-based) authentication using NextAuth.js.

## Changes Made

### 1. Dependencies
- **Added**: `bcryptjs` - For password hashing and verification

### 2. Database Schema (`prisma/schema.prisma`)
- **Added**: `password` field to the `User` model (nullable String)

### 3. Authentication Configuration (`src/server/auth/config.ts`)
- **Removed**: Discord Provider
- **Added**: Credentials Provider with email/password authentication
- **Updated**: Session strategy to use JWT instead of database sessions
- **Added**: Password verification using bcryptjs
- **Updated**: Callbacks to work with JWT-based sessions

### 4. Environment Variables (`src/env.js`)
- **Removed**: `AUTH_DISCORD_ID` and `AUTH_DISCORD_SECRET`
- **Kept**: `AUTH_SECRET` (required for NextAuth)
- **Kept**: `DATABASE_URL` (for database connection)

### 5. New Pages
- **`src/app/auth/signin/page.tsx`**: Sign-in page with email/password form
- **`src/app/auth/register/page.tsx`**: Registration page for new users

### 6. New API Routes
- **`src/app/api/auth/register/route.ts`**: Registration endpoint that:
  - Validates input (email, password with min 6 chars)
  - Checks for existing users
  - Hashes passwords with bcrypt (12 rounds)
  - Creates new user in database

## Database Migration

Run the following command to apply the database changes:

```bash
pnpm prisma migrate dev --name add_password_to_user
```

This will:
1. Add the `password` field to the User table
2. Create a migration file in `prisma/migrations/`

## Environment Variables

Ensure your `.env` file has the following variables:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
AUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32

# Node Environment
NODE_ENV="development"
```

**Remove** these variables (no longer needed):
- `AUTH_DISCORD_ID`
- `AUTH_DISCORD_SECRET`

## Usage

### For Users

1. **Register**: Navigate to `/auth/register` to create a new account
2. **Sign In**: Navigate to `/auth/signin` to sign in with your credentials
3. **Sign Out**: Use the existing sign-out functionality

### For Developers

#### Creating a User Programmatically

```typescript
import { hash } from "bcryptjs";
import { db } from "@/server/db";

const hashedPassword = await hash("password123", 12);

const user = await db.user.create({
  data: {
    email: "user@example.com",
    password: hashedPassword,
    name: "John Doe",
  },
});
```

#### Password Requirements

- Minimum 6 characters
- Stored as bcrypt hash with 12 salt rounds

## Security Notes

1. **Password Hashing**: Uses bcrypt with 12 rounds (industry standard)
2. **Session Management**: JWT-based sessions (stateless)
3. **CSRF Protection**: Built into NextAuth.js
4. **Input Validation**: Zod schemas for all user inputs
5. **Error Handling**: Generic error messages to prevent user enumeration

## Testing

Before deploying to production:

1. Ensure database is running and accessible
2. Run migrations: `pnpm prisma migrate dev`
3. Generate Prisma client: `pnpm prisma generate`
4. Test registration flow at `/auth/register`
5. Test sign-in flow at `/auth/signin`
6. Verify session persistence
7. Test sign-out functionality

## Troubleshooting

### "Can't reach database server"
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Verify database credentials

### "Invalid email or password"
- Check that user exists in database
- Verify password was properly hashed during registration
- Check browser console for additional errors

### TypeScript Errors
- Run `pnpm prisma generate` to regenerate the Prisma client
- Restart TypeScript server in VS Code

## Next Steps

Consider adding:
- Password reset functionality
- Email verification
- Password strength requirements
- Account lockout after failed attempts
- Two-factor authentication (2FA)
- Session management (view/revoke sessions)
