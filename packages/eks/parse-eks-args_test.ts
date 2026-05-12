import { assertEquals } from "@std/assert";
import { parseEksArgs } from "./parse-eks-args.ts";

function envOf(values: Record<string, string | undefined>): Pick<typeof Deno.env, "get"> {
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

Deno.test("parseEksArgs: --multiple and --editor coexist", () => {
  const args = parseEksArgs(
    ["--multiple", "--editor", "nvim"],
    envOf({}),
  );
  assertEquals(args, { multiple: true, editor: "nvim" });
});
