import { useNavigate, useSearch } from "@tanstack/react-router";
import { Ban, Plus, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button, Input, Skeleton, useToast } from "@joymusic/ui";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader, Panel } from "../../components/page";
import { ErrorPanel } from "../../components/states";
import { VenueSelect } from "../../components/venue-select";
import { useI18n } from "../../i18n";
import { describeError } from "../../lib/api-errors";
import { errorText } from "../../lib/error-messages";
import { useVenueScope } from "../../lib/venue-scope";
import { useAddBannedWord, useBanDevice, useBannedWords, useRemoveBannedWord } from "../../queries";
import { Empty } from "../../components/empty";

export function normalizeWord(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function WordsPanel() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { focus?: string };
  const words = useBannedWords();
  const add = useAddBannedWord();
  const remove = useRemoveBannedWord();
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (search.focus === "word") {
      inputRef.current?.focus();
      void navigate({ to: "/moderation", search: {}, replace: true });
    }
  }, [search.focus, navigate]);

  const list = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return (words.data ?? []).filter((entry) => !query || entry.word.includes(query));
  }, [words.data, filter]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeWord(word);
    setError(null);
    if (normalized.length < 2) {
      setError(t("moderation.word.tooShort"));
      return;
    }
    if (normalized.length > 60) {
      setError(t("form.tooLong", { max: 60 }));
      return;
    }
    if ((words.data ?? []).some((entry) => entry.word.toLowerCase() === normalized)) {
      setError(t("moderation.word.exists"));
      return;
    }
    setWord("");
    try {
      await add.mutateAsync(normalized);
      toast.success(t("moderation.word.added", { word: normalized }));
    } catch (failure) {
      setWord(normalized);
      setError(errorText(t, failure));
    }
  };

  const drop = async (id: string, value: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success(t("moderation.word.removed", { word: value }));
    } catch (failure) {
      toast.error(t("moderation.word.removeFailed"), errorText(t, failure));
    }
  };

  return (
    <Panel title={t("moderation.words.title")} subtitle={t("moderation.words.subtitle")}>
      <form onSubmit={submit} noValidate className="flex items-start gap-2">
        <Input
          ref={inputRef}
          aria-label={t("moderation.addWord")}
          placeholder={t("moderation.word.placeholder")}
          value={word}
          onChange={(event) => {
            setWord(event.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          wrapperClassName="flex-1"
          maxLength={60}
          autoComplete="off"
        />
        <Button type="submit" leftIcon={<Plus aria-hidden="true" className="size-4" />}>
          {t("common.add")}
        </Button>
      </form>
      <p className="mt-3 text-[12.5px] text-fg-subtle">{t("moderation.words.builtIn")}</p>

      <div className="mt-5 border-t border-[var(--jm-line)] pt-4">
        {words.isError ? (
          <ErrorPanel error={words.error} onRetry={() => void words.refetch()} />
        ) : words.isPending ? (
          <div className="flex flex-wrap gap-2">
            {[64, 92, 72, 110, 84, 58].map((width, index) => (
              <Skeleton key={index} width={width} height={32} className="rounded-pill" />
            ))}
          </div>
        ) : words.data.length === 0 ? (
          <Empty
            size="sm"
            illustration="inbox"
            title={t("moderation.words.empty")}
            description={t("moderation.words.emptyHint")}
          />
        ) : (
          <>
            {words.data.length > 12 ? (
              <Input
                aria-label={t("common.search")}
                placeholder={t("common.search")}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                wrapperClassName="mb-3 max-w-[260px]"
              />
            ) : null}
            <ul className="flex flex-wrap gap-2" aria-label={t("moderation.words.title")}>
              {list.map((entry) => (
                <li
                  key={entry.id}
                  data-testid="banned-word"
                  className="group/word inline-flex h-8 items-center gap-1 rounded-pill bg-surface-3 pl-3 pr-1 text-[13px] font-bold hairline"
                >
                  <span>{entry.word}</span>
                  <button
                    type="button"
                    aria-label={t("moderation.word.remove", { word: entry.word })}
                    onClick={() => void drop(entry.id, entry.word)}
                    disabled={entry.id.startsWith("pending-")}
                    className="focus-ring inline-flex size-6 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger-fg disabled:opacity-40"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Panel>
  );
}

function DevicePanel() {
  const { t } = useI18n();
  const toast = useToast();
  const scope = useVenueScope();
  const ban = useBanDevice();
  const [deviceId, setDeviceId] = useState("");
  const [confirm, setConfirm] = useState(false);
  const venue = scope.effective;
  const valid = deviceId.trim().length >= 8 && deviceId.trim().length <= 64;

  const submit = async () => {
    if (!venue) return;
    try {
      await ban.mutateAsync({ venueId: venue.id, deviceId: deviceId.trim() });
      toast.success(t("moderation.device.done", { venue: venue.name }));
      setDeviceId("");
    } catch (error) {
      const kind = describeError(error).kind;
      toast.error(
        t("moderation.device.failed"),
        kind === "not_found" ? t("moderation.device.notFound") : errorText(t, error),
      );
    } finally {
      setConfirm(false);
    }
  };

  return (
    <Panel title={t("moderation.device.title")} subtitle={t("moderation.device.subtitle")}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-md bg-next-soft px-3.5 py-3 text-[13px] text-next-fg">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("moderation.device.warning")}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="type-label text-fg-muted">{t("shell.venuePicker")}</span>
          <VenueSelect className="w-full" />
        </div>
        <Input
          label={t("moderation.device.id")}
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          placeholder="d-4f3a91c0b27e"
          hint={t("moderation.device.idHint")}
          spellCheck={false}
          autoComplete="off"
          maxLength={64}
          className="type-mono"
        />
        <Button
          variant="danger"
          disabled={!valid || !venue}
          leftIcon={<Ban aria-hidden="true" className="size-4" />}
          onClick={() => setConfirm(true)}
        >
          {t("moderation.device.ban")}
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("moderation.device.confirmTitle")}
        description={t("moderation.device.confirmText", {
          venue: venue?.name ?? "",
          device: deviceId.trim(),
        })}
        confirmLabel={t("moderation.device.ban")}
        tone="danger"
        loading={ban.isPending}
        onConfirm={() => void submit()}
      />
    </Panel>
  );
}

export function ModerationPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t("nav.moderation")} description={t("moderation.subtitle")} />
      <div className="grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_400px]">
        <WordsPanel />
        <DevicePanel />
      </div>
    </>
  );
}
