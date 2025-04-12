import { ServerInstaller } from "@statiolake/coc-utils/out/installer";
import {
  commands,
  Disposable,
  events,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  services,
  TextDocument,
  window,
  workspace,
} from "coc.nvim";
import * as fs from "fs-extra";
import path from "path";
import { logger } from ".";
import { Config } from "./config";
import { getPacks, getRepo } from "./installer";
import { Neodev } from "./neodev";

export type LuaDocument = TextDocument & { languageId: "lua" };
export function isLuaDocument(document: TextDocument): document is LuaDocument {
  const ret = document.languageId === "lua";
  return ret;
}

export type Cmd = (...args: any[]) => unknown;

export class Ctx {
  client: LanguageClient | undefined;
  public readonly config = new Config();
  barTooltip = "";
  neodev: Neodev;
  public readonly installer: ServerInstaller;

  constructor(public readonly extctx: ExtensionContext) {
    this.client = undefined;
    this.neodev = new Neodev(extctx);
    this.installer = new ServerInstaller(
      "lua-language-server",
      extctx,
      getPacks(),
      getRepo(this.config.version),
      this.config.customPath,
    );
  }

  registerCommand(name: string, cmd: (ctx: Ctx) => unknown, internal = false) {
    const fullName = `luals.${name}`;
    const d = commands.registerCommand(
      fullName,
      () => cmd(this),
      null,
      internal,
    );
    this.extctx.subscriptions.push(d);
  }

  get subscriptions(): Disposable[] {
    return this.extctx.subscriptions;
  }

  resolveBin(): [string, string[]] | undefined {
    // TODO: handle Lua.misc.executablePath
    const bin = this.installer.path;
    if (!bin || !fs.existsSync(bin)) {
      return undefined;
    }

    // lua-language-serber should be in .../bin/lua-language-server, so we
    // need two dirnames to get server directory.
    const serverDir = path.dirname(path.dirname(bin));
    const miscParameters = workspace
      .getConfiguration("Lua")
      .get<string[]>("misc.parameters")!;

    const args: string[] = [
      "-E",
      path.join(serverDir, "bin", "main.lua"),
      `--locale=${this.config.locale}`,
      ...miscParameters,
    ];

    if (this.config.logPath.length > 0) {
      args.push(`--logpath=${this.config.logPath}`);
    }

    return [bin, args];
  }

  public async ensureInstalled(): Promise<boolean> {
    const res = await this.installer.ensureInstalled(
      this.config.prompt === true,
      this.config.prompt !== "neverDownload",
    );

    logger.appendLine("ensureInstalled() result: " + JSON.stringify(res));
    return res.available;
  }

  public async ensureUpdated(auto = true): Promise<void> {
    logger.appendLine(`Check update (auto: ${auto})`);
    if (auto && !this.config.checkOnStartup) {
      logger.appendLine(
        "Skip update check, config `checkOnStartup` is disabled.",
      );
      return;
    }

    const res = await this.installer.ensureUpdated(
      this.config.prompt === true,
      this.config.prompt !== "neverDownload",
      !auto,
      this.client,
    );
    logger.appendLine("ensureUpdated() result: " + JSON.stringify(res));

    if ("error" in res) {
      logger.appendLine("error stacktrace: " + res.error.stack);
    }
  }

  async getCurrentVersion(): Promise<string | undefined> {
    const version = await this.installer.checkVersion();
    if (version.result === "different") {
      return version.currentVersion;
    }
    if (version.result === "same") {
      return version.version;
    }
    return undefined;
  }

  createClient(): undefined | LanguageClient {
    const bin = this.resolveBin();
    if (!bin) return;

    const [command, args] = bin;
    logger.appendLine(`command: ${command}`);
    logger.appendLine(`args: ${args}`);

    const serverOptions: ServerOptions = { command, args };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ language: "lua" }],
      progressOnInitialization: true,
      initializationOptions: {
        changeConfiguration: true,
      },
      middleware: {
        workspace: {
          configuration: async (params, token, next) => {
            const result = await next(params, token);

            if (!this.config.nvimLuaDev || !Array.isArray(result))
              return result;

            const sectionIndex = params.items.findIndex(
              (item) => item.section === "Lua",
            );

            if (sectionIndex === -1) return result;

            const configuration = result[sectionIndex];

            const library = configuration.workspace.library || [];

            const runtime = await workspace.nvim.call("expand", [
              "$VIMRUNTIME/lua",
            ]);
            if (!library.includes(runtime)) library.push(runtime);

            const types = await this.neodev.getTypesPath();
            if (types && !library.includes(types)) library.push(types);

            configuration.workspace.library = library;

            result[sectionIndex] = configuration;

            return result;
          },
        },
      },
    };
    return new LanguageClient(
      "luals",
      "Sumneko Lua Language Server",
      serverOptions,
      clientOptions,
    );
  }

  async startServer() {
    const client = this.createClient();
    if (!client) return;
    this.extctx.subscriptions.push(services.registerLanguageClient(client));
    await client.onReady();
    this.client = client;
    // activate components
    this.activateCommand();
    this.activateStatusBar();
  }

  activateStatusBar() {
    // window status bar
    const bar = window.createStatusBarItem();
    this.extctx.subscriptions.push(bar);

    let keepHide = false;

    if (!this.client) {
      throw new Error("client is null");
    }

    this.client.onNotification("$/status/show", () => {
      keepHide = false;
      bar.show();
    });
    this.client.onNotification("$/status/hide", () => {
      keepHide = true;
      bar.hide();
    });
    this.client.onNotification("$/status/report", (params) => {
      const text: string = params.text;
      bar.isProgress = text.includes("$(loading~spin)");
      bar.text = text.replace("$(loading~spin)", "");
      this.barTooltip = params.tooltip;
    });

    events.on(
      "BufEnter",
      async () => {
        const doc = await workspace.document;
        if (isLuaDocument(doc.textDocument)) {
          if (!keepHide) bar.show();
        } else {
          bar.hide();
        }
      },
      null,
      this.extctx.subscriptions,
    );
  }

  activateCommand() {
    if (!this.client) {
      throw new Error("client is null");
    }

    this.client.onNotification("$/command", (params) => {
      if (params.command !== "lua.config") return;

      const propMap: Map<string, Map<string, any>> = new Map();
      for (const data of params.data) {
        const folder = workspace.getWorkspaceFolder(data.uri);
        const config = workspace.getConfiguration(
          undefined,
          folder ? data.uri : undefined,
        );
        if (data.action === "add") {
          let value = config.get<any[]>(data.key, []);
          // weird...
          value = Array.from(value);
          value.push(data.value);
          config.update(data.key, value, data.global);
          continue;
        }
        if (data.action === "set") {
          config.update(data.key, data.value, data.global);
          continue;
        }
        if (data.action === "prop") {
          if (!propMap[data.key]) propMap[data.key] = config.get(data.key);

          propMap[data.key][data.prop] = data.value;
          config.update(data.key, propMap[data.key], data.global);
          continue;
        }
      }
    });
  }
}
