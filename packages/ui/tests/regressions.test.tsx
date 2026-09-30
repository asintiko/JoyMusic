import { act, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { StrictMode } from "react";
import type { ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AmbientBackground,
  Dialog,
  EmptyState,
  GenerativeCover,
  Sheet,
  Toaster,
  useToast,
} from "../src";

const componentsCss = readFileSync(resolve(process.cwd(), "src/components.css"), "utf8");
const themeCss = readFileSync(resolve(process.cwd(), "src/theme.css"), "utf8");
const tokensCss = readFileSync(resolve(process.cwd(), "src/tokens.css"), "utf8");

function classesOf(element: Element): string[] {
  return (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

function normalizedCover(container: HTMLElement): string {
  return container.innerHTML.replace(/jm-cv-[a-z]+-[^"')#\s]+/g, "id");
}

async function hydrate(tree: ReactNode) {
  const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const host = document.createElement("div");
  document.body.appendChild(host);
  host.innerHTML = renderToString(tree);
  const serverMarkup = host.innerHTML;
  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(host, tree);
  });
  const calls = errors.mock.calls.map((call) => String(call[0]));
  errors.mockRestore();
  return { host, serverMarkup, calls, unmount: () => act(() => root?.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("empty state illustration sizing", () => {
  it.each([
    ["sm", "max-w-[7rem]"],
    ["md", "max-w-[10rem]"],
    ["lg", "max-w-[14rem]"],
  ] as const)("uses one width rule and a fixed max width at size %s", (size, maxWidth) => {
    const { container } = render(<EmptyState size={size} title="Nothing" />);
    const art = container.querySelector("svg");
    const classes = classesOf(art as Element);
    const widths = classes.filter((name) => /^w-/.test(name));
    expect(widths).toEqual(["w-full"]);
    expect(classes).toContain(maxWidth);
    expect(classes).toContain("mx-auto");
    expect(classes).toContain("h-auto");
    expect(classes.some((name) => /^w-(?!full$)/.test(name))).toBe(false);
  });
});

describe("toaster hydration", () => {
  it("renders no portal markup on the server", () => {
    const html = renderToString(
      <Toaster>
        <p>app</p>
      </Toaster>,
    );
    expect(html).toBe("<p>app</p>");
  });

  it("hydrates without warnings and mounts the viewport afterwards", async () => {
    const tree = (
      <Toaster>
        <p>app</p>
      </Toaster>
    );
    const result = await hydrate(tree);
    expect(result.calls).toEqual([]);
    expect(result.serverMarkup).toBe(result.host.innerHTML.replace(/<div data-testid.*$/, ""));
    expect(document.body.querySelector("[data-testid=toast-viewport]")).not.toBeNull();
    await result.unmount();
  });

  it("renders the viewport into a custom container", () => {
    const container = document.createElement("section");
    document.body.appendChild(container);
    render(<Toaster container={container}>x</Toaster>);
    const viewport = container.querySelector("[data-testid=toast-viewport]");
    expect(viewport).not.toBeNull();
    expect(viewport?.parentElement).toBe(container);
  });

  it("shows toasts inside the custom container", () => {
    const container = document.createElement("section");
    document.body.appendChild(container);
    function Trigger() {
      const { toast } = useToast();
      return <button onClick={() => toast({ title: "Saved" })}>go</button>;
    }
    render(
      <Toaster container={container}>
        <Trigger />
      </Toaster>,
    );
    act(() => screen.getByText("go").click());
    expect(container.textContent).toContain("Saved");
  });
});

describe("dialog and sheet containers", () => {
  it("renders a dialog inside a custom container", () => {
    const container = document.createElement("section");
    document.body.appendChild(container);
    render(<Dialog open onOpenChange={() => undefined} title="Hello" container={container} />);
    expect(container.querySelector("[role=dialog]")).not.toBeNull();
  });

  it("renders a sheet inside a custom container", () => {
    const container = document.createElement("section");
    document.body.appendChild(container);
    render(<Sheet open onOpenChange={() => undefined} title="Hello" container={container} />);
    expect(container.querySelector("[role=dialog]")).not.toBeNull();
  });

  it("hydrates an open dialog and sheet without warnings", async () => {
    const tree = (
      <div>
        <Dialog open onOpenChange={() => undefined} title="Dialog title" />
        <Sheet open onOpenChange={() => undefined} title="Sheet title" />
      </div>
    );
    const result = await hydrate(tree);
    expect(result.calls).toEqual([]);
    expect(document.body.textContent).toContain("Dialog title");
    expect(document.body.textContent).toContain("Sheet title");
    await result.unmount();
  });
});

describe("ambient image backdrop", () => {
  it("blurs through its own class, not a tailwind blur utility", () => {
    const { container } = render(<AmbientBackground src="/a.jpg" imageBackdrop />);
    const image = container.querySelector("img") as HTMLImageElement;
    const classes = classesOf(image);
    expect(classes).toContain("jm-ambient-image");
    expect(classes.some((name) => /(^|:)blur-/.test(name))).toBe(false);
  });

  it("defines the blur in components.css from a token", () => {
    expect(componentsCss).toMatch(
      /\.jm-ambient-image\s*\{[^}]*filter:\s*blur\(var\(--jm-blur-backdrop\)\)/,
    );
    expect(tokensCss).toMatch(/--jm-blur-backdrop:\s*\d+px/);
    expect(themeCss).toContain("--blur-*: initial");
  });
});

describe("generative cover purity", () => {
  const seeds = Array.from({ length: 40 }, (_, index) => `strict seed ${index}`);

  it("renders identically in StrictMode and outside it for every pattern", () => {
    const patterns = new Set<string>();
    for (const seed of seeds) {
      const plain = render(<GenerativeCover seed={seed} showMonogram />);
      const strict = render(
        <StrictMode>
          <GenerativeCover seed={seed} showMonogram />
        </StrictMode>,
      );
      patterns.add(plain.container.querySelector("svg")?.getAttribute("data-pattern") ?? "");
      expect(normalizedCover(strict.container)).toBe(normalizedCover(plain.container));
      plain.unmount();
      strict.unmount();
    }
    expect(patterns.size).toBe(8);
  });

  it("renders identically across two consecutive StrictMode renders", () => {
    for (const seed of seeds) {
      const first = render(
        <StrictMode>
          <GenerativeCover seed={seed} />
        </StrictMode>,
      );
      const second = render(
        <StrictMode>
          <GenerativeCover seed={seed} />
        </StrictMode>,
      );
      expect(normalizedCover(second.container)).toBe(normalizedCover(first.container));
      first.unmount();
      second.unmount();
    }
  });

  it("re-renders the same element idempotently", () => {
    const view = render(<GenerativeCover seed="idempotent" />);
    const before = normalizedCover(view.container);
    view.rerender(<GenerativeCover seed="idempotent" />);
    expect(normalizedCover(view.container)).toBe(before);
  });
});

describe("eyebrow typography", () => {
  it("disables pair kerning so tracked capitals like TT keep an even gap", () => {
    const block = themeCss.match(/@utility type-eyebrow\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(block).toContain("text-transform: uppercase");
    expect(block).toMatch(/letter-spacing:\s*0\.1em/);
    expect(block).toContain("font-kerning: none");
  });
});
