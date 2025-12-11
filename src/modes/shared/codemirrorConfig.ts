import type { Extension } from "@codemirror/state";
import { StreamLanguage } from "@codemirror/language";

import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { xml } from "@codemirror/lang-xml";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { sql } from "@codemirror/lang-sql";
import { java } from "@codemirror/lang-java";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { cpp } from "@codemirror/lang-cpp";
import { sass } from "@codemirror/lang-sass";
import { less } from "@codemirror/lang-less";
import { lezer } from "@codemirror/lang-lezer";
import { markdown as markdownLang } from "@codemirror/lang-markdown";

import { shell } from "@codemirror/legacy-modes/mode/shell";
import { yaml as yamlMode } from "@codemirror/legacy-modes/mode/yaml";
import { toml as tomlMode } from "@codemirror/legacy-modes/mode/toml";
import { haskell } from "@codemirror/legacy-modes/mode/haskell";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { commonLisp } from "@codemirror/legacy-modes/mode/commonlisp";
import { scheme } from "@codemirror/legacy-modes/mode/scheme";
import { oCaml, fSharp } from "@codemirror/legacy-modes/mode/mllike";
import {
  objectiveC,
  scala as scalaLegacy,
} from "@codemirror/legacy-modes/mode/clike";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { python } from "@codemirror/legacy-modes/mode/python";
import { mathematica } from "@codemirror/legacy-modes/mode/mathematica";
import { octave } from "@codemirror/legacy-modes/mode/octave";
import { julia } from "@codemirror/legacy-modes/mode/julia";
import { r as rLegacy } from "@codemirror/legacy-modes/mode/r";
import { erlang } from "@codemirror/legacy-modes/mode/erlang";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { perl } from "@codemirror/legacy-modes/mode/perl";
import { groovy } from "@codemirror/legacy-modes/mode/groovy";
import { d as dLegacy } from "@codemirror/legacy-modes/mode/d";
import { fortran } from "@codemirror/legacy-modes/mode/fortran";
import { diff as diffLegacy } from "@codemirror/legacy-modes/mode/diff";
import { pascal } from "@codemirror/legacy-modes/mode/pascal";
import { cobol } from "@codemirror/legacy-modes/mode/cobol";
import { coffeeScript } from "@codemirror/legacy-modes/mode/coffeescript";
import { asciidoc } from "codemirror-asciidoc";
import { csharp as csharpLang } from "@replit/codemirror-lang-csharp";

import { oneDark } from "@codemirror/theme-one-dark";
import { materialLight, materialDark } from "@uiw/codemirror-theme-material";
import { monokai } from "@uiw/codemirror-theme-monokai";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import { vscodeLight, vscodeDark } from "@uiw/codemirror-theme-vscode";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { nord } from "@uiw/codemirror-theme-nord";
import { solarizedLight, solarizedDark } from "@uiw/codemirror-theme-solarized";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { tokyoNightDay } from "@uiw/codemirror-theme-tokyo-night-day";
import { tokyoNightStorm } from "@uiw/codemirror-theme-tokyo-night-storm";
import { quietlight } from "@uiw/codemirror-theme-quietlight";
import { okaidia } from "@uiw/codemirror-theme-okaidia";
import { atomone } from "@uiw/codemirror-theme-atomone";
import { eclipse } from "@uiw/codemirror-theme-eclipse";
import { gruvboxDark } from "@uiw/codemirror-theme-gruvbox-dark";

export function mapLanguage(
  name: string | null | undefined,
): Extension | Extension[] {
  const lang = (name || "").trim().toLowerCase();
  switch (lang) {
    case "js":
    case "javascript":
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
    case "typescript":
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "markdown":
    case "md":
      return markdownLang();
    case "latex":
    case "tex":
    case "stex":
      return StreamLanguage.define(stex);
    case "java":
      return java();
    case "c":
    case "cpp":
    case "c++":
      return cpp();
    case "rs":
    case "rust":
      return rust();
    case "go":
      return go();
    case "html":
      return html();
    case "xml":
      return xml();
    case "css":
      return css();
    case "json":
      return json();
    case "sql":
      return sql();
    case "bash":
    case "sh":
    case "shell":
      return StreamLanguage.define(shell);
    case "diff":
      return StreamLanguage.define(diffLegacy);
    case "yaml":
    case "yml":
      return StreamLanguage.define(yamlMode);
    case "toml":
      return StreamLanguage.define(tomlMode);
    case "sass":
      return sass();
    case "less":
      return less();
    case "lezer":
      return lezer();
    case "c#":
    case "csharp":
      return csharpLang();
    case "haskell":
      return StreamLanguage.define(haskell);
    case "lisp":
    case "commonlisp":
      return StreamLanguage.define(commonLisp);
    case "scheme":
      return StreamLanguage.define(scheme);
    case "ocaml":
    case "ml":
      return StreamLanguage.define(oCaml);
    case "f#":
    case "fsharp":
      return StreamLanguage.define(fSharp);
    case "objective-c":
    case "objc":
      return StreamLanguage.define(objectiveC);
    case "swift":
      return StreamLanguage.define(swift);
    case "python":
    case "py":
      return StreamLanguage.define(python);
    case "matlab":
    case "octave":
      return StreamLanguage.define(octave);
    case "mathematica":
    case "wolfram":
      return StreamLanguage.define(mathematica);
    case "julia":
      return StreamLanguage.define(julia);
    case "r":
      return StreamLanguage.define(rLegacy);
    case "erlang":
      return StreamLanguage.define(erlang);
    case "lua":
      return StreamLanguage.define(lua);
    case "perl":
      return StreamLanguage.define(perl);
    case "scala":
      return StreamLanguage.define(scalaLegacy);
    case "groovy":
      return StreamLanguage.define(groovy);
    case "d":
      return StreamLanguage.define(dLegacy);
    case "fortran":
      return StreamLanguage.define(fortran);
    case "pascal":
      return StreamLanguage.define(pascal);
    case "cobol":
      return StreamLanguage.define(cobol);
    case "asciidoc":
    case "adoc":
      return StreamLanguage.define(
        asciidoc as unknown as import("@codemirror/language").StreamParser<unknown>,
      );
    case "coffeescript":
    case "coffee":
      return StreamLanguage.define(coffeeScript);
    default:
      return [] as Extension[];
  }
}

export const LANGUAGE_ITEMS = [
  { name: "javascript", aliases: ["js", "jsx"] },
  { name: "typescript", aliases: ["ts", "tsx"] },
  { name: "java", aliases: [] },
  { name: "cpp", aliases: ["c++", "c"] },
  { name: "rust", aliases: ["rs"] },
  { name: "go", aliases: [] },
  { name: "html", aliases: [] },
  { name: "xml", aliases: [] },
  { name: "css", aliases: [] },
  { name: "json", aliases: [] },
  { name: "sql", aliases: [] },
  { name: "shell", aliases: ["bash", "sh"] },
  { name: "yaml", aliases: ["yml"] },
  { name: "toml", aliases: [] },
  { name: "sass", aliases: [] },
  { name: "less", aliases: [] },
  { name: "lezer", aliases: [] },
  { name: "csharp", aliases: ["c#"] },
  { name: "markdown", aliases: ["md"] },
  { name: "latex", aliases: ["tex", "stex"] },
  { name: "haskell", aliases: [] },
  { name: "lisp", aliases: ["commonlisp"] },
  { name: "scheme", aliases: [] },
  { name: "ocaml", aliases: ["ml"] },
  { name: "fsharp", aliases: ["f#"] },
  { name: "objective-c", aliases: ["objc"] },
  { name: "swift", aliases: [] },
  { name: "python", aliases: ["py"] },
  { name: "matlab", aliases: ["octave"] },
  { name: "mathematica", aliases: ["wolfram"] },
  { name: "julia", aliases: [] },
  { name: "r", aliases: [] },
  { name: "erlang", aliases: [] },
  { name: "lua", aliases: [] },
  { name: "perl", aliases: [] },
  { name: "scala", aliases: [] },
  { name: "groovy", aliases: [] },
  { name: "d", aliases: [] },
  { name: "fortran", aliases: [] },
  { name: "diff", aliases: [] },
  { name: "pascal", aliases: [] },
  { name: "cobol", aliases: [] },
  { name: "asciidoc", aliases: ["adoc"] },
  { name: "coffeescript", aliases: ["coffee"] },
  { name: "ada", aliases: [] },
  { name: "nim", aliases: [] },
  { name: "zig", aliases: [] },
  { name: "bat", aliases: ["cmd"] },
];

export function mapTheme(
  name: string | undefined,
  darkMode: boolean,
): Extension {
  const key = (name || "").toLowerCase();
  switch (key) {
    case "material-light":
      return materialLight;
    case "material-dark":
      return materialDark;
    case "monokai":
      return monokai;
    case "github-light":
      return githubLight;
    case "github-dark":
      return githubDark;
    case "vscode-light":
      return vscodeLight;
    case "vscode-dark":
      return vscodeDark;
    case "one-dark":
      return oneDark;
    case "dracula":
      return dracula;
    case "nord":
      return nord;
    case "solarized-light":
      return solarizedLight;
    case "solarized-dark":
      return solarizedDark;
    case "tokyo-night":
      return tokyoNight;
    case "tokyo-night-day":
      return tokyoNightDay;
    case "tokyo-night-storm":
      return tokyoNightStorm;
    case "quietlight":
      return quietlight;
    case "okaidia":
      return okaidia;
    case "atomone":
      return atomone;
    case "eclipse":
      return eclipse;
    case "gruvbox-dark":
      return gruvboxDark;
    default:
      return darkMode ? monokai : materialLight;
  }
}
