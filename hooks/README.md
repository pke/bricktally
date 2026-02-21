# Git Hooks

This directory contains git hooks for the BrickTally project.

## Pre-commit Hook

The `pre-commit` hook automatically increments the service worker cache version when cached assets are modified.

### What it does

When you commit changes to any of these files:

- `index.html`
- `manifest.json`
- Files in `assets/`
- Files in `js/`

The hook will:

1. Detect the changes
2. Update `CACHE_VERSION` in `sw.js` to a timestamp (e.g., `v20260120-143022`)
3. Stage the updated `sw.js` automatically
4. Include it in your commit

This ensures users always get fresh cached content when you deploy updates.

### Installation

Run the install script:

```bash
./hooks/install.sh
```

This creates a symlink from `.git/hooks/pre-commit` to `hooks/pre-commit`.

### Manual Installation

If the install script doesn't work, you can manually create the symlink:

```bash
ln -sf ../../hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Skipping the Hook

If you need to commit without triggering the hook (not recommended for production):

```bash
git commit --no-verify
```

### Uninstalling

Remove the symlink:

```bash
rm .git/hooks/pre-commit
```
