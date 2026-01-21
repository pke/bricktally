# Testing BrickTally

Quick start guide for running tests.

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

## Quick Commands

### Run all E2E tests
```bash
npm test
```

### Run tests and see the browser
```bash
npm run test:headed
```

### Open interactive test UI
```bash
npm run test:ui
```

### Run a specific test file
```bash
npx playwright test tests/e2e/progress-calculation.spec.js
```

### Run a specific test by name
```bash
npx playwright test -g "Rounding edge case"
```

### Debug a failing test
```bash
npm run test:debug
```

### View test report
```bash
npm run test:report
```

## Test Development

### Start the dev server
```bash
npm run serve
```
Then open http://localhost:8080 in your browser.

### Generate test code (Playwright Codegen)
```bash
npx playwright codegen http://localhost:8080
```
This opens a browser where you can interact with the app and Playwright will generate test code for you.

## Common Test Scenarios

All test scenarios are organized by category:

- **Progress Calculation** - Tests the core progress logic with parts, minifigs, and spares
- **UI Interactions** - Tests buttons, filters, and user controls
- **Completion** - Tests fireworks animation and completion detection
- **Persistence** - Tests localStorage save/restore
- **Exports** - Tests BrickLink, Pick a Brick, and text exports
- **Badges** - Tests badge generation and formatting

See `tests/README.md` for full documentation.

## Test Structure

```
tests/
├── e2e/                          # End-to-end tests (Playwright)
│   ├── progress-calculation.spec.js
│   ├── ui-interactions.spec.js
│   ├── completion-persistence.spec.js
│   └── exports-badges.spec.js
├── fixtures/
│   └── mock-sets.js              # Mock LEGO® sets
├── helpers/
│   └── test-utils.js             # Helper functions
└── README.md                     # Full test documentation
```

## Troubleshooting

### Tests failing locally?

1. Make sure the dev server is running on port 8080
2. Clear browser cache and localStorage
3. Check that all dependencies are installed
4. Try running with `--headed` to see what's happening

### Slow tests?

- Run only the tests you need: `npx playwright test tests/e2e/progress-calculation.spec.js`
- Use `--workers=1` to run tests serially
- Check system resources (CPU, memory)

### Need help?

- Check the full documentation in `tests/README.md`
- View Playwright docs: https://playwright.dev
- View Vitest docs: https://vitest.dev
