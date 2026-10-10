import { describe, expect, it } from "bun:test";
import { releaseComputerFocus } from "../src/lib/computer-focus";

describe("computer focus ownership across input methods", () => {
  const screen = {} as Node;
  const navigation = {} as Node;
  const card = { contains: (node: Node | null) => node === screen };

  it("moves stale screen focus to the dialog before pointer or swipe selection", () => {
    const calls: (FocusOptions | undefined)[] = [];
    const dialog = { focus: (options?: FocusOptions) => calls.push(options) };
    expect(releaseComputerFocus(card, screen, dialog)).toBe(true);
    expect(calls).toEqual([{ preventScroll: true }]);
  });

  it("does not steal focus from Previous, Next, or other external controls", () => {
    let calls = 0;
    const dialog = {
      focus: () => {
        calls++;
      },
    };
    expect(releaseComputerFocus(card, navigation, dialog)).toBe(false);
    expect(calls).toBe(0);
  });

  it("is harmless during mount, cleanup, or after the old focus was already released", () => {
    let calls = 0;
    const dialog = {
      focus: () => {
        calls++;
      },
    };
    expect(releaseComputerFocus(null, screen, dialog)).toBe(false);
    expect(releaseComputerFocus(card, null, dialog)).toBe(false);
    expect(releaseComputerFocus(card, screen, null)).toBe(false);
    expect(releaseComputerFocus(card, navigation, dialog)).toBe(false);
    expect(calls).toBe(0);
  });
});
