# CodeSprites 🎮

Visualize your terminal sessions as animated pixel characters inside VS Code.

![CodeSprites](https://img.shields.io/badge/VS%20Code-Extension-blue)

## Features

- **Live Pixel Characters** — Each terminal session spawns an animated sprite on a canvas.
- **Idle & Active Animations** — Sprites walk around when idle and animate when their terminal is active.
- **Speech Bubbles** — Activity in a terminal triggers speech bubbles on the corresponding sprite.
- **Persistent Layout** — Sprite state is saved across sessions via `globalState`.
- **Configurable** — Control max sprites, movement speed, and bubble visibility.

## Usage

1. Open the Command Palette (`Ctrl+Shift+P`)
2. Run **CodeSprites: Open Sprite Panel**
3. Open terminal sessions — each one spawns a new character
4. Watch them walk, idle, and react to terminal activity

## Configuration

| Setting | Default | Description |
|---|---|---|
| `codesprites.maxSprites` | `12` | Maximum number of sprites displayed |
| `codesprites.spriteSpeed` | `1.0` | Movement speed multiplier (0.2–3.0) |
| `codesprites.showBubbles` | `true` | Show speech bubbles on activity |

## Commands

| Command | Description |
|---|---|
| `CodeSprites: Open Sprite Panel` | Opens the sprite visualization panel |
| `CodeSprites: Reset All Sprites` | Clears all sprites and persisted state |

## Development

```bash
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

## Packaging & Publishing

```bash
npm install -g @vscode/vsce
vsce package          # Creates .vsix file
vsce publish          # Publishes to VS Code Marketplace
```

## License

MIT
