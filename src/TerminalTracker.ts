import * as vscode from 'vscode';
import { SpritePanel } from './SpritePanel';

export class TerminalTracker implements vscode.Disposable {
  private _panel: SpritePanel | undefined;
  private _disposables: vscode.Disposable[] = [];
  private _context: vscode.ExtensionContext;
  private _terminalNames = new WeakMap<vscode.Terminal, string>();
  private _allNames = new Set<string>();
  private _nameToTerminal = new Map<string, vscode.Terminal>();
  private _nextId = 1;

  constructor(context: vscode.ExtensionContext, panel?: SpritePanel) {
    this._context = context;
    this._panel = panel;

    // Track terminals that already exist at activation
    for (const t of vscode.window.terminals) {
      this._registerTerminal(t);
    }

    this._disposables.push(
      vscode.window.onDidOpenTerminal((t) => {
        this._registerTerminal(t);
        this._spawnSprite(t);
      }),
      vscode.window.onDidCloseTerminal((t) => {
        this._despawnSprite(t);
      }),
      vscode.window.onDidChangeActiveTerminal((t) => {
        if (t) {
          const name = this._getSpriteName(t);
          this._panel?.postMessage({ type: 'activateSprite', name });
        }
      }),
      // Detect terminal activity via onDidWriteTerminalData (proposed API fallback: use shell integration)
      vscode.window.onDidStartTerminalShellExecution?.(() => {
        const active = vscode.window.activeTerminal;
        if (active) {
          const name = this._getSpriteName(active);
          this._panel?.postMessage({ type: 'spriteActivity', name, text: 'Running...' });
        }
      }) ?? { dispose: () => {} },
      vscode.window.onDidEndTerminalShellExecution?.(() => {
        const active = vscode.window.activeTerminal;
        if (active) {
          const name = this._getSpriteName(active);
          this._panel?.postMessage({ type: 'spriteIdle', name });
        }
      }) ?? { dispose: () => {} }
    );
  }

  public setPanel(panel: SpritePanel): void {
    this._panel = panel;

    // Spawn sprites for all existing terminals
    for (const t of vscode.window.terminals) {
      this._registerTerminal(t);
      this._spawnSprite(t);
    }
  }

  private _registerTerminal(terminal: vscode.Terminal): void {
    if (!this._terminalNames.has(terminal)) {
      const name = `sprite-${this._nextId++}`;
      this._terminalNames.set(terminal, name);
      this._allNames.add(name);
      this._nameToTerminal.set(name, terminal);
    }
  }

  private _getSpriteName(terminal: vscode.Terminal): string {
    return this._terminalNames.get(terminal) ?? terminal.name;
  }

  private _spawnSprite(terminal: vscode.Terminal): void {
    if (!this._panel) { return; }
    const name = this._getSpriteName(terminal);
    const label = terminal.name || name;
    this._panel.postMessage({ type: 'spawnSprite', name, label, active: true });
    this._persistNames();
  }

  private _despawnSprite(terminal: vscode.Terminal): void {
    if (!this._panel) { return; }
    const name = this._getSpriteName(terminal);
    this._allNames.delete(name);
    this._nameToTerminal.delete(name);
    this._panel.postMessage({ type: 'despawnSprite', name });
    this._persistNames();
  }

  private _persistNames(): void {
    const names = Array.from(this._allNames);
    this._context.globalState.update('codesprites.activeNames', names);
    this._panel?.postMessage({ type: 'persistLayout', names });
  }

  public focusTerminal(name: string): void {
    const terminal = this._nameToTerminal.get(name);
    if (terminal) {
      terminal.show();
    }
  }

  public dispose(): void {
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
  }
}
