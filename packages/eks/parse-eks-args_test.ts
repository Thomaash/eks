import { assertEquals } from "@std/assert";
import { parseEksArgs } from "./parse-eks-args.ts";

function envOf(
  values: Record<string, string | undefined>,
): Pick<typeof Deno.env, "get"> {
  return {
    get(key: string): string | undefined {
      return values[key];
    },
  };
}

Deno.test("parseEksArgs: --editor flag overrides VISUAL and EDITOR", () => {
  const args = parseEksArgs(
    ["--editor", "nvim"],
    envOf({ VISUAL: "vim", EDITOR: "emacs" }),
  );
  assertEquals(args.editor, "nvim");
});

Deno.test("parseEksArgs: $VISUAL is used when --editor is not provided", () => {
  const args = parseEksArgs([], envOf({ VISUAL: "vim", EDITOR: "emacs" }));
  assertEquals(args.editor, "vim");
});

Deno.test("parseEksArgs: $EDITOR is used when --editor and $VISUAL are unset", () => {
  const args = parseEksArgs([], envOf({ EDITOR: "emacs" }));
  assertEquals(args.editor, "emacs");
});

Deno.test("parseEksArgs: falls back to nano when no flag and no env vars", () => {
  const args = parseEksArgs([], envOf({}));
  assertEquals(args.editor, "nano");
});

Deno.test("parseEksArgs: --editor wins over $EDITOR when $VISUAL is unset", () => {
  const args = parseEksArgs(
    ["--editor", "nvim"],
    envOf({ EDITOR: "emacs" }),
  );
  assertEquals(args.editor, "nvim");
});

Deno.test("parseEksArgs: defaults multiple to false when --multiple is absent", () => {
  const args = parseEksArgs([], envOf({}));
  assertEquals(args.multiple, false);
});

Deno.test("parseEksArgs: --multiple sets multiple to true", () => {
  const args = parseEksArgs(["--multiple"], envOf({}));
  assertEquals(args.multiple, true);
});

Deno.test("parseEksArgs: defaults skipDirs to [] when no flag and no env", () => {
  const args = parseEksArgs([], envOf({}));
  assertEquals(args.skipDirs, []);
});

Deno.test("parseEksArgs: --skip-dir is repeatable and preserves order", () => {
  const args = parseEksArgs(
    ["--skip-dir", ".idea", "--skip-dir", "tmp"],
    envOf({}),
  );
  assertEquals(args.skipDirs, [".idea", "tmp"]);
});

Deno.test("parseEksArgs: --skip-dir value containing ':' is treated as a literal", () => {
  const args = parseEksArgs(["--skip-dir", "foo:bar"], envOf({}));
  assertEquals(args.skipDirs, ["foo:bar"]);
});

Deno.test("parseEksArgs: --skip-dir with empty value is filtered out", () => {
  const args = parseEksArgs(["--skip-dir", ""], envOf({}));
  assertEquals(args.skipDirs, []);
});

Deno.test("parseEksArgs: EKS_SKIP_DIRS is parsed as colon-delimited list", () => {
  const args = parseEksArgs([], envOf({ EKS_SKIP_DIRS: ".idea:.venv" }));
  assertEquals(args.skipDirs, [".idea", ".venv"]);
});

Deno.test("parseEksArgs: EKS_SKIP_DIRS drops empty segments from leading/trailing/repeated colons", () => {
  const args = parseEksArgs([], envOf({ EKS_SKIP_DIRS: "::foo::bar:" }));
  assertEquals(args.skipDirs, ["foo", "bar"]);
});

Deno.test("parseEksArgs: --skip-dir and EKS_SKIP_DIRS compose additively with flag-values first then env-values", () => {
  const args = parseEksArgs(
    ["--skip-dir", "a"],
    envOf({ EKS_SKIP_DIRS: "b" }),
  );
  assertEquals(args.skipDirs, ["a", "b"]);
});

Deno.test("parseEksArgs: --multiple and --editor coexist", () => {
  const args = parseEksArgs(
    ["--multiple", "--editor", "nvim"],
    envOf({}),
  );
  assertEquals(args, { multiple: true, editor: "nvim", skipDirs: [] });
});
