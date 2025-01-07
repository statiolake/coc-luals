import { ExtensionContext, OutputChannel, window } from 'coc.nvim';
import * as cmds from './commands';
import { Ctx } from './ctx';

declare global {
  var logger: OutputChannel;
}

export async function activate(extctx: ExtensionContext): Promise<void> {
  logger = window.createOutputChannel('coc-sumneko-lua');
  logger.appendLine('activating coc-sumneko-lua...');

  const ctx = new Ctx(extctx);
  if (!ctx.config.enabled) {
    return;
  }

  ctx.registerCommand('install', cmds.install);
  ctx.registerCommand('update', cmds.update);
  ctx.registerCommand('version', cmds.version);
  ctx.registerCommand('restart', (ctx) => {
    return async () => {
      window.showInformationMessage(`Reloading sumneko lua-language-server...`)

      for (const sub of ctx.subscriptions) {
        try {
          sub.dispose()
        }
        catch (e) {
          console.error(e)
        }
      }

      await activate(extctx);

      window.showInformationMessage(`Reloaded sumneko lua-language-server`);
    };
  });
  ctx.registerCommand('showTooltip', cmds.showTooltip);
  ctx.registerCommand('insertNvimLuaPluginLibrary', cmds.insertNvimLuaPluginLibrary);
  ctx.registerCommand('downloadNvimLuaTypes', cmds.downloadNvimLuaTypes);

  if (!(await ctx.ensureInstalled())) return;

  await ctx.startServer();
  await ctx.ensureUpdated();

  logger.appendLine('Activated coc-sumneko-lua.');
}
