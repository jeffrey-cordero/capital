Budget Service Unit Tests Implementation Plan

 Overview

 Implement 100% coverage unit tests for budgetsService.ts following the established patterns from accountsService.test.ts, authenticationService.test.ts, and
 userService.test.ts.

 Phase 1: Create Budget Mock Utilities (types/mocks/budgets.ts)

 Pattern: Follow accounts/user mocks exactly with factory functions and constants

 Mock Constants

 - TEST_BUDGET_CATEGORY_ID - Single UUID for basic tests
 - TEST_BUDGET_CATEGORY_IDS - Array of 3 UUIDs for ordering tests
 - VALID_BUDGET_CATEGORY - Base category object (Income/Expenses type, name, order)
 - VALID_BUDGET - Base budget object (goal, year, month, category_id)
 - BUDGET_CACHE_DURATION constant

 Factory Functions

 1. createValidBudgetCategory(overrides?) - Single category with defaults
 2. createMockBudgetCategories(count?, type?) - Array of categories (Income/Expenses)
 3. createValidBudget(overrides?) - Single budget entry
 4. createMockBudgets(count?) - Array of budget entries
 5. createMockOrganizedBudgets(incomeCategories?, expenseCategories?) - Complete hierarchical structure
 6. createBudgetWithValidation(...) - Category + initial budget pair

 Export Updates

 Update types/package.json exports to include: "./mocks/budgets": "./build/mocks/budgets.js"

 ---
 Phase 2: Server Test Utilities (keep localized)

 Location: server/tests/services/budgetsService.test.ts (local helper functions)

 Local Assertion Helpers

 - assertBudgetValidationErrorResponse() - Validates error + no repo/cache calls
 - assertBudgetCacheHitBehavior() - Cache read only, no repository call
 - assertBudgetCacheMissBehavior() - Cache miss → repo call → cache write
 - assertBudgetOperationSuccess() - Repository call + cache invalidation
 - assertCategoryOrderingBehavior() - Bulk update assertions

 ---
 Phase 3: Comprehensive Test Suite (budgetsService.test.ts)

 Test Coverage by Function (6 service functions)

 1. fetchBudgets()

 - ✓ Cache hit: returns cached data
 - ✓ Cache miss: fetches from repo, caches result
 - ✓ Repository error handling

 2. createBudgetCategory()

 - ✓ Valid category creation with all fields
 - ✓ Validation: budget schema (goal, year, month, category_id)
 - ✓ Validation: category schema (type, name, order)
 - ✓ Edge cases: future month/year prevention
 - ✓ Edge cases: invalid category type (not Income/Expenses)
 - ✓ Edge cases: reserved names (income, expenses)
 - ✓ Edge cases: name length (1-30 chars)
 - ✓ Edge cases: category_order negative/too large
 - ✓ Edge cases: goal amount validation (0 to max)
 - ✓ Cache invalidation on success
 - ✓ Repository error handling

 3. updateCategory()

 - ✓ Valid update with partial data
 - ✓ Validation: missing budget_category_id
 - ✓ Validation: invalid category schema fields
 - ✓ Validation: null name rejection (separate from missing)
 - ✓ Validation: reserved names rejection
 - ✓ Not found: category doesn't exist
 - ✓ Cache invalidation on success
 - ✓ No cache invalidation on not found
 - ✓ Repository error handling

 4. updateCategoryOrdering()

 - ✓ Valid ordering update (3+ categories)
 - ✓ Validation: non-array input
 - ✓ Validation: empty array
 - ✓ Validation: invalid UUID in array
 - ✓ Validation: multiple invalid UUIDs with aggregated error
 - ✓ Validation: duplicate UUIDs (if applicable)
 - ✓ Not found: no categories to update
 - ✓ Cache invalidation on success
 - ✓ No cache invalidation on not found
 - ✓ Repository error handling

 5. createBudget()

 - ✓ Valid budget creation
 - ✓ Validation: all budget schema rules (goal, year, month, category_id)
 - ✓ Validation: future month prevention
 - ✓ Not found: category doesn't exist/not owned by user
 - ✓ Cache invalidation on success
 - ✓ No cache invalidation on not found
 - ✓ Repository error handling

 6. updateBudget()

 - ✓ Valid budget update
 - ✓ Validation: all budget schema rules
 - ✓ Validation: future month prevention
 - ✓ Not found: budget doesn't exist
 - ✓ Cache invalidation on success
 - ✓ No cache invalidation on not found
 - ✓ Repository error handling

 7. deleteCategory()

 - ✓ Valid category deletion
 - ✓ Validation: missing category_id
 - ✓ Not found: category doesn't exist
 - ✓ Cache invalidation on success
 - ✓ No cache invalidation on not found
 - ✓ Repository error handling

 ---
 Phase 4: Test Structure Details

 Setup (beforeEach)

 - Clear all mocks
 - Import redis, budgetsRepository
 - Arrange default Redis cache behavior
 - Cache key constant: `budgets:${userId}`
 - BUDGET_CACHE_DURATION import

 Test Organization

 - Organized by service function (7 describe blocks)
 - Parameterized tests for validation rule variations (e.g., multiple invalid UUIDs)
 - Helper assertions for DRY principle (local to file)
 - Consistent naming: should [action] [condition]

 Mock Patterns

 - arrangeMockRepositorySuccess() - From existing utils
 - arrangeMockRepositoryError() - From existing utils
 - arrangeMockCacheHit/Miss() - From existing utils
 - Local: assertBudgetCacheHitBehavior(), etc.

 ---
 Implementation Order

 1. Create types/mocks/budgets.ts with all factory functions
 2. Update types/package.json exports
 3. Create server/tests/services/budgetsService.test.ts with:
   - Mock imports and setup
   - Local helper assertions
   - All 7 describe blocks with comprehensive tests
   - ~300-350 lines of test code
 4. Ensure 100% coverage of budgetsService.ts (all branches)

 ---
 Code Quality Standards (Per CLAUDE.md)

 ✓ Modularity: Reusable mocks & local assertion helpers
 ✓ DRY: Helpers prevent test duplication
 ✓ Consistency: Same patterns as existing services
 ✓ JSDoc: Clear comments on all functions & complex assertions
 ✓ Type Safety: No 'any' - proper interfaces from budgets.ts types
 ✓ Coverage: 100% code coverage target
 ✓ Testability: Service layer designed for testing