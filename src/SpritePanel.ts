import * as vscode from 'vscode';

import { getNonce } from './util';

export class SpritePanel {
  public static readonly viewType = 'codesprites.panel';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private _disposed = false;
  private _disposeCallbacks: Array<() => void> = [];
  private _messageCallbacks: Array<(msg: any) => void> = [];

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._extensionUri = context.extensionUri;

    this._panel = vscode.window.createWebviewPanel(
      SpritePanel.viewType,
      'Pixel Agent',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this._extensionUri, 'media'),
        ],
      }
    );

    this._panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'icon.png');
    this._panel.webview.html = this._getHtml(this._panel.webview);

    this._panel.onDidDispose(() => this._onDispose());

    this._panel.webview.onDidReceiveMessage((msg) => {
      this._handleMessage(msg);
    });

    // Forward config to webview
    this._sendConfig();

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('codesprites')) {
        this._sendConfig();
      }
    });
  }

  public reveal(): void {
    this._panel.reveal(vscode.ViewColumn.Beside, true);
  }

  public postMessage(message: unknown): void {
    if (!this._disposed) {
      this._panel.webview.postMessage(message);
    }
  }

  public onDidDispose(callback: () => void): void {
    this._disposeCallbacks.push(callback);
  }

  public onDidReceiveMessage(callback: (msg: any) => void): void {
    this._messageCallbacks.push(callback);
  }

  private _sendConfig(): void {
    const cfg = vscode.workspace.getConfiguration('codesprites');
    this.postMessage({
      type: 'config',
      maxSprites: cfg.get<number>('maxSprites', 12),
      spriteSpeed: cfg.get<number>('spriteSpeed', 1.0),
      showBubbles: cfg.get<boolean>('showBubbles', true),
    });
  }

  private _handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'persistLayout':
        if (msg.names) {
          this._context.globalState.update('codesprites.activeNames', msg.names as string[]);
        }
        break;
      case 'persistCustomLayout':
        if (msg.items) {
          this._context.globalState.update('codesprites.customLayout', msg.items);
        }
        break;
      case 'ready':
        this._sendConfig();
        {
          const savedItems = this._context.globalState.get<unknown[]>('codesprites.customLayout');
          if (savedItems && Array.isArray(savedItems)) {
            this.postMessage({ type: 'loadCustomLayout', items: savedItems });
          }
        }
        break;
    }
    for (const cb of this._messageCallbacks) {
      cb(msg);
    }
  }

  private _onDispose(): void {
    this._disposed = true;
    for (const cb of this._disposeCallbacks) {
      cb();
    }
    this._disposeCallbacks = [];
  }

  private _getHtml(webview: vscode.Webview): string {
    const mediaUri = (file: string) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', file));

    const styleUri = mediaUri('styles.css');
    const engineUri = mediaUri('spriteEngine.js');
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource} https://fonts.googleapis.com https://fonts.gstatic.com;
             font-src https://fonts.gstatic.com;
             script-src 'nonce-${nonce}';
             img-src ${webview.cspSource} data:;" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Pixel Agent</title>
</head>
<body>
  <div id="mainContainer">
    <div id="innerPanel">
      <canvas id="spriteCanvas"></canvas>
      <div id="hudOverlay">
        <div class="hud-bar">
          <span class="hud-bar-label">SYS</span>
          <div class="hud-bar-track"><div class="hud-bar-fill" id="hudHpFill"></div></div>
        </div>
        <div class="hud-bar">
          <span class="hud-bar-label">PWR</span>
          <div class="hud-bar-track"><div class="hud-bar-fill" id="hudEpFill"></div></div>
        </div>
      </div>
      <div id="dialogBox">
        <span id="dialogTitle"></span>
        <button id="dialogClose">X</button>
        <div id="dialogText"></div>
      </div>
      <div id="itemToolbar">
        <button id="toolbarToggle">▶ ITEMS</button>
        <div id="toolbarPalette">
          <button class="item-btn" data-item="plant-large" title="Plant">🌿</button>
          <button class="item-btn" data-item="plant-small" title="Small Plant">🌱</button>
          <button class="item-btn" data-item="sofa" title="Sofa">🛋</button>
          <button class="item-btn" data-item="bookshelf-decor" title="Bookshelf">📚</button>
          <button class="item-btn" data-item="coffee-table" title="Table">☕</button>
          <button class="item-btn" data-item="rug" title="Rug">🟫</button>
          <button class="item-btn" data-item="bean-bag" title="Bean Bag">🫘</button>
          <button class="item-btn" data-item="tv-screen" title="TV">📺</button>
          <button class="item-btn" data-item="water-cooler" title="Cooler">💧</button>
          <button class="item-btn" data-item="filing-cabinet" title="Cabinet">🗄</button>
          <button class="item-btn" data-item="printer" title="Printer">🖨</button>
          <button class="item-btn" data-item="trash-can" title="Trash">🗑</button>
          <button class="item-btn" data-item="lamp-post" title="Lamp">💡</button>
          <button id="deleteItemBtn" title="Delete">✕</button>
        </div>
      </div>
      <div id="loadingBar"></div>
      <div id="statusBar">
        <span id="spriteCount">0 agents</span>
        <span id="statusIndicator">ONLINE</span>
      </div>
    </div>
  </div>
  <script nonce="${nonce}" src="${engineUri}"></script>
</body>
</html>`;
  }
}
