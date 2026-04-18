#!/bin/bash
# qmd skill installer for vyasa-u-code

echo "Installing qmd skill..."

# Check for bun
if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
fi

# Install qmd
echo "Installing qmd..."
bun install -g https://github.com/tobi/qmd

# Add to PATH if needed
export PATH="$HOME/.bun/bin:$PATH"

echo "✅ qmd installed!"
echo ""
echo "Setup your notes collection:"
echo "  qmd collection add /path/to/your/notes --name mynotes"
echo ""
echo "Search your notes:"
echo "  qmd search 'your query'"
