import { afterEach, describe, expect, test } from "vitest";

import { isOverlayOpen } from "./overlays";

describe("isOverlayOpen", () => {
  const added: HTMLElement[] = [];

  function add(role: string) {
    const el = document.createElement("div");
    el.setAttribute("role", role);
    document.body.appendChild(el);
    added.push(el);
    return el;
  }

  afterEach(() => {
    for (const el of added.splice(0)) el.remove();
  });

  test("false when nothing is open", () => {
    expect(isOverlayOpen()).toBe(false);
  });

  test.each(["dialog", "alertdialog", "menu"])("true with role=%s", (role) => {
    const el = add(role);
    expect(isOverlayOpen()).toBe(true);
    el.remove();
    expect(isOverlayOpen()).toBe(false);
  });
});
