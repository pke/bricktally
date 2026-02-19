#!/bin/bash

# Install git hooks from the hooks directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

if [ ! -d "$GIT_HOOKS_DIR" ]; then
  echo "Error: Not in a git repository"
  exit 1
fi

echo "Installing git hooks..."

# Install pre-commit hook
if [ -f "$SCRIPT_DIR/pre-commit" ]; then
  ln -sf "$SCRIPT_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
  chmod +x "$GIT_HOOKS_DIR/pre-commit"
  echo "✓ Installed pre-commit hook"
else
  echo "✗ pre-commit hook not found"
fi

# Install post-commit hook (version bumping)
if [ -f "$SCRIPT_DIR/post-commit" ]; then
  ln -sf "$SCRIPT_DIR/post-commit" "$GIT_HOOKS_DIR/post-commit"
  chmod +x "$GIT_HOOKS_DIR/post-commit"
  echo "✓ Installed post-commit hook"
else
  echo "✗ post-commit hook not found"
fi

echo ""
echo "Git hooks installed successfully!"
echo "The cache version in sw.js will now auto-increment on commits that modify cached assets."
echo "The package version will auto-bump based on conventional commit messages."
