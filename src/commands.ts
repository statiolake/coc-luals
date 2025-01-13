import { window, workspace } from "coc.nvim";
import { existsSync } from "fs-extra";
import path from "path";
import { logger } from ".";
import { Ctx } from "./ctx";

export async function install(ctx: Ctx) {
  try {
    logger.appendLine("installing lua-language-server...");
    const res = await ctx.installer.install(true);
    logger.appendLine(`lua-language-server installed: ${res}`);
  } catch (err) {
    logger.appendLine(`failed to install: ${err}`);
    window.showErrorMessage(`Failed to install lua-language-server: ${err}`);
  }
}

export async function update(ctx: Ctx) {
  try {
    logger.appendLine("updating lua-language-server...");
    const res = await ctx.installer.ensureUpdated(true, true, true, undefined);
    logger.appendLine(`lua-language-server updated: ${res}`);
  } catch (err) {
    logger.appendLine(`failed to update: ${err}`);
    window.showErrorMessage(`Failed to update lua-language-server: ${err}`);
  }
}

export async function version(ctx: Ctx) {
  const v = (await ctx.getCurrentVersion()) || "unknown version";
  window.showInformationMessage(v);
}

export async function showTooltip(ctx: Ctx) {
  window.showNotification({ content: ctx.barTooltip });
}

export async function insertNvimLuaPluginLibrary(_: Ctx) {
  const config = workspace.getConfiguration("Lua.workspace");
  const library = Array.from(config.get<string[]>("library") || []);

  const runtimepath = (await workspace.nvim.getOption("runtimepath")) as string;
  const paths = runtimepath
    .split(",")
    .map((v) => {
      return path.join(v, "lua");
    })
    .filter((v) => !library.includes(v) && existsSync(v));

  if (!paths.length) return;

  const vimruntime = (await workspace.nvim.call("expand", [
    "$VIMRUNTIME/lua",
  ])) as string;
  const myvimrc = path.join(
    path.dirname(await workspace.nvim.call("expand", ["$MYVIMRC"])),
    "lua",
  );

  const idx = await window.showQuickpick(
    paths.map((v, i) => {
      let name = "";

      if (v == vimruntime) {
        name = `${vimruntime} (auto added if luals.enableNvimLuaDev is true )`;
      } else if (v == myvimrc) {
        name = `${myvimrc} (not recommended)`;
      } else {
        name = path.basename(path.dirname(v));
      }

      return i < 9 ? ` ${name}` : name;
    }),
  );
  if (idx != -1) {
    library.push(paths[idx]);
    config.update("library", library);
  }
}

export async function downloadNvimLuaTypes(ctx: Ctx) {
  await ctx.neodev.downloadTypes();
}
