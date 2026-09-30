import {
  Bell,
  Calendar,
  ChevronsUpDown,
  CreditCard,
  Disc3,
  LayoutDashboard,
  LineChart,
  Palette,
  Plus,
  QrCode,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
  ListMusic,
  Scan,
  UserRound,
  Ban,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Avatar,
  Badge,
  Kbd,
  Button,
  Logo,
  Metric,
  Shortcut,
  Sparkline,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  TrackRow,
  cx,
} from "../../../src";
import { adminHours, adminVenues, spark, tracks } from "../data";
import { usePlayground } from "../context";
import { Frame } from "./kit";

const statusTone = { live: "playing", idle: "neutral", paused: "next" } as const;

function NavItem({ icon, label, active }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <span
      aria-current={active || undefined}
      className={cx(
        "flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] font-semibold transition-colors [&>svg]:size-[17px]",
        active
          ? "bg-brand-soft text-fg shadow-[inset_2px_0_0_var(--jm-brand)] [&>svg]:text-brand"
          : "text-fg-muted hover:bg-surface-2 [&>svg]:text-fg-subtle",
      )}
    >
      {icon}
      {label}
    </span>
  );
}

export function AdminDashboard() {
  const { s } = usePlayground();
  const nav = s.adminNav;
  const peak = Math.max(...adminHours);
  const peakIndex = adminHours.indexOf(peak);

  return (
    <Frame width={1440} height={900} label="admin-dashboard">
      <div className="flex h-full bg-canvas">
        <aside className="flex w-[240px] shrink-0 flex-col gap-5 border-r border-line bg-surface-1 px-3 pb-3 pt-4">
          <div className="px-2">
            <Logo variant="horizontal" height={26} />
          </div>
          <button
            type="button"
            className="focus-ring flex h-11 items-center gap-2.5 rounded-md bg-surface-2 px-2.5 text-left hairline hover:bg-surface-3"
          >
            <Avatar name="Nomad Group" size={28} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-bold">Nomad Group</span>
              <span className="block truncate text-[11px] text-fg-subtle">6 · {nav.venues}</span>
            </span>
            <ChevronsUpDown aria-hidden="true" className="size-4 text-fg-subtle" />
          </button>
          <nav aria-label="Admin" className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex flex-col gap-0.5">
              <p className="type-eyebrow px-3 pb-1.5 text-fg-disabled">{s.adminGroupOperate}</p>
              <NavItem active icon={<LayoutDashboard aria-hidden="true" />} label={nav.overview} />
              <NavItem icon={<Store aria-hidden="true" />} label={nav.venues} />
              <NavItem icon={<QrCode aria-hidden="true" />} label={nav.qr} />
              <NavItem icon={<Disc3 aria-hidden="true" />} label={nav.djs} />
              <NavItem icon={<ListMusic aria-hidden="true" />} label={nav.sessions} />
              <NavItem icon={<ShieldCheck aria-hidden="true" />} label={nav.moderation} />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="type-eyebrow px-3 pb-1.5 text-fg-disabled">{s.adminGroupInsight}</p>
              <NavItem icon={<LineChart aria-hidden="true" />} label={nav.analytics} />
              <NavItem icon={<Palette aria-hidden="true" />} label={nav.branding} />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="type-eyebrow px-3 pb-1.5 text-fg-disabled">{s.adminGroupAccount}</p>
              <NavItem icon={<CreditCard aria-hidden="true" />} label={nav.billing} />
              <NavItem icon={<ScrollText aria-hidden="true" />} label={nav.audit} />
            </div>
          </nav>
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <Avatar name="Dilnoza Karimova" size={32} status="online" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[12.5px] font-bold">Dilnoza Karimova</span>
              <span className="block truncate text-[11px] text-fg-subtle">owner</span>
            </span>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-6">
            <div className="min-w-0">
              <h1 className="type-title-md truncate">{s.adminTitle}</h1>
              <p className="text-[12px] text-fg-subtle">{s.adminSubtitle}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                className="focus-ring inline-flex h-9 w-[260px] items-center gap-2.5 rounded-md bg-surface-2 px-3 text-[13px] font-medium text-fg-subtle hairline hover:bg-surface-3"
              >
                <Search aria-hidden="true" className="size-4" />
                <span className="flex-1 truncate whitespace-nowrap text-left">{s.cmdPlaceholder.replace("…", "")}</span>
                <Shortcut keys={["mod", "k"]} />
              </button>
              <Tabs defaultValue="d7" variant="segmented">
                <TabsList>
                  <TabsTrigger value="d7">{s.adminRange.d7}</TabsTrigger>
                  <TabsTrigger value="d30">{s.adminRange.d30}</TabsTrigger>
                  <TabsTrigger value="d90">{s.adminRange.d90}</TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted hairline">
                <Calendar aria-hidden="true" className="size-4" />
              </span>
              <span className="relative inline-flex size-9 items-center justify-center rounded-md text-fg-muted hairline">
                <Bell aria-hidden="true" className="size-4" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand" />
              </span>
              <Button size="md" leftIcon={<Plus aria-hidden="true" className="size-4" />}>
                {s.adminNewVenue}
              </Button>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 flex-col gap-4 p-6">
            <div className="grid grid-cols-4 gap-4">
              <Metric label={s.kpiRequests} value="7 385" delta="+18,4%" trend="up" icon={<ListMusic aria-hidden="true" />} spark={spark.requests} />
              <Metric label={s.kpiGuests} value="3 942" delta="+9,1%" trend="up" icon={<UserRound aria-hidden="true" />} spark={spark.guests} sparkTone="playing" />
              <Metric label={s.kpiScans} value="12 806" delta="+22,7%" trend="up" icon={<Scan aria-hidden="true" />} spark={spark.scans} />
              <Metric label={s.kpiDecline} value="4,2%" delta="-1,3%" trend="down" goodWhen="down" icon={<Ban aria-hidden="true" />} spark={spark.decline} sparkTone="next" />
            </div>

            <div className="grid h-[262px] shrink-0 grid-cols-[minmax(0,1fr)_400px] gap-4">
              <section className="flex min-h-0 flex-col rounded-lg bg-surface-1 p-4 hairline">
                <header className="flex items-start justify-between">
                  <div>
                    <h2 className="type-title-sm">{s.chartHours}</h2>
                    <p className="mt-0.5 text-[12px] text-fg-subtle">{s.chartHoursNote}</p>
                  </div>
                  <Badge tone="brand" size="sm">
                    <span className="type-mono">{peak}</span>
                  </Badge>
                </header>
                <div className="mt-3 flex min-h-[120px] flex-1 items-stretch gap-1.5" role="img" aria-label={s.chartHours}>
                  {adminHours.map((value, hour) => (
                    <div key={hour} className="group/bar flex flex-1 flex-col items-center justify-end gap-1.5">
                      <div
                        className={cx(
                          "w-full rounded-t-[5px] transition-[filter]",
                          hour === peakIndex ? "bg-brand-gradient" : "bg-[color-mix(in_oklab,var(--jm-brand)_32%,var(--jm-surface-3))]",
                        )}
                        style={{ height: `${Math.max(2, (value / peak) * 84)}%` }}
                      />
                      <span className="type-mono h-3 text-[9.5px] text-fg-subtle">
                        {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="flex flex-col rounded-lg bg-surface-1 p-4 hairline">
                <h2 className="type-title-sm mb-1">{s.topTracks}</h2>
                <div role="list" className="flex flex-col">
                  {[tracks[0], tracks[1], tracks[3], tracks[6]].map((item, index) =>
                    item ? (
                      <TrackRow
                        key={item.id}
                        title={item.title}
                        artist={item.artist}
                        size="sm"
                        index={index + 1}
                        trailing={
                          <span className="type-mono text-[12px] font-bold text-fg-muted">
                            {[412, 388, 301, 267][index]}
                          </span>
                        }
                      />
                    ) : null,
                  )}
                </div>
              </section>
            </div>

            <section className="flex min-h-0 flex-1 flex-col">
              <Table aria-label={s.venuesTable} containerClassName="min-h-0">
                <TableHead>
                  <TableRow interactive={false}>
                    <TableHeaderCell sortable direction="desc">
                      {s.colVenue}
                    </TableHeaderCell>
                    <TableHeaderCell>{s.colCity}</TableHeaderCell>
                    <TableHeaderCell>{s.colTheme}</TableHeaderCell>
                    <TableHeaderCell>{s.colDj}</TableHeaderCell>
                    <TableHeaderCell numeric sortable>
                      {s.colRequests}
                    </TableHeaderCell>
                    <TableHeaderCell>{s.colTrend}</TableHeaderCell>
                    <TableHeaderCell>{s.colStatus}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminVenues.map((venue, index) => (
                    <TableRow key={venue.name} selected={index === 0}>
                      <TableCell className="font-bold">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={venue.name} size={24} />
                          {venue.name}
                        </span>
                      </TableCell>
                      <TableCell muted>{venue.city}</TableCell>
                      <TableCell>
                        <Badge size="sm" tone={venue.theme === "club" ? "brand" : venue.theme === "lounge" ? "next" : "info"}>
                          {s.themeNames[venue.theme]}
                        </Badge>
                      </TableCell>
                      <TableCell muted>{venue.dj}</TableCell>
                      <TableCell numeric mono className="font-bold">
                        {venue.requests.toLocaleString("en-US").replace(",", " ")}
                      </TableCell>
                      <TableCell>
                        <Sparkline values={venue.trend} width={84} height={22} fill={false} tone={venue.status === "paused" ? "next" : "brand"} />
                      </TableCell>
                      <TableCell>
                        <Badge size="sm" dot tone={statusTone[venue.status]}>
                          {venue.status === "live" ? s.statusLive : venue.status === "idle" ? s.statusIdle : s.statusPaused}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex h-10 shrink-0 items-center justify-between px-1 pt-2 text-[12px] font-semibold text-fg-subtle">
                <span className="type-mono">1–6 / 24</span>
                <span className="inline-flex items-center gap-1">
                  <Kbd>J</Kbd>
                  <Kbd>K</Kbd>
                </span>
              </div>
            </section>
          </main>
        </div>
      </div>
    </Frame>
  );
}

