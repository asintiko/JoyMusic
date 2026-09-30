import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DemoPhone from "@/landing/components/demo-phone";
import { FaqAccordion } from "@/landing/components/faq-accordion";
import { LandingLangSwitch } from "@/landing/components/lang-switch";
import { ThemesShowcase } from "@/landing/components/themes-showcase";
import { landingCopy } from "@/landing/copy";
import {
  demoInitialState,
  demoReducer,
  demoStepNumber,
  type DemoAction,
  type DemoState,
} from "@/landing/demo-machine";

const faqItems = landingCopy.en.faq.items.slice(0, 3);

describe("FaqAccordion", () => {
  it("wires buttons to regions and toggles aria-expanded", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={faqItems} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
    expect(buttons[1]).toHaveAttribute("aria-expanded", "false");
    const controls = buttons[1]?.getAttribute("aria-controls") ?? "";
    const region = document.getElementById(controls);
    expect(region).toHaveAttribute("role", "region");
    expect(region).toHaveAttribute("aria-labelledby", buttons[1]?.id);
    await user.click(buttons[1] as HTMLElement);
    expect(buttons[1]).toHaveAttribute("aria-expanded", "true");
    await user.click(buttons[1] as HTMLElement);
    expect(buttons[1]).toHaveAttribute("aria-expanded", "false");
  });

  it("moves focus between questions with arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={faqItems} />);
    const buttons = screen.getAllByRole("button");
    buttons[0]?.focus();
    await user.keyboard("{ArrowDown}");
    expect(buttons[1]).toHaveFocus();
    await user.keyboard("{End}");
    expect(buttons[2]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(buttons[0]).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(buttons[2]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(buttons[0]).toHaveFocus();
  });

  it("can start fully collapsed", () => {
    render(<FaqAccordion items={faqItems} initialOpen={null} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
  });
});

describe("LandingLangSwitch", () => {
  afterEach(() => {
    document.cookie = "jm-locale=; path=/; max-age=0";
    window.localStorage.clear();
  });

  it("links to each landing locale and marks the current one", () => {
    render(<LandingLangSwitch locale="ru" label="Language" />);
    const nav = screen.getByRole("navigation", { name: "Language" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/ru", "/en"]);
    expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([null, "page", null]);
    expect(links.map((link) => link.getAttribute("hreflang"))).toEqual(["uz", "ru", "en"]);
  });

  it("persists the chosen locale on click", () => {
    render(<LandingLangSwitch locale="uz" label="Til" />);
    const english = screen.getByRole("link", { name: "English" });
    english.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(english);
    expect(document.cookie).toContain("jm-locale=en");
    expect(window.localStorage.getItem("jm:locale")).toBe("en");
  });
});

describe("demo state machine", () => {
  const run = (actions: DemoAction[], from: DemoState = demoInitialState) =>
    actions.reduce(demoReducer, from);

  it("walks the full request flow", () => {
    let state = run([{ type: "open" }]);
    expect(state.step).toBe("results");
    state = run([{ type: "pick", trackId: "night-signal" }], state);
    expect(state).toMatchObject({ step: "compose", trackId: "night-signal", dedication: false });
    state = run([{ type: "toggleDedication" }, { type: "send" }], state);
    expect(state).toMatchObject({ step: "sent", dedication: true });
    state = run([{ type: "advance" }], state);
    expect(state.step).toBe("accepted");
    state = run([{ type: "advance" }], state);
    expect(state.step).toBe("playing");
    expect(run([{ type: "advance" }], state).step).toBe("playing");
    expect(run([{ type: "reset" }], state)).toEqual(demoInitialState);
  });

  it("ignores actions that do not belong to the current step", () => {
    expect(run([{ type: "send" }]).step).toBe("idle");
    expect(run([{ type: "pick", trackId: "x" }]).step).toBe("idle");
    expect(run([{ type: "toggleDedication" }]).dedication).toBe(false);
    expect(run([{ type: "advance" }]).step).toBe("idle");
  });

  it("goes back one step at a time", () => {
    let state = run([{ type: "open" }, { type: "pick", trackId: "ikat-dreams" }]);
    state = run([{ type: "back" }], state);
    expect(state).toMatchObject({ step: "results", trackId: null });
    expect(run([{ type: "back" }], state).step).toBe("idle");
  });

  it("numbers steps from one", () => {
    expect(demoStepNumber("idle")).toBe(1);
    expect(demoStepNumber("playing")).toBe(6);
  });
});

describe("DemoPhone", () => {
  it("runs the simulated request from search to playing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const copy = landingCopy.en.demo.copy;
      render(<DemoPhone copy={copy} />);
      fireEvent.click(screen.getByRole("button", { name: copy.searchPlaceholder }));
      fireEvent.click(await screen.findByRole("button", { name: `${copy.request}: Night Signal` }));
      fireEvent.click(
        await screen.findByRole("button", { name: new RegExp(copy.dedicationLabel) }),
      );
      expect(screen.getByText(copy.dedicationValue)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: copy.send }));
      expect(await screen.findByText(copy.sentTitle)).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });
      expect(await screen.findByText(copy.acceptedTitle)).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2400);
      });
      expect(await screen.findByText(copy.playingTitle)).toBeInTheDocument();
      fireEvent.click(await screen.findByRole("button", { name: copy.restart }));
      expect(
        await screen.findByRole("button", { name: copy.searchPlaceholder }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ThemesShowcase", () => {
  it("switches the stage theme through the radio group", async () => {
    const user = userEvent.setup();
    const placeholders = { club: "", lounge: "", cafe: "" };
    render(<ThemesShowcase copy={landingCopy.en.themes} placeholders={placeholders} />);
    const stage = screen.getByTestId("theme-stage");
    expect(stage).toHaveAttribute("data-theme", "club");
    const group = screen.getByRole("radiogroup", { name: landingCopy.en.themes.switchLabel });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    await user.click(radios[1] as HTMLElement);
    expect(stage).toHaveAttribute("data-theme", "lounge");
    await user.click(radios[2] as HTMLElement);
    expect(stage).toHaveAttribute("data-theme", "cafe");
    radios[2]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(stage).toHaveAttribute("data-theme", "club");
  });
});
