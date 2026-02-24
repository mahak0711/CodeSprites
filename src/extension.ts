import * as vscode from 'vscode';
import { SpritePanel } from './SpritePanel';
import { TerminalTracker } from './TerminalTracker';

let spritePanel: SpritePanel | undefined;
let terminalTracker: TerminalTracker | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const openCmd = vscode.commands.registerCommand('codesprites.open', () => {
    if (spritePanel) {
      spritePanel.reveal();
    } else {
      spritePanel = new SpritePanel(context);
      spritePanel.onDidDispose(() => {
        spritePanel = undefined;
      });

      // Attach tracker to panel
      if (terminalTracker) {
        terminalTracker.setPanel(spritePanel);
      }

      // Click-to-focus: switch terminal when sprite is clicked
      spritePanel.onDidReceiveMessage((msg: { type: string; name?: string }) => {
        if (msg.type === 'focusTerminal' && msg.name && terminalTracker) {
          terminalTracker.focusTerminal(msg.name);
        }
      });

      // Restore persisted sprites
      const saved = context.globalState.get<string[]>('codesprites.activeNames', []);
      for (const name of saved) {
        spritePanel.postMessage({ type: 'spawnSprite', name, active: false });
      }
    }
  });

  const resetCmd = vscode.commands.registerCommand('codesprites.reset', () => {
    context.globalState.update('codesprites.activeNames', []);
    if (spritePanel) {
      spritePanel.postMessage({ type: 'resetAll' });
    }
    vscode.window.showInformationMessage('CodeSprites: All sprites cleared.');
  });

  terminalTracker = new TerminalTracker(context, spritePanel);

  context.subscriptions.push(openCmd, resetCmd, terminalTracker);
}

export function deactivate(): void {
  spritePanel = undefined;
  terminalTracker = undefined;
}
