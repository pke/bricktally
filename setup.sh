#!/bin/bash

# BrickTally Setup Script
# Run this after cloning the repository

echo "Setting up BrickTally..."
echo ""

# Install git hooks
if [ -f "hooks/install.sh" ]; then
  ./hooks/install.sh
else
  echo "Warning: hooks/install.sh not found"
fi

echo ""
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'vercel dev' to start development server"
echo "  2. Open http://localhost:3000"
