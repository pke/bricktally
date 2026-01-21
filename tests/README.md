# BrickTally Test Suite

Comprehensive test suite for BrickTally using Playwright (E2E) and Vitest (unit tests).

## Setup

Install dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install
```

## Running Tests

### End-to-End Tests (Playwright)

Run all E2E tests:

```bash
npm test
```

Run tests in headed mode (see browser):

```bash
npm run test:headed
```

Run tests with UI mode (interactive):

```bash
npm run test:ui
```

Run specific test file:

```bash
npx playwright test tests/e2e/progress-calculation.spec.js
```

Run specific test by name:

```bash
npx playwright test -g "1.4: Rounding edge case"
```

### Unit Tests (Vitest)

Run unit tests:

```bash
npm run test:unit
```

Run unit tests with UI:

```bash
npm run test:unit:ui
```

### Run All Tests

```bash
npm run test:all
```

## Test Structure

```
tests/
├── e2e/                                    # End-to-end tests
│   ├── progress-calculation.spec.js       # Progress & spare parts logic
│   ├── ui-interactions.spec.js            # UI controls & filters
│   ├── completion-persistence.spec.js     # Completion & localStorage
│   └── exports-badges.spec.js             # Exports & badge generation
├── fixtures/
│   └── mock-sets.js                       # Mock test data
└── helpers/
    └── test-utils.js                      # Test helper functions
```

## Test Categories

### Category 1-3: Progress Calculation
- Parts only progress
- Progress with minifigures
- Spare parts substitution logic
- Rounding (Math.floor)
- Extras only shown when complete

### Category 4-5: Section Headers & Visibility
- Section visibility (parts, minifigs, spares)
- Header checkmarks when complete
- Hide complete toggle

### Category 6: Completion & Celebration
- Fireworks trigger on 100%
- Works with parts, minifigs, and spares
- Only triggers once
- No trigger on decrement

### Category 7: Count Controls
- Decrement button visibility
- Increment to completion
- Fill quantity click
- Button states

### Category 8: Persistence
- localStorage save/restore
- State restoration on reload
- Multiple sets in history
- Clear on reset

### Category 9: Exports
- BrickLink XML export
- Pick a Brick CSV export
- Text export
- Spare parts consideration
- Minifigs in exports

### Category 10: Badge Generation
- Progress calculation in badge
- Name truncation
- Color based on completion
- Attribution

### Category 11: Color Filters
- Single/multiple filters
- Clear filters
- Doesn't affect minifigs

### Category 12: Lightbox
- Open/close
- Part and minifig images

## Mock Test Sets

The test suite uses synthetic LEGO® sets designed for specific scenarios:

- **TEST-001**: Basic parts only (no minifigs, no spares) - 10 parts
- **TEST-002**: Set with minifigures - 10 parts + 2 minifigs
- **TEST-003**: Set with spare parts - 10 parts + 3 spares
- **TEST-004**: Complete test set - parts + minifigs + spares
- **TEST-005**: Large set for rounding tests - 294 parts
- **TEST-006**: Empty set (edge case) - 0 parts
- **TEST-007**: Multiple colors for filter testing - 15 parts in 3 colors

## Writing New Tests

### E2E Test Template

```javascript
import { test, expect } from '@playwright/test';
import { mockSets, convertMockSetToAPIResponse, convertPartsToAPIResponse, convertMinifogsToAPIResponse } from '../fixtures/mock-sets.js';
import { mockAPIForSet, loadTestSet, getProgressState } from '../helpers/test-utils.js';

test('Your test name', async ({ page }) => {
  await page.goto('/');

  const mockSet = mockSets['TEST-001'];
  await mockAPIForSet(
    page,
    convertMockSetToAPIResponse(mockSet),
    convertPartsToAPIResponse(mockSet.parts),
    convertMinifogsToAPIResponse(mockSet.minifigs)
  );

  await loadTestSet(page, 'TEST-001');

  // Your test logic here

  const progress = await getProgressState(page);
  expect(progress.percentage).toBe('100%');
});
```

## Debugging Tests

### View test report:

```bash
npx playwright show-report
```

### Debug a specific test:

```bash
npx playwright test --debug -g "test name"
```

### Generate code with Playwright Codegen:

```bash
npx playwright codegen http://localhost:8080
```

## CI/CD

Tests are configured to run in CI environments with:
- Retry on failure (2 retries)
- Serial execution
- Automatic test reports

## Browser Support

Tests run on:
- Chromium
- Firefox
- WebKit (Safari)
- Mobile Chrome
- Mobile Safari

## Notes

- Tests use a local development server on port 8080
- Mock API responses are used to avoid external dependencies
- localStorage is cleared before each test
- Screenshots are captured on failure
- Traces are recorded on first retry
