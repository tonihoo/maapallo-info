#!/bin/bash
# Auto-fix Python linting issues in the server folder

echo "🔧 Fixing Python linting issues..."

# We're already in server directory
echo "📦 Installing Python formatting tools in Docker container..."
docker compose -f ../docker-compose.yml exec server pip install black isort flake8 autoflake

echo "🧹 Removing unused imports..."
docker compose -f ../docker-compose.yml exec server autoflake --in-place --remove-unused-variables --remove-all-unused-imports --recursive .

echo "📏 Sorting imports..."
docker compose -f ../docker-compose.yml exec server isort . --profile black

echo "✨ Formatting code with Black..."
docker compose -f ../docker-compose.yml exec server black . --line-length 88

echo "✅ All automatic fixes applied!"
echo "💡 Note: Import resolution errors are normal when VS Code isn't using Docker environment"
