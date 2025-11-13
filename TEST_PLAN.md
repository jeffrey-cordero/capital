# Settings Page E2E Test Suite - Comprehensive Test Plan

## Document Overview
This document provides a detailed breakdown of all E2E test cases for the Settings page, including test organization, execution strategies, and validation criteria.

## Test Suite Structure

### File Organization
```
client/
├── app/
│   └── routes/
│       └── router.tsx (MODIFIED - added data-testid and data-dark)
└── tests/
    ├── dashboard/
    │   ├── settings.spec.ts (NEW - main E2E test suite)
    │   └── accounts.spec.ts (existing)
    ├── routing/
    │   └── routing.spec.ts (MODIFIED - added Theme Toggle tests)
    └── utils/
        ├── dashboard/
        │   ├── settings.ts (NEW - helper functions)
        │   └── accounts.ts (existing)
        └── user-management.ts (MODIFIED - added isTestScoped flag)
```

## Test Categories and Count

### Settings E2E Tests (`settings.spec.ts`)
- **Initial State**: 3 tests
- **Details Form**: 18 tests
  - Successful Updates: 6
  - Form Validation: 5
  - Theme Persistence: 2
  - Cancel Behavior: 3
- **Security Form**: 30 tests
  - Successful Updates (individual): 6
  - Multiple Fields Together: 3
  - Update All Security Fields: 1
  - Form Validation: 6
  - Cancel Behavior: 4
- **Cross-Section Updates**: 1 test
- **Actions**: 4 tests
  - Logout: 2 (confirm + cancel)
  - Delete Account: 2 (confirm + cancel)
  - Export Account: 1

**Total Settings E2E Tests: 59**

### Routing E2E Tests (`routing.spec.ts`)
- **Theme Toggle**: 2 tests
  - Via sidebar switch with persistence across routes
  - Via settings form with persistence across reload

**Total Routing Theme Tests: 2**

## Detailed Test Cases

### 1. Initial State (3 tests)

#### 1.1 Display Settings Page with All Sections
**Objective**: Verify settings page renders with Details, Security, and Actions sections
**Setup**: Authenticated user, navigates to /dashboard/settings
**Expected**: All three main sections visible and accessible
**Test ID**: "should display settings page with all sections"

#### 1.2 Security Fields Initially Disabled
**Objective**: Verify all security fields are disabled at page load
**Setup**: Authenticated user, navigates to settings
**Expected**: username, email, password inputs all have `disabled="true"`, all pen icons visible, cancel button hidden
**Test ID**: "should have all security fields disabled initially"

#### 1.3 Form Inputs Accessible
**Objective**: Verify all form inputs have proper labels and are accessible
**Setup**: Authenticated user, navigates to settings
**Expected**: Name, Birthday, Theme toggle all visible with labels
**Test ID**: "should have accessible form inputs"

---

### 2. Details Form (18 tests)

#### 2.1 Successful Updates (6 tests)

**2.1.1 Update Name Only**
- User fills name field with "Updated Name"
- Clicks submit button
- Assert 204 No Content HTTP response
- Assert updated name displays in UI

**2.1.2 Update Birthday Only**
- User fills birthday field with "1995-05-15"
- Clicks submit button
- Assert 204 No Content HTTP response
- Assert updated birthday displays in UI

**2.1.3 Update Name and Birthday Together**
- User fills both name and birthday fields
- Clicks submit button once
- Assert 204 No Content HTTP response
- Assert both values display in UI

**2.1.4 Toggle Theme and Apply Instantly**
- User clicks theme toggle
- No update button appears
- body[data-testid="router"][data-dark] changes immediately
- body[data-dark] attribute also updates (MUI)
- No HTTP request sent

**2.1.5 Update Name, Birthday, and Toggle Theme**
- User fills name and birthday
- User clicks theme toggle
- Single HTTP submission covers name/birthday
- Theme applies instantly
- Both changes reflected in UI

**2.1.6 Update All Details Fields**
- User fills name, birthday, and toggles theme
- Single HTTP submission for name/birthday
- Theme applies independently
- All changes reflected in UI

#### 2.2 Form Validation (5 tests)

**2.2.1 Name Minimum Length**
- User enters "a" for name
- Attempts submission
- Assert error: "Name must be at least 2 characters"
- Form does not submit

**2.2.2 Name Maximum Length**
- User enters 31 characters for name
- Attempts submission
- Assert error: "Name must be at most 30 characters"
- Form does not submit

**2.2.3 Invalid Birthday Format**
- User enters "invalid-date" for birthday
- Attempts submission
- Assert error: "Invalid date"
- Form does not submit

**2.2.4 Birthday Too Early**
- User enters "1799-12-31" for birthday
- Attempts submission
- Assert error: "Birthday must be on or after 1800-01-01"
- Form does not submit

**2.2.5 Birthday in Future**
- User enters future date for birthday
- Attempts submission
- Assert error: "Birthday cannot be in the future"
- Form does not submit

#### 2.3 Theme Persistence (2 tests)

**2.3.1 Theme Persists Across Navigation**
- User toggles theme to dark
- User navigates to /dashboard/accounts
- User navigates back to settings
- Assert theme is still dark (body[data-dark]="true")
- Assert theme visible in all locations

**2.3.2 Theme Persists Across Page Reload**
- User toggles theme to dark
- User reloads page
- Assert theme is still dark
- Assert localStorage/Redux state persists

#### 2.4 Cancel Behavior (3 tests)

**2.4.1 Cancel Name Change**
- User fills name with new value
- User clicks cancel button
- Assert cancel button disappears
- Assert original name value shown
- Assert no form submission occurred

**2.4.2 Cancel Birthday Change**
- User fills birthday with new value
- User clicks cancel button
- Assert cancel button disappears
- Assert original birthday value shown
- Assert no form submission occurred

**2.4.3 Cancel Multiple Field Changes**
- User fills both name and birthday with new values
- User clicks cancel button
- Assert both original values shown
- Assert cancel button disappears
- Assert no form submission occurred

---

### 3. Security Form (30 tests)

#### 3.1 Successful Individual Updates (6 tests)

**3.1.1 Update Username Only**
- Setup: `requiresIsolation=true, markAsTestScoped=true`
- User clicks username pen icon
- Username input becomes enabled, pen disappears, cancel visible
- User enters new username
- User clicks submit button
- Assert 204 No Content
- Assert pen icon reappears, input disabled
- Assert other fields remain disabled

**3.1.2 Update Email Only**
- User clicks email pen icon
- Email input becomes enabled, pen disappears, cancel visible
- User enters new email
- User clicks submit button
- Assert 204 No Content
- Assert pen icon reappears, input disabled
- Assert other fields remain disabled

**3.1.3 Update Password with Valid Credentials**
- Setup: `requiresIsolation=true, markAsTestScoped=true`
- User clicks password pen icon
- All 3 password inputs appear and become enabled
- Password pen disappears, cancel visible
- User fills current, new, and verify password fields
- User clicks submit button
- Assert 204 No Content
- Assert all password inputs become hidden/disabled
- Assert pen icon reappears

**3.1.4 Password Field Visibility Toggle - Current**
- User enables password field
- Current password field initially masked (type="password")
- User clicks visibility toggle for current password
- Current password field becomes visible (type="text")
- User clicks toggle again
- Current password field becomes masked
- New and verify password fields unaffected

**3.1.5 Password Field Visibility Toggle - New**
- Same as above but for new password field
- Other fields unaffected

**3.1.6 Password Field Visibility Toggle - Verify**
- Same as above but for verify password field
- Other fields unaffected

#### 3.2 Multiple Fields Together (3 tests)

**3.2.1 Update Username and Email Together**
- User clicks username pen icon (enables username field)
- User clicks email pen icon while username still enabled
- Both inputs enabled, both pens hidden, single cancel button visible
- User enters new values for both
- User clicks single submit button
- Assert 204 No Content (one submission)
- Assert both inputs disabled, both pens visible
- Assert password remains disabled

**3.2.2 Update Username and Password Together**
- User clicks username pen icon
- User clicks password pen icon while username still enabled
- Username and all 3 password inputs enabled
- User enters new username and password values
- User clicks submit button
- Assert 204 No Content (one submission)
- Assert username and password disabled
- Assert email remains disabled

**3.2.3 Update Email and Password Together**
- User clicks email pen icon
- User clicks password pen icon while email still enabled
- Email and all 3 password inputs enabled
- User enters new email and password values
- User clicks submit button
- Assert 204 No Content (one submission)
- Assert email and password disabled
- Assert username remains disabled

#### 3.3 Update All Security Fields (1 test)

**3.3.1 Update All Three Fields**
- User clicks username pen icon
- User clicks email pen icon (username still enabled)
- User clicks password pen icon (both still enabled)
- All three input types enabled
- User enters new values for all three fields
- User enters current and new passwords
- User clicks single submit button
- Assert 204 No Content (one submission)
- Assert all inputs disabled
- Assert all pen icons visible
- Assert cancel button hidden

#### 3.4 Form Validation (6 tests)

**3.4.1 Username Minimum Length**
- User enables username field
- User enters "a" for username
- Attempts submission
- Assert error: "Username must be at least 2 characters"
- Edit mode remains open

**3.4.2 Email Format Validation**
- User enables email field
- User enters "invalid-email" for email
- Attempts submission
- Assert error: "Invalid email address"
- Edit mode remains open

**3.4.3 Password Mismatch**
- User enables password field
- User enters current password correctly
- User enters "NewPassword1!" for new password
- User enters "DifferentPassword1!" for verify password
- Attempts submission
- Assert error: "Passwords don't match"
- Edit mode remains open

**3.4.4 New Password Same as Old**
- User enables password field
- User enters "Password1!" for current password
- User enters same "Password1!" for new and verify
- Attempts submission
- Assert error: "New password must not match the old password"
- Edit mode remains open

**3.4.5 Invalid Current Password**
- User enables password field
- User enters "WrongPassword1!" for current password
- User enters valid new and verify passwords
- Attempts submission
- Assert error: "Invalid credentials"
- Edit mode remains open

**3.4.6 Current Password Required**
- User enables password field
- User enters new and verify passwords only (no current password)
- Attempts submission
- Assert error: "Current password is required to set a new password"
- Edit mode remains open

#### 3.5 Cancel Behavior (4 tests)

**3.5.1 Cancel Username Change**
- Store original username value
- User enables username field
- User enters new username
- User clicks cancel button
- Assert cancel button disappears
- Assert original username value shown
- Assert username input disabled
- Assert pen icon visible
- Assert other fields remain disabled

**3.5.2 Cancel Email Change**
- Store original email value
- User enables email field
- User enters new email
- User clicks cancel button
- Assert cancel button disappears
- Assert original email value shown
- Assert email input disabled
- Assert pen icon visible

**3.5.3 Cancel Password Change**
- User enables password field
- All 3 password inputs visible
- User enters password values
- User clicks cancel button
- Assert cancel button disappears
- Assert all password inputs hidden/disabled
- Assert password pen icon visible
- Assert other fields remain disabled

**3.5.4 Cancel All Field Changes**
- Store original values for all fields
- User enables all three fields
- User enters new values for all
- User clicks single cancel button
- Assert cancel button disappears
- Assert all original values shown
- Assert all inputs disabled
- Assert all pen icons visible

---

### 4. Cross-Section Updates (1 test)

**4.1 Update Details and Security Together**
- Setup: `requiresIsolation=true, markAsTestScoped=true`
- User fills name field with new value
- User clicks username pen icon
- User fills username field with new value
- Both sections have pending changes
- User clicks submit button (single shared button)
- Assert 204 No Content (one HTTP submission)
- Assert both name and username updated in UI
- Assert all inputs disabled
- Assert all pen icons visible

---

### 5. Actions (4 tests)

#### 5.1 Logout (2 tests)

**5.1.1 Logout with Confirmation**
- User clicks logout button
- Confirmation dialog appears
- Assert dialog text: "Are you sure you want to logout?"
- User clicks confirm button
- Assert redirect to /login
- Assert user logged out successfully

**5.1.2 Cancel Logout**
- User clicks logout button
- Confirmation dialog appears
- User clicks cancel button
- Dialog closes
- Assert still on settings page
- Assert still authenticated

#### 5.2 Delete Account (2 tests)

**5.2.1 Delete Account with Confirmation**
- Setup: `requiresIsolation=true, markAsTestScoped=true`
- User clicks delete account button
- Confirmation dialog appears
- Assert dialog text: "Are you sure you want to delete your account?"
- User clicks confirm button
- Assert 204 No Content HTTP response
- Assert redirect to home page (/)
- Assert user account deleted
- Verify: Can create new user with same username

**5.2.2 Cancel Delete**
- Setup: `requiresIsolation=true, markAsTestScoped=true`
- User clicks delete account button
- Confirmation dialog appears
- User clicks cancel button
- Dialog closes
- Assert still on settings page
- Assert account still exists

#### 5.3 Export Account (1 test)

**5.3.1 Export Account Data**
- Create 2 test accounts:
  - Account 1: name="Checking Account", balance=5000, type="Checking"
  - Account 2: name="Savings Account", balance=3000, type="Savings"
- User clicks export button
- File download triggered (capital_export.json)
- Parse JSON file
- Assert JSON structure:
  - `timestamp`: ISO string format
  - `settings`: object with user details
  - `accounts`: array with 2 items
  - `budgets`: object with Income/Expenses
  - `transactions`: array (may be empty)
- Verify accounts contain:
  - Account 1: name="Checking Account", balance=5000
  - Account 2: name="Savings Account", balance=3000
- Assert `account_order` field NOT in accounts

---

### 6. Theme Toggle in Routing (2 tests)

#### 6.1 Theme Persistence Across Routes via Sidebar

**6.1.1 Toggle Theme via Sidebar Switch**
- Setup: Authenticated user on dashboard
- Get current theme from body[data-dark]
- User clicks sidebar theme switch
- Assert body[data-dark] changes
- Navigate to /dashboard/accounts
- Assert theme persists
- Navigate to /dashboard/budgets
- Assert theme persists
- Navigate back to /dashboard
- Assert theme still persists

#### 6.2 Theme Persistence Across Reload via Settings

**6.2.1 Toggle Theme via Settings Form**
- Setup: Authenticated user, navigates to /dashboard/settings
- Get current theme from body[data-dark]
- User clicks theme toggle
- Assert body[data-dark] changes immediately
- Page reloads
- Assert theme persists after reload
- Assert MUI theme provider respects the change

---

## Test Data Setup Strategy

### User Isolation Levels

| Test Category | Isolation | isTestScoped | Notes |
|---|---|---|---|
| Details Form | `false` | N/A | Can reuse users |
| Email Update | `false` | N/A | Can reuse users |
| Username Update | `true` | `true` | Fresh user, never reused |
| Password Update | `true` | `true` | Fresh user, never reused |
| Cross-Section | `true` | `true` | Fresh user, never reused |
| Delete Account | `true` | `true` | Fresh user, never reused |
| Logout | `false` | N/A | Can reuse users |
| Export | `false` | N/A | Can reuse users |
| Theme Routing | `false` | N/A | Can reuse users |

### Registry Management

**isTestScoped Flag Purpose**: Prevent parallel test contamination for tests that:
- Modify username (unique constraint)
- Modify password (affects login)
- Delete account (user no longer exists)

**Implementation**:
- Mark users with `isTestScoped=true` in registry
- Skip these users in `setupAssignedUser()` when searching for reusable users
- Never add `isTestScoped` users to `assignedRegistry`
- Mutex ensures thread-safe access during setup

---

## Theme Verification Strategy

### Primary Verification Method
```typescript
await expect(page.getByTestId("router")).toHaveAttribute("data-dark", "true");
```

### Fallback Verification Method
```typescript
await expect(page.locator("body")).toHaveAttribute("data-dark", "true");
```

### Why Both Methods?
- Primary: Uses `data-testid="router"` added to router.tsx wrapper
- Fallback: Uses MUI's `body[data-dark]` attribute set by theme provider
- Together: Ensures theme changes reliably propagate through MUI ThemeProvider

---

## HTTP Response Expectations

| Operation | Method | Endpoint | Success Status | Error Status |
|---|---|---|---|---|
| Update Name/Birthday | PUT | /api/v1/users | 204 No Content | 400 Bad Request |
| Update Email | PUT | /api/v1/users | 204 No Content | 409 Conflict |
| Update Username | PUT | /api/v1/users | 204 No Content | 409 Conflict |
| Update Password | PUT | /api/v1/users | 204 No Content | 400/409 |
| Delete Account | DELETE | /api/v1/users | 204 No Content | 404 Not Found |
| Logout | POST | /api/v1/authentication/logout | 204 No Content | - |
| Theme Toggle | N/A | N/A | N/A | N/A (Client-side) |

---

## Validation Error Messages

### Details Form
- Name too short: "Name must be at least 2 characters"
- Name too long: "Name must be at most 30 characters"
- Invalid birthday: "Invalid date"
- Birthday too early: "Birthday must be on or after 1800-01-01"
- Birthday in future: "Birthday cannot be in the future"

### Security Form - Username/Email
- Username too short: "Username must be at least 2 characters"
- Email invalid format: "Invalid email address"
- Username exists: "Username already exists" (409)
- Email exists: "Email already exists" (409)

### Security Form - Password
- Current password required: "Current password is required to set a new password"
- New password required: "New password is required to set a new password"
- Verify password required: "Passwords don't match"
- Passwords don't match: "Passwords don't match"
- New = old password: "New password must not match the old password"
- Invalid current password: "Invalid credentials"

---

## Test Execution Order & Parallelization

**Recommendation**: Run in parallel groups with 4 workers

**Group 1 - Reusable Users** (parallel safe):
- Initial State tests
- Details Form tests
- Email Update tests
- Logout tests
- Export tests
- Theme Routing tests

**Group 2 - Single Test Users** (sequential or isolated):
- Username Update tests
- Password Update tests
- Cross-Section Update tests
- Delete Account tests

---

## Coverage Metrics

### Component Coverage
- **Settings.tsx**: Entry point, renders Details, Security, Actions
- **Details.tsx**: Name, Birthday, Theme inputs
- **Security.tsx**: Username, Email, Password fields with pen icons
- **Actions.tsx**: Container for Logout, Delete, Export
- **Export.tsx**: JSON generation and download
- **Delete.tsx**: Deletion dialog and API call
- **Logout.tsx**: Logout dialog and API call

### Expected Coverage
- **Details Component**: ~95% (form updates, validation, theme toggle, cancel)
- **Security Component**: ~95% (field toggles, validation, edit mode, cancel)
- **Actions Component**: ~95% (logout, delete, export flows)
- **Overall Settings Page**: ~93%

---

## Flakiness Prevention Strategies

### 1. Explicit Waits
- Wait for HTTP responses before assertions
- Wait for theme attribute changes after toggle
- Use `page.waitForResponse()` for API calls
- Use `page.waitForTimeout()` only for guaranteed delays (100ms)

### 2. Mutation Prevention
- Mark sensitive users with `isTestScoped=true`
- Use mutex in `setupAssignedUser()` for thread safety
- Never assign `isTestScoped` users to `assignedRegistry`

### 3. State Management
- Clear Redux state between tests (via page reload if needed)
- Verify cancel reverts changes completely
- Verify form submissions don't partially succeed

### 4. Element Visibility
- Wait for pen icons to appear after successful submission
- Wait for cancel button to disappear after clicking
- Use `toBeVisible()` with timeout options

---

## Test Summary Table

| Test Suite | Total Tests | Critical | High | Medium |
|---|---|---|---|---|
| Settings E2E | 59 | 15 | 25 | 19 |
| Routing Theme | 2 | 2 | - | - |
| **Total** | **61** | **17** | **25** | **19** |

### Critical Tests (Must Pass)
1. Update name/birthday/theme
2. Cancel Details changes
3. Enable/disable security fields
4. Update security fields individually and together
5. Cancel security changes
6. Logout and Delete confirmations
7. Theme persistence across navigation
8. Export JSON validation

---

## Success Criteria

- [ ] All 61 tests pass
- [ ] No flaky tests (verified with 3+ consecutive runs)
- [ ] >90% code coverage for settings components
- [ ] All validation error messages match specification
- [ ] Theme changes apply instantly without HTTP request
- [ ] Cancel operations fully revert changes
- [ ] Logout/Delete show confirmation dialogs
- [ ] Registry properly manages `isTestScoped` flag
- [ ] Export JSON has required structure and fields
- [ ] Tests follow accounts.spec.ts modularity patterns

---

## Implementation Notes

### Router.tsx Changes
- Wrapped ThemeProvider in `<div>` with `data-testid="router"` and `data-dark` attribute
- Attribute updates in real-time as Redux theme state changes
- Provides reliable theme verification across tests

### Settings.ts Helpers
- 25+ helper functions organized by form section
- Each helper includes comprehensive JSDoc comments
- Helpers handle validation errors, HTTP responses, and state changes
- Type-safe with TypeScript interfaces for form data

### User Management Updates
- Updated `CreatedUserRecord` type in fixtures to include optional `isTestScoped` property
- `isTestScoped` flag (defaults to false implicitly) prevents reuse in parallel tests
- Mutex ensures thread-safe user assignment
- Simplified implementation without TS intersection types

### Settings.spec.ts Structure
- 59 organized tests across 7 main describe blocks
- Tests follow pattern: Setup → Action → Assert → Cleanup
- Helper functions abstract complex interactions
- Clear test names describe expected behavior

---

## Future Enhancements

1. **Performance Metrics**: Add timing assertions for form submissions
2. **Accessibility**: Add ARIA role and label validation tests
3. **Mobile Testing**: Extend tests for responsive design
4. **Internationalization**: Test with different locale settings
5. **Error Recovery**: Test network failure scenarios
6. **Concurrent Operations**: Test simultaneous form submissions

---

## References

- **Settings Components**: `client/app/components/dashboard/settings/`
- **Helper Functions**: `client/tests/utils/dashboard/settings.ts`
- **Existing Pattern**: `client/tests/dashboard/accounts.spec.ts`
- **API Endpoints**: Server routes at `/api/v1/users` and `/api/v1/authentication/`

---

**Document Version**: 1.0
**Last Updated**: [Implementation Date]
**Owner**: QA/Test Engineering Team
