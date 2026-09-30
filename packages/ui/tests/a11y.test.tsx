import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import {
  Badge,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  IconButton,
  Input,
  Logo,
  NowPlayingHero,
  ProgressBar,
  QueueItem,
  SearchInput,
  StatusPill,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TrackRow,
} from "../src";

async function violationsOf(ui: React.ReactElement) {
  const { container } = render(ui);
  const results = await axe(container);
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

describe("axe smoke", () => {
  it("buttons and controls", async () => {
    expect(
      await violationsOf(
        <div>
          <Button>Request</Button>
          <Button loading>Saving</Button>
          <IconButton label="Play" icon={<span>▶</span>} />
          <Switch label="Requests open" />
          <Input label="Dedication" hint="Optional" />
          <Input label="Table" error="Required" />
          <SearchInput value="" onValueChange={() => undefined} aria-label="Search" />
        </div>,
      ),
    ).toEqual([]);
  });

  it("chips, badges and pills", async () => {
    expect(
      await violationsOf(
        <div>
          <ChipRow aria-label="Suggestions">
            <Chip selected>Club</Chip>
            <Chip selected={false}>Slow</Chip>
          </ChipRow>
          <Badge tone="brand">New</Badge>
          <StatusPill status="accepted" />
        </div>,
      ),
    ).toEqual([]);
  });

  it("track and queue rows", async () => {
    expect(
      await violationsOf(
        <div role="list">
          <TrackRow title="Levitating" artist="Dua Lipa" durationSec={203} onSelect={() => undefined} />
          <QueueItem
            position={1}
            request={{
              title: "Blinding Lights",
              artist: "The Weeknd",
              artworkUrl: null,
              status: "accepted",
              votes: 2,
              tableLabel: "Table 4",
              note: null,
              dedicatedTo: null,
            }}
          />
        </div>,
      ),
    ).toEqual([]);
  });

  it("now playing hero", async () => {
    expect(
      await violationsOf(
        <NowPlayingHero
          title="Oydin kecha"
          artist="Ozod & Nilufar"
          progress={0.4}
          durationSec={214}
          bpm={118}
          dedication="For Aziz"
          nowPlayingLabel="Now playing"
          progressLabel="Track progress"
        />,
      ),
    ).toEqual([]);
  });

  it("table, progress, empty state, logo, card", async () => {
    expect(
      await violationsOf(
        <div>
          <Table aria-label="Venues">
            <TableHead>
              <TableRow>
                <TableHeaderCell sortable direction="asc" sortLabel="Sort by venue">
                  Venue
                </TableHeaderCell>
                <TableHeaderCell numeric>Requests</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Nomad</TableCell>
                <TableCell numeric>12</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <ProgressBar progress={0.3} label="Progress" />
          <EmptyState illustration="search" title="Nothing found" description="Try again" />
          <Logo variant="horizontal" />
          <Card>Card</Card>
        </div>,
      ),
    ).toEqual([]);
  });
});
