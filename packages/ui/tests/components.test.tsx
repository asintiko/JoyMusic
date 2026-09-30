import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { requestStatuses } from "@joymusic/shared";
import { describe, expect, it, vi } from "vitest";
import {
  Button,
  CommandPalette,
  EmptyState,
  Equalizer,
  ProgressBar,
  Sheet,
  StatusPill,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
  filterCommands,
  fuzzyScore,
  shouldDismissSheet,
  sparklinePath,
  toastReducer,
  useToast,
} from "../src";
import { defaultStatusLabels } from "../src";
import type { CommandItem } from "../src";

describe("StatusPill", () => {
  it.each(requestStatuses)("renders the %s label and status marker", (status) => {
    render(<StatusPill status={status} />);
    const pill = screen.getByText(defaultStatusLabels[status]);
    expect(pill).toHaveAttribute("data-status", status);
  });

  it("accepts a localized label", () => {
    render(<StatusPill status="playing" label="Hozir chalinmoqda" />);
    expect(screen.getByText("Hozir chalinmoqda")).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("fires onClick and defaults to type=button", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Request</Button>);
    const button = screen.getByRole("button", { name: "Request" });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and busy while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Sheet", () => {
  it("renders a labelled dialog and closes on Escape", async () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange} title="Request a track" description="Add to queue">
        <p>Body</p>
      </Sheet>,
    );
    const dialog = await screen.findByRole("dialog", { name: "Request a track" });
    expect(dialog).toHaveAccessibleDescription("Add to queue");
    expect(within(dialog).getByText("Body")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes from the close button", async () => {
    const onOpenChange = vi.fn();
    render(<Sheet open onOpenChange={onOpenChange} title="Sheet" closeLabel="Close sheet" />);
    await userEvent.click(await screen.findByRole("button", { name: "Close sheet" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("dismisses by distance or velocity only", () => {
    expect(shouldDismissSheet(40, 100)).toBe(false);
    expect(shouldDismissSheet(160, 0)).toBe(true);
    expect(shouldDismissSheet(20, 900)).toBe(true);
  });

  it("renders nothing when closed", () => {
    render(<Sheet open={false} onOpenChange={() => undefined} title="Hidden" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

function ToastHarness() {
  const { toast, success } = useToast();
  return (
    <>
      <button onClick={() => toast({ title: "Queued", description: "Position 4", duration: 0 })}>
        neutral
      </button>
      <button onClick={() => toast({ title: "Boom", tone: "danger", duration: 0 })}>danger</button>
      <button onClick={() => success("Saved")}>success</button>
    </>
  );
}

describe("Toast", () => {
  it("shows a polite status toast and dismisses it", async () => {
    render(
      <Toaster dismissLabel="Dismiss">
        <ToastHarness />
      </Toaster>,
    );
    await userEvent.click(screen.getByText("neutral"));
    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("Queued");
    expect(toast).toHaveTextContent("Position 4");
    await userEvent.click(within(toast).getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  it("announces errors assertively", async () => {
    render(
      <Toaster>
        <ToastHarness />
      </Toaster>,
    );
    await userEvent.click(screen.getByText("danger"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("auto dismisses after the duration", async () => {
    vi.useFakeTimers();
    render(
      <Toaster defaultDuration={1000}>
        <ToastHarness />
      </Toaster>,
    );
    fireEvent.click(screen.getByText("success"));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    vi.useRealTimers();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  it("keeps at most four toasts and replaces by id", () => {
    let state = toastReducer([], { type: "add", toast: { id: "a", title: "a", tone: "neutral" } });
    for (const id of ["b", "c", "d", "e"]) {
      state = toastReducer(state, { type: "add", toast: { id, title: id, tone: "neutral" } });
    }
    expect(state.map((item) => item.id)).toEqual(["b", "c", "d", "e"]);
    state = toastReducer(state, { type: "add", toast: { id: "c", title: "again", tone: "info" } });
    expect(state.at(-1)?.title).toBe("again");
    expect(state).toHaveLength(4);
  });
});

describe("Tabs", () => {
  it("switches panels with the keyboard", async () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First panel</TabsContent>
        <TabsContent value="two">Second panel</TabsContent>
      </Tabs>,
    );
    const first = screen.getByRole("tab", { name: "One" });
    first.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Second panel")).toBeInTheDocument();
  });
});

describe("ProgressBar and Equalizer", () => {
  it("clamps and exposes progress to assistive tech", () => {
    render(<ProgressBar progress={1.7} label="Track progress" />);
    expect(screen.getByRole("progressbar", { name: "Track progress" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("reflects paused state", () => {
    const { container } = render(<Equalizer paused bars={5} />);
    expect(container.firstElementChild).toHaveAttribute("data-paused", "true");
    expect(container.querySelectorAll(".jm-eq-bar")).toHaveLength(5);
  });

  it("builds a sparkline path", () => {
    expect(sparklinePath([1], 10, 10)).toBe("");
    expect(sparklinePath([1, 3, 2], 100, 20).startsWith("M0")).toBe(true);
  });
});

describe("CommandPalette", () => {
  const items: CommandItem[] = [
    { id: "a", label: "Accept request", group: "Requests", onSelect: vi.fn(), keywords: ["yes"] },
    { id: "b", label: "Decline request", group: "Requests", onSelect: vi.fn() },
    { id: "c", label: "Oʻzbek xitlari", group: "Tracks", onSelect: vi.fn() },
  ];

  it("filters with diacritic and apostrophe tolerance", () => {
    expect(fuzzyScore("ozbek", "Oʻzbek xitlari")).toBeGreaterThan(0);
    expect(filterCommands(items, "decl").map((item) => item.id)).toEqual(["b"]);
    expect(filterCommands(items, "yes").map((item) => item.id)).toEqual(["a"]);
  });

  it("navigates with arrows and selects with Enter", async () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        items={items.map((item) => (item.id === "b" ? { ...item, onSelect } : item))}
        title="Commands"
        placeholder="Type"
        emptyLabel="Nothing"
      />,
    );
    const input = await screen.findByRole("combobox", { name: "Commands" });
    await userEvent.type(input, "{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows the empty label when nothing matches", async () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => undefined}
        items={items}
        title="Commands"
        placeholder="Type"
        emptyLabel="Nothing found"
      />,
    );
    await userEvent.type(await screen.findByRole("combobox"), "zzzz");
    expect(screen.getByText("Nothing found")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders copy and hides the illustration from assistive tech", () => {
    const { container } = render(
      <EmptyState illustration="offline" title="No connection" description="Check internet" />,
    );
    expect(screen.getByText("No connection")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
