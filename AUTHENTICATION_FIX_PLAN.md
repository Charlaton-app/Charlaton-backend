# Authentication Fix Plan

## Backend Changes Needed

### 1. Create signup endpoint in auth.controller.ts

- Add `signup` function that creates user in Firestore
- Hash password before storing
- Auto-login after signup
- Return user data without password

### 2. Add signup route in auth.routes.ts

- POST /auth/signup with validation

### 3. Fix Facebook OAuth configuration

- Update Facebook App settings to include localhost:5173 and production domains

## Frontend Changes Needed

### 1. Fix auth.service.ts signup function

- Change from `/user` to `/auth/signup`
- Add comprehensive logging
- Fix error handling

### 2. Fix password recovery

- Ensure it calls correct backend endpoint `/auth/recover`

### 3. Fix password reset

- Ensure it calls `/auth/reset/:token`

### 4. Fix profile update

- Change to use `/api/user/:id` with proper authentication

### 5. Fix account deletion flow

- Remove password prompt
- Add confirmation modal with 3-second delay
- Use proper Firebase deleteUser

### 6. Add JSDoc to all functions (English)

### 7. Add console.log for debugging throughout authentication flow

## Testing Checklist

- [ ] Email/password login
- [ ] Google OAuth login
- [ ] Facebook OAuth login
- [ ] Signup with email/password
- [ ] Password recovery
- [ ] Password reset
- [ ] Profile update
- [ ] Account deletion
