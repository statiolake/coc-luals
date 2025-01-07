import {
  ILanguageServerPackages,
  LanguageServerRepository,
} from "@statiolake/coc-utils";

export function getPacks(): ILanguageServerPackages {
  return {
    "win-x64": {
      platformFilename: /lua-language-server-.*-win32-x64.zip/,
      archiver: "zip",
      executable: "bin/lua-language-server.exe",
    },
    "linux-x64": {
      platformFilename: /lua-language-server-.*-linux-x64.tar.gz/,
      archiver: "tar-gzip",
      executable: "bin/lua-language-server",
    },
    "osx-x64": {
      platformFilename: /lua-language-server-.*-darwin-x64.tar.gz/,
      archiver: "tar-gzip",
      executable: "bin/lua-language-server",
    },
    "osx-arm64": {
      platformFilename: /lua-language-server-.*-darwin-arm64.tar.gz/,
      archiver: "tar-gzip",
      executable: "bin/lua-language-server",
    },
  };
}

export function getRepo(version: string): LanguageServerRepository {
  return {
    kind: "github",
    repo: "LuaLS/lua-language-server",
    channel: version === "latest" ? "latest" : `tag/${version}`,
  };
}
