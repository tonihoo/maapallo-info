#!/bin/bash
# Auto-fix Python linting issues in the server folder

echo "🔧 Fixing Python linting issues..."

# Navigate to server directory
cd /Users/toni/git/maapallo-info/server

echo "📦 Installing Python formatting tools in Docker container..."
docker compose exec server pip install black isort flake8 autoflake

echo "🧹 Removing unused imports..."
docker compose exec server autoflake --in-place --remove-unused-variables --remove-all-unused-imports --recursive .

echo "📏 Sorting imports..."
docker compose exec server isort . --profile black

echo "✨ Formatting code with Black..."
docker compose exec server black . --line-length 88

echo "✅ All automatic fixes applied!"
echo "💡 Note: Import resolution errors are normal when VS Code isn't using Docker environment"
