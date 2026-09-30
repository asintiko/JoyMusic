import {
  ArrowRight,
  Command as CommandIcon,
  Disc3,
  Download,
  ListMusic,
  Music2,
  Play,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { requestStatuses, suggestionSectionIds, suggestionTitles } from "@joymusic/shared";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Checkbox,
  Chip,
  ChipRow,
  CommandPalette,
  Cover,
  Dialog,
  EmptyState,
  Equalizer,
  IconButton,
  Input,
  Kbd,
  Logo,
  Marquee,
  Metric,
  NowPlayingHero,
  ProgressBar,
  QueueItem,
  SearchInput,
  Select,
  Sheet,
  Shortcut,
  Skeleton,
  SkeletonText,
  Spinner,
  StatusPill,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TrackRow,
  coverPatterns,
  coverSpec,
  cx,
  logoMinHeights,
  useCommandPalette,
  useToast,
} from "../../src";
import type { CoverPattern, EmptyIllustration, SortDirection } from "../../src";
import { requestStatusLabels } from "@joymusic/shared";
import { usePlayground } from "./context";
import { buildRequest, dedicationNames, nowPlayingTrack, tracks } from "./data";
import { images } from "./images";

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-10">
      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="type-title-lg">{title}</h2>
        {note ? <p className="type-body-sm text-fg-subtle">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, token, ring }: { name: string; token: string; ring?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span
        className={cx("h-14 rounded-md", ring && "shadow-[inset_0_0_0_1px_var(--jm-line-strong)]")}
        style={{ background: `var(${token})` }}
      />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[12px] font-bold">{name}</span>
        <span className="type-mono block truncate text-[10.5px] text-fg-subtle">{token}</span>
      </span>
    </div>
  );
}

function seedForPattern(pattern: CoverPattern): string {
  for (let index = 0; index < 4000; index++) {
    const seed = `${pattern} ${index}`;
    if (coverSpec(seed).pattern === pattern) return seed;
  }
  return pattern;
}

const illustrations: EmptyIllustration[] = [
  "search",
  "queue",
  "inbox",
  "closed",
  "offline",
  "qr",
  "error",
];

function emptyCopy(id: EmptyIllustration, s: ReturnType<typeof usePlayground>["s"]) {
  switch (id) {
    case "search":
      return [s.emptySearchTitle, s.emptySearchText];
    case "queue":
      return [s.emptyQueueTitle, s.emptyQueueText];
    case "inbox":
      return [s.emptyInboxTitle, s.emptyInboxText];
    case "closed":
      return [s.emptyClosedTitle, s.emptyClosedText];
    case "offline":
      return [s.emptyOfflineTitle, s.emptyOfflineText];
    case "qr":
      return [s.emptyQrTitle, s.emptyQrText];
    case "error":
      return [s.emptyErrorTitle, s.emptyErrorText];
  }
}

export function Gallery() {
  const { lang, s, theme } = usePlayground();
  const toast = useToast();
  const palette = useCommandPalette();
  const [sheetSide, setSheetSide] = useState<"bottom" | "right" | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortDirection>("desc");
  const [progress, setProgress] = useState(0.42);
  const track = nowPlayingTrack;
  const names = dedicationNames(lang);

  const commands = useMemo(
    () => [
      {
        id: "accept",
        label: s.djAccept,
        group: s.djIncoming,
        icon: <ListMusic aria-hidden="true" />,
        shortcut: <Kbd>A</Kbd>,
        onSelect: () => toast.success(s.djAccept),
      },
      {
        id: "decline",
        label: s.djDecline,
        group: s.djIncoming,
        icon: <Trash2 aria-hidden="true" />,
        shortcut: <Kbd>D</Kbd>,
        onSelect: () => toast.error(s.djDecline),
      },
      {
        id: "open",
        label: s.djRequestsOpen,
        group: s.djQueue,
        icon: <Disc3 aria-hidden="true" />,
        onSelect: () => undefined,
      },
      {
        id: "settings",
        label: s.adminNav.branding,
        group: s.adminGroupAccount,
        icon: <Settings aria-hidden="true" />,
        onSelect: () => undefined,
      },
      ...tracks.slice(0, 4).map((item) => ({
        id: item.id,
        label: `${item.title} — ${item.artist}`,
        group: s.found,
        icon: <Music2 aria-hidden="true" />,
        onSelect: () => undefined,
      })),
    ],
    [s, toast],
  );

  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-24 pt-8" data-gallery={theme}>
      <div className="flex flex-wrap items-end justify-between gap-6 pb-10">
        <div>
          <Logo variant="horizontal" height={40} />
          <h1 className="type-display-md mt-6 max-w-[16ch]">After-dark precision</h1>
          <p className="type-body-lg mt-3 max-w-[56ch] text-fg-muted">
            @joymusic/ui: tokens, components and composed screens. Theme:{" "}
            <strong className="text-fg">{theme}</strong>, language:{" "}
            <strong className="text-fg">{lang}</strong>.
          </p>
        </div>
        <div className="flex gap-2" data-testid="overlay-triggers">
          <Button
            variant="secondary"
            onClick={() => setSheetSide("bottom")}
            data-testid="open-sheet"
          >
            Sheet
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSheetSide("right")}
            data-testid="open-side-sheet"
          >
            Side sheet
          </Button>
          <Button variant="secondary" onClick={() => setDialogOpen(true)} data-testid="open-dialog">
            Dialog
          </Button>
          <Button
            variant="secondary"
            data-testid="open-toast"
            onClick={() => {
              toast.toast({
                title: s.toastQueued,
                description: s.toastQueuedText,
                tone: "success",
                duration: 60000,
              });
              toast.toast({ title: s.toastDeclined, tone: "danger", duration: 60000 });
            }}
          >
            Toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => palette.setOpen(true)}
            data-testid="open-palette"
            rightIcon={<Shortcut keys={["mod", "k"]} />}
          >
            Palette
          </Button>
        </div>
      </div>

      <Section id="tokens" title="Tokens" note="Surfaces, foreground, signal colours">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:grid-cols-12">
          <Swatch name="canvas" token="--jm-canvas" ring />
          <Swatch name="surface 1" token="--jm-surface-1" ring />
          <Swatch name="surface 2" token="--jm-surface-2" ring />
          <Swatch name="surface 3" token="--jm-surface-3" ring />
          <Swatch name="surface 4" token="--jm-surface-4" ring />
          <Swatch name="surface 5" token="--jm-surface-5" ring />
          <Swatch name="fg" token="--jm-fg" />
          <Swatch name="fg muted" token="--jm-fg-muted" />
          <Swatch name="fg subtle" token="--jm-fg-subtle" />
          <Swatch name="brand" token="--jm-brand" />
          <Swatch name="playing" token="--jm-playing" />
          <Swatch name="next" token="--jm-next" />
          <Swatch name="danger" token="--jm-danger" />
          <Swatch name="success" token="--jm-success" />
          <Swatch name="info" token="--jm-info" />
          <Swatch name="brand from" token="--jm-brand-from" />
          <Swatch name="brand to" token="--jm-brand-to" />
          <Swatch name="focus" token="--jm-focus" />
        </div>
        <div className="mt-6 h-16 rounded-lg bg-brand-gradient shadow-glow-brand" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["shadow-1", "shadow-2", "shadow-3", "shadow-4"] as const).map((name) => (
            <div
              key={name}
              className={cx(
                "flex h-20 items-center justify-center rounded-lg bg-surface-2 text-[12px] font-bold text-fg-muted",
                name,
              )}
            >
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="type"
        title="Typography"
        note="Unbounded / Manrope / JetBrains Mono, uz + ru + en"
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="type-display-lg">Oʻzbek tili: goʻzal gʻoya</p>
            <p className="type-display-md">Заказывай трек за секунды</p>
            <p className="type-display-md text-brand-gradient">Request the night</p>
          </div>
          <div className="flex flex-col gap-3">
            <p className="type-title-lg">Sarlavha: Toʻyxona, Gʻiyos, Oʻrikzor</p>
            <p className="type-title-md">Заголовок: Ёлки, щёлк, Ъ и Ы</p>
            <p className="type-body-lg text-fg-muted">
              Musiqa tanlang, DJ navbatga qoʻshadi. Выберите музыку, диджей добавит её в очередь.
              Pick a song and the DJ queues it.
            </p>
            <p className="type-body text-fg-muted">Body 15: oʻ gʻ Oʻ Gʻ ʼ ʻ, ё ў қ ҳ ғ, ç é ñ</p>
            <p className="type-mono text-fg">124 BPM · 8A · 03:26 · 22:47:09</p>
            <p className="type-eyebrow text-fg-subtle">Eyebrow label · Yorliq · Метка</p>
          </div>
        </div>
      </Section>

      <Section id="buttons" title="Buttons" note="4 variants, 4 sizes, loading, disabled">
        <div className="flex flex-col gap-5">
          {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <span className="type-mono w-20 text-[11px] text-fg-subtle">{variant}</span>
              <Button variant={variant} size="sm">
                {s.request}
              </Button>
              <Button
                variant={variant}
                size="md"
                leftIcon={<Play aria-hidden="true" className="size-4" />}
              >
                {s.request}
              </Button>
              <Button
                variant={variant}
                size="lg"
                rightIcon={<ArrowRight aria-hidden="true" className="size-4" />}
              >
                {s.request}
              </Button>
              <Button variant={variant} size="xl">
                {s.request}
              </Button>
              <Button variant={variant} loading>
                {s.request}
              </Button>
              <Button variant={variant} disabled>
                {s.request}
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <span className="type-mono w-20 text-[11px] text-fg-subtle">icon</span>
            {(["ghost", "secondary", "primary", "glass", "danger"] as const).map((variant) => (
              <IconButton
                key={variant}
                variant={variant}
                label={variant}
                icon={<Play aria-hidden="true" className="size-[18px]" />}
              />
            ))}
            <IconButton
              label="pressed"
              pressed
              icon={<ListMusic aria-hidden="true" className="size-[18px]" />}
            />
            <Tooltip content={s.djSearchAction} shortcut={<Shortcut keys={["mod", "k"]} />}>
              <IconButton
                label={s.djSearchAction}
                variant="secondary"
                icon={<CommandIcon aria-hidden="true" className="size-[18px]" />}
              />
            </Tooltip>
            <Button
              variant="secondary"
              leftIcon={<Download aria-hidden="true" className="size-4" />}
            >
              macOS
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Download aria-hidden="true" className="size-4" />}
            >
              Windows
            </Button>
          </div>
        </div>
      </Section>

      <Section id="forms" title="Form controls">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Input label={s.fieldDedication} placeholder={`${names[0]}`} hint={s.sheetText} />
          <Input label={s.fieldTable} defaultValue="7x" error={s.emptyErrorText} />
          <Select label={s.colTheme} defaultValue="club">
            <option value="club">{s.themeNames.club}</option>
            <option value="lounge">{s.themeNames.lounge}</option>
            <option value="cafe">{s.themeNames.cafe}</option>
          </Select>
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder={s.searchPlaceholder}
            clearLabel={s.clearSearch}
            shortcut={<Shortcut keys={["mod", "k"]} />}
            aria-label={s.searchPlaceholder}
          />
          <Textarea label={s.fieldNote} placeholder={s.note1} showCount maxLength={200} autoGrow />
          <div className="flex flex-col gap-4">
            <Switch defaultChecked label={s.djRequestsOpen} description={s.sheetText} />
            <Checkbox label={s.fieldNote} description={s.note1} defaultChecked />
            <Checkbox label={s.djAll} />
          </div>
        </div>
      </Section>

      <Section id="badges" title="Chips, badges, status">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {requestStatuses.map((status) => (
              <StatusPill key={status} status={status} label={requestStatusLabels[lang][status]} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {requestStatuses.map((status) => (
              <StatusPill
                key={status}
                status={status}
                size="lg"
                label={requestStatusLabels[lang][status]}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["neutral", "brand", "playing", "next", "danger", "success", "info"] as const).map(
              (tone) => (
                <Badge key={tone} tone={tone} dot>
                  {tone}
                </Badge>
              ),
            )}
          </div>
          <ChipRow bleed={false}>
            {suggestionSectionIds.map((id, index) => (
              <Chip key={id} selected={index === 0} tone="brand">
                {suggestionTitles[lang][id]}
              </Chip>
            ))}
          </ChipRow>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="outline">Outline</Chip>
            <Chip selected>Selected</Chip>
            <Chip count={12}>Count</Chip>
            <Chip size="sm">Small</Chip>
            <Chip size="lg">Large</Chip>
            <Avatar name="Dilnoza Karimova" status="online" />
            <Avatar name="Rustam" size={44} status="away" />
            <Spinner size={22} />
            <Shortcut keys={["mod", "shift", "k"]} />
            <Kbd>Esc</Kbd>
          </div>
        </div>
      </Section>

      <Section
        id="covers"
        title="Covers"
        note="Generative fallback from a string hash: 8 patterns, deterministic"
      >
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-8">
          {coverPatterns.map((pattern) => (
            <div key={pattern} className="flex flex-col gap-2">
              <Cover
                seed={seedForPattern(pattern)}
                alt={pattern}
                radius="cover"
                className="w-full"
                shadow
              />
              <span className="type-mono text-[10.5px] text-fg-subtle">{pattern}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-5">
          <div className="flex flex-col gap-2">
            <Cover
              src={images.heroLanding}
              placeholderSrc={images.heroLandingPlaceholder}
              priority
              seed="photo"
              alt="photo"
              size={140}
              radius="cover"
              shadow
            />
            <span className="type-mono text-[10.5px] text-fg-subtle">photo + blur-up</span>
          </div>
          <div className="flex flex-col gap-2">
            <Cover
              src="/missing.jpg"
              seed="Broken link"
              alt="fallback"
              size={140}
              radius="cover"
              shadow
            />
            <span className="type-mono text-[10.5px] text-fg-subtle">load error → generative</span>
          </div>
          {[24, 40, 64, 96].map((size) => (
            <Cover
              key={size}
              seed={`${tracks[size % 10]?.artist ?? ""} ${tracks[size % 10]?.title ?? ""}`}
              size={size}
              radius="sm"
            />
          ))}
          <Cover seed="Round" size={64} radius="full" />
        </div>
      </Section>

      <Section id="motion" title="Equalizer, progress, marquee">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="flex flex-col gap-4">
            <CardTitle>Equalizer</CardTitle>
            <div className="flex items-end gap-6 text-playing">
              <Equalizer height={28} bars={5} />
              <Equalizer height={28} bars={5} bpm={124} />
              <Equalizer height={28} bars={5} paused />
              <Equalizer height={16} bars={3} color="var(--jm-brand)" />
            </div>
            <CardDescription>default, 124 BPM, paused, compact</CardDescription>
          </Card>
          <Card className="flex flex-col gap-4">
            <CardTitle>ProgressBar</CardTitle>
            <ProgressBar
              progress={progress}
              label={s.progress}
              showTimes
              durationSec={track.durationSec}
            />
            <ProgressBar progress={0.7} label={s.progress} tone="playing" size="lg" />
            <ProgressBar progress={0.3} label={s.progress} tone="neutral" size="xs" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(progress * 100)}
              onChange={(event) => setProgress(Number(event.target.value) / 100)}
              aria-label={s.progress}
              className="accent-[var(--jm-brand)]"
            />
          </Card>
          <Card className="flex flex-col gap-4">
            <CardTitle>Marquee</CardTitle>
            <Marquee className="type-title-md w-full">
              {tracks[7]?.title} — {tracks[7]?.artist} — Nothing but the Beat (Extended Club Mix)
            </Marquee>
            <Marquee className="type-title-md w-full">{tracks[0]?.title}</Marquee>
            <div className="flex flex-col gap-2">
              <Skeleton shape="text" width="70%" />
              <SkeletonText lines={2} />
            </div>
          </Card>
        </div>
      </Section>

      <Section
        id="now-playing"
        title="NowPlayingHero"
        note="Tilt on pointer, marquee title, BPM pulse, dedication chip"
      >
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <Card variant="raised" padding="lg" className="relative overflow-hidden">
            <NowPlayingHero
              title={track.title}
              artist={track.artist}
              seed={`${track.artist} ${track.title}`}
              progress={0.4}
              elapsedSec={87}
              durationSec={track.durationSec}
              bpm={track.bpm}
              musicalKey={track.key}
              dedication={`${s.dedicationFor(names[0] ?? "")}, ${s.dedicationSample}`}
              nowPlayingLabel={s.nowPlaying}
              progressLabel={s.progress}
              size="phone"
            />
          </Card>
          <div className="flex flex-col gap-4">
            <Card variant="raised" padding="lg">
              <NowPlayingHero
                title={tracks[7]?.title ?? ""}
                artist={tracks[7]?.artist ?? ""}
                artworkUrl={images.heroLanding}
                progress={0.66}
                durationSec={245}
                bpm={126}
                nowPlayingLabel={s.nowPlaying}
                progressLabel={s.progress}
                size="desk"
                layout="split"
                paused
              />
            </Card>
            <div className="grid grid-cols-3 gap-4">
              <Metric
                label={s.kpiRequests}
                value="7 385"
                delta="+18,4%"
                trend="up"
                spark={[3, 5, 4, 7, 6, 9, 8, 12]}
              />
              <Metric
                label={s.kpiDecline}
                value="4,2%"
                delta="-1,3%"
                trend="down"
                goodWhen="down"
                spark={[9, 8, 8, 6, 7, 5, 5, 4]}
                sparkTone="next"
              />
              <Metric
                label={s.kpiGuests}
                value="3 942"
                trend="flat"
                delta="0%"
                spark={[5, 5, 6, 5, 5, 6, 5, 5]}
                sparkTone="playing"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section id="lists" title="TrackRow and QueueItem" note="guest, dj, tv, incoming">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="sm">
            <div role="list">
              <TrackRow
                title={tracks[0]?.title ?? ""}
                artist={tracks[0]?.artist ?? ""}
                album={tracks[0]?.album}
                durationSec={214}
                state="playing"
              />
              <TrackRow
                title={tracks[1]?.title ?? ""}
                artist={tracks[1]?.artist ?? ""}
                album={tracks[1]?.album}
                durationSec={200}
                explicit
                explicitLabel={s.explicit}
                trailing={
                  <IconButton
                    label={s.request}
                    variant="secondary"
                    icon={<Search aria-hidden="true" className="size-4" />}
                  />
                }
              />
              <TrackRow
                title={tracks[2]?.title ?? ""}
                artist={tracks[2]?.artist ?? ""}
                durationSec={231}
                index={3}
                size="sm"
              />
              <TrackRow
                title={tracks[3]?.title ?? ""}
                artist={tracks[3]?.artist ?? ""}
                durationSec={203}
                state="disabled"
                size="sm"
              />
            </div>
          </Card>
          <Card padding="sm">
            <div role="list" className="flex flex-col gap-1">
              <QueueItem
                variant="guest"
                position={1}
                mineLabel={s.mine}
                request={buildRequest(1, "accepted", { mine: true, dedicatedTo: names[0] ?? null })}
                dedicationText={s.dedicationFor(names[0] ?? "")}
              />
              <QueueItem variant="guest" position={2} request={buildRequest(3, "pending")} />
              <QueueItem variant="guest" position={3} request={buildRequest(4, "declined")} />
              <QueueItem
                variant="dj"
                position={4}
                highlighted
                votesLabel={s.votes}
                request={buildRequest(5, "accepted", { votes: 3, tableLabel: s.tableLabel(4) })}
              />
            </div>
          </Card>
          <QueueItem
            variant="incoming"
            ago={s.ago(2)}
            votesLabel={s.votes}
            dedicationText={s.dedicationFor(names[1] ?? "")}
            request={buildRequest(7, "pending", {
              votes: 3,
              tableLabel: s.tableLabel(9),
              dedicatedTo: names[1] ?? null,
              note: s.note2,
            })}
            actions={
              <>
                <Button size="sm" className="flex-1">
                  {s.djAccept}
                </Button>
                <Button size="sm" variant="secondary">
                  {s.djLater}
                </Button>
              </>
            }
          />
          <QueueItem
            variant="tv"
            position={1}
            request={buildRequest(2, "accepted", { dedicatedTo: names[2] ?? null })}
            dedicationText={s.dedicationFor(names[2] ?? "")}
          />
        </div>
      </Section>

      <Section id="cards" title="Cards">
        <div className="grid gap-4 md:grid-cols-5">
          {(["flat", "raised", "glass", "outline", "brand"] as const).map((variant) => (
            <Card key={variant} variant={variant} interactive tabIndex={0}>
              <CardTitle>{variant}</CardTitle>
              <CardDescription className="mt-1">{s.sheetText}</CardDescription>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="tabs-table" title="Tabs and Table">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <Tabs defaultValue="search">
              <TabsList>
                <TabsTrigger value="search">{s.navSearch}</TabsTrigger>
                <TabsTrigger value="queue" count={8}>
                  {s.navQueue}
                </TabsTrigger>
                <TabsTrigger value="mine">{s.navMine}</TabsTrigger>
              </TabsList>
              <TabsContent value="search" className="pt-4 text-fg-muted">
                {s.searchPlaceholder}
              </TabsContent>
              <TabsContent value="queue" className="pt-4 text-fg-muted">
                {s.upNext}
              </TabsContent>
              <TabsContent value="mine" className="pt-4 text-fg-muted">
                {s.yourRequest}
              </TabsContent>
            </Tabs>
            <Tabs defaultValue="d7" variant="segmented">
              <TabsList>
                <TabsTrigger value="d7">{s.adminRange.d7}</TabsTrigger>
                <TabsTrigger value="d30">{s.adminRange.d30}</TabsTrigger>
                <TabsTrigger value="d90">{s.adminRange.d90}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Table aria-label={s.venuesTable}>
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell
                  sortable
                  direction={sort}
                  onSort={() => setSort(sort === "desc" ? "asc" : "desc")}
                >
                  {s.colVenue}
                </TableHeaderCell>
                <TableHeaderCell numeric>{s.colRequests}</TableHeaderCell>
                <TableHeaderCell>{s.colStatus}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {["Nomad Lounge", "Neon Garden", "Qahva Bahor"].map((name, index) => (
                <TableRow key={name} selected={index === 1}>
                  <TableCell className="font-bold">{name}</TableCell>
                  <TableCell numeric mono>
                    {[2418, 1986, 742][index]}
                  </TableCell>
                  <TableCell>
                    <Badge size="sm" dot tone={index === 2 ? "neutral" : "playing"}>
                      {index === 2 ? s.statusIdle : s.statusLive}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section id="empty" title="Empty states" note="Inline SVG, brand gradient from the theme">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {illustrations.map((id) => {
            const [title, description] = emptyCopy(id, s) as [string, string];
            return (
              <Card key={id} padding="none" className="flex items-start justify-center">
                <EmptyState
                  illustration={id}
                  size="sm"
                  title={title}
                  description={description}
                  action={
                    id === "search" ? <Button size="sm">{s.requestByText}</Button> : undefined
                  }
                />
              </Card>
            );
          })}
        </div>
      </Section>

      <Section id="logo" title="Logo" note="Clear space = mark stem width; minimum heights below">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center justify-center rounded-lg bg-canvas p-10 hairline-strong">
            <Logo variant="horizontal" height={52} />
          </div>
          <div
            data-theme="cafe"
            className="flex items-center justify-center rounded-lg bg-canvas p-10 hairline-strong"
          >
            <Logo variant="horizontal" height={52} />
          </div>
          <div className="flex items-center justify-center rounded-lg bg-brand-gradient p-10">
            <Logo variant="horizontal" height={52} tone="white" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 rounded-lg bg-surface-1 p-8 hairline">
            <Logo variant="stacked" height={84} />
            <Logo variant="mark" height={56} />
            <Logo variant="wordmark" height={20} />
          </div>
          <div className="flex items-end justify-center gap-6 rounded-lg bg-surface-1 p-10 hairline">
            {(["mark", "wordmark", "horizontal", "stacked"] as const).map((variant) => (
              <div key={variant} className="flex flex-col items-center gap-3">
                <Logo variant={variant} height={logoMinHeights[variant]} />
                <span className="type-mono text-[10px] text-fg-subtle">
                  {variant} {logoMinHeights[variant]}px
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center rounded-lg bg-surface-1 p-10 text-brand hairline">
            <Logo variant="horizontal" height={44} tone="theme" />
          </div>
        </div>
      </Section>

      <Section id="imagery" title="Brand imagery" note="Higgsfield-generated, served as WebP">
        <div className="grid gap-4 md:grid-cols-3">
          <img
            src={images.heroLanding}
            alt=""
            className="aspect-video w-full rounded-lg object-cover"
          />
          <img
            src={images.backdropLounge}
            alt=""
            className="aspect-video w-full rounded-lg object-cover"
          />
          <img
            src={images.backdropCafe}
            alt=""
            className="aspect-video w-full rounded-lg object-cover"
          />
        </div>
      </Section>

      <Sheet
        open={sheetSide !== null}
        onOpenChange={(open) => !open && setSheetSide(null)}
        side={sheetSide ?? "bottom"}
        title={s.sheetTitle}
        description={s.sheetText}
        closeLabel={s.close}
        footer={
          <Button size="xl" fullWidth onClick={() => setSheetSide(null)}>
            {s.request}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <TrackRow
            title={tracks[1]?.title ?? ""}
            artist={tracks[1]?.artist ?? ""}
            album={tracks[1]?.album}
            durationSec={200}
            size="lg"
          />
          <Input label={s.fieldDedication} placeholder={names[0]} />
          <Textarea label={s.fieldNote} placeholder={s.note1} />
        </div>
      </Sheet>
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={s.dialogTitle}
        description={s.dialogText}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {s.cancel}
            </Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>
              {s.confirm}
            </Button>
          </>
        }
      />
      <CommandPalette
        open={palette.open}
        onOpenChange={palette.setOpen}
        items={commands}
        title={s.cmdTitle}
        placeholder={s.cmdPlaceholder}
        emptyLabel={s.cmdEmpty}
        footerHint={{ navigate: s.cmdNavigate, select: s.cmdSelect, close: s.cmdClose }}
      />
    </div>
  );
}
