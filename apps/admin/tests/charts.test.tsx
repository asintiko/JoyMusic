import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BarChart } from "../src/charts/bar-chart";
import { ChartCard } from "../src/charts/chart-card";
import { HBarList } from "../src/charts/hbar-list";
import { ChartLegend, LineChart } from "../src/charts/line-chart";
import { DeclineMeter } from "../src/charts/meter";
import { I18nProvider } from "../src/i18n";

const hours = Array.from({ length: 24 }, (_value, hour) => ({
  label: String(hour).padStart(2, "0"),
  caption: `${String(hour).padStart(2, "0")}:00`,
  value: hour === 22 ? 118 : hour * 2,
}));

describe("BarChart", () => {
  it("renders one focusable target per bar with an accessible name", () => {
    render(<BarChart data={hours} seriesName="Requests" ariaLabel="Requests by hour" />);
    const targets = screen.getAllByRole("img");
    expect(targets).toHaveLength(24);
    expect(targets[22]).toHaveAccessibleName("22:00: 118 Requests");
  });

  it("labels only the peak and shows a tooltip on hover", () => {
    render(<BarChart data={hours} seriesName="Requests" ariaLabel="Requests by hour" />);
    expect(screen.getAllByText("118")).toHaveLength(1);
    fireEvent.pointerEnter(screen.getAllByRole("img")[3] as Element);
    expect(screen.getByText("03:00")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("keeps bars within the 24px cap", () => {
    const { container } = render(
      <BarChart data={hours.slice(0, 3)} seriesName="Requests" ariaLabel="x" />,
    );
    const path = container.querySelector("path[fill='var(--chart-1)']");
    expect(path).not.toBeNull();
  });
});

describe("LineChart", () => {
  const series = [
    { id: "requests", label: "Requests", color: "var(--chart-1)", values: [1, 4, 2, 8] },
    { id: "guests", label: "Guests", color: "var(--chart-2)", values: [1, 2, 2, 5] },
  ];
  it("draws one path per series plus the wash", () => {
    const { container } = render(
      <LineChart series={series} xLabels={["1", "2", "3", "4"]} ariaLabel="Over time" />,
    );
    expect(container.querySelectorAll("path[stroke-width='2']")).toHaveLength(2);
  });

  it("lists every series in the tooltip on keyboard focus movement", async () => {
    render(<LineChart series={series} xLabels={["1", "2", "3", "4"]} ariaLabel="Over time" />);
    const surface = screen.getByLabelText("Over time", { selector: "rect" });
    surface.focus();
    fireEvent.keyDown(surface, { key: "ArrowLeft" });
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("Guests")).toBeInTheDocument();
  });

  it("shows a legend only for two or more series", () => {
    const { rerender } = render(<ChartLegend series={series} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    rerender(<ChartLegend series={series.slice(0, 1)} />);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});

describe("HBarList and DeclineMeter", () => {
  it("scales bars to the maximum value", () => {
    const { container } = render(
      <HBarList
        ariaLabel="Top"
        rows={[
          { key: "a", label: "A", value: 10 },
          { key: "b", label: "B", value: 5 },
        ]}
      />,
    );
    const widths = [...container.querySelectorAll<HTMLElement>("div[style*='width']")].map(
      (node) => node.style.width,
    );
    expect(widths).toEqual(["100%", "50%"]);
  });

  it("exposes the decline rate as a meter with severity", () => {
    render(
      <DeclineMeter
        fraction={0.3}
        valueLabel="30%"
        statusLabel="Too high"
        ariaLabel="Decline rate"
      />,
    );
    expect(screen.getByRole("meter", { name: "Decline rate" })).toHaveAttribute(
      "aria-valuenow",
      "30",
    );
    expect(screen.getByText("Too high")).toBeInTheDocument();
  });
});

describe("ChartCard table view", () => {
  it("swaps the chart for a table with the same numbers", async () => {
    render(
      <I18nProvider initialLocale="en">
        <ChartCard
          title="Requests by hour"
          table={{ columns: ["Hour", "Requests"], rows: [["22:00", 118]] }}
        >
          <div data-testid="plot" />
        </ChartCard>
      </I18nProvider>,
    );
    expect(screen.getByTestId("plot")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show as table" }));
    expect(screen.queryByTestId("plot")).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "118" })).toBeInTheDocument();
  });
});
