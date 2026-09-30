import * as RadixDialog from "@radix-ui/react-dialog";
import { CornerDownLeft, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { cx } from "../lib/cx";
import { fuzzyScore } from "../lib/fuzzy";
import { motionSprings } from "../lib/motion";
import { Kbd } from "./kbd";

export interface CommandItem {
  id: string;
  label: string;
  group?: string;
  icon?: ReactNode;
  shortcut?: ReactNode;
  keywords?: readonly string[];
  hint?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly CommandItem[];
  title: string;
  placeholder: string;
  emptyLabel: string;
  footerHint?: { navigate: string; select: string; close: string };
  className?: string;
}

export function filterCommands(items: readonly CommandItem[], query: string): CommandItem[] {
  if (query.trim() === "") return [...items];
  return items
    .map((item) => ({
      item,
      score: Math.max(
        fuzzyScore(query, item.label),
        ...(item.keywords ?? []).map((keyword) => fuzzyScore(query, keyword) * 0.8),
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);
}

export function CommandPalette({
  open,
  onOpenChange,
  items,
  title,
  placeholder,
  emptyLabel,
  footerHint,
  className,
}: CommandPaletteProps) {
  const reduced = usePrefersReducedMotion();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => filterCommands(items, query), [items, query]);

  const grouped = useMemo(() => {
    const groups: { name: string; entries: { item: CommandItem; index: number }[] }[] = [];
    results.forEach((item, index) => {
      const name = item.group ?? "";
      let group = groups.find((entry) => entry.name === name);
      if (!group) {
        group = { name, entries: [] };
        groups.push(group);
      }
      group.entries.push({ item, index });
    });
    return groups;
  }, [results]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const run = (item: CommandItem | undefined) => {
    if (!item) return;
    onOpenChange(false);
    item.onSelect();
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-modal bg-scrim backdrop-blur-[6px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.16 }}
              />
            </RadixDialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-modal flex items-start justify-center px-4 pt-[14vh]">
              <RadixDialog.Content asChild forceMount>
                <motion.div
                  className={cx(
                    "pointer-events-auto w-full max-w-[600px] overflow-hidden rounded-xl bg-surface-2 shadow-4 hairline-strong outline-none",
                    className,
                  )}
                  initial={reduced ? false : { opacity: 0, scale: 0.97, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }}
                  transition={reduced ? { duration: 0 } : motionSprings.snappy}
                >
                  <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
                  <RadixDialog.Description className="sr-only">
                    {placeholder}
                  </RadixDialog.Description>
                  <div className="flex items-center gap-3 border-b border-line px-4">
                    <Search aria-hidden="true" className="size-[18px] shrink-0 text-fg-subtle" />
                    <input
                      autoFocus
                      role="combobox"
                      aria-expanded="true"
                      aria-controls={listId}
                      aria-autocomplete="list"
                      aria-label={title}
                      aria-activedescendant={results.length > 0 ? optionId(active) : undefined}
                      value={query}
                      placeholder={placeholder}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setActive((value) => (results.length ? (value + 1) % results.length : 0));
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setActive((value) =>
                            results.length ? (value - 1 + results.length) % results.length : 0,
                          );
                        } else if (event.key === "Enter") {
                          event.preventDefault();
                          run(results[active]);
                        } else if (event.key === "Home") {
                          event.preventDefault();
                          setActive(0);
                        } else if (event.key === "End") {
                          event.preventDefault();
                          setActive(Math.max(0, results.length - 1));
                        }
                      }}
                      className="h-14 min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-fg outline-none placeholder:font-medium placeholder:text-fg-subtle"
                    />
                    <Kbd>Esc</Kbd>
                  </div>
                  <div
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    aria-label={title}
                    className="scrollbar-none max-h-[min(420px,56vh)] overflow-y-auto p-2"
                  >
                    {results.length === 0 ? (
                      <p className="type-body px-3 py-10 text-center text-fg-muted">{emptyLabel}</p>
                    ) : (
                      grouped.map((group) => (
                        <div key={group.name} role="presentation" className="mb-1 last:mb-0">
                          {group.name ? (
                            <p className="type-eyebrow px-3 pb-1.5 pt-3 text-fg-subtle">
                              {group.name}
                            </p>
                          ) : null}
                          {group.entries.map(({ item, index }) => (
                            <div
                              key={item.id}
                              id={optionId(index)}
                              role="option"
                              aria-selected={index === active}
                              data-index={index}
                              onPointerMove={() => setActive(index)}
                              onClick={() => run(item)}
                              className={cx(
                                "flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-[14px] font-semibold transition-colors duration-75",
                                index === active ? "bg-brand-soft text-fg" : "text-fg-muted",
                              )}
                            >
                              {item.icon ? (
                                <span
                                  className={cx(
                                    "inline-flex shrink-0 [&>svg]:size-[18px]",
                                    index === active ? "text-brand" : "text-fg-subtle",
                                  )}
                                >
                                  {item.icon}
                                </span>
                              ) : null}
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {item.hint ? (
                                <span className="truncate text-[12px] font-medium text-fg-subtle">
                                  {item.hint}
                                </span>
                              ) : null}
                              {item.shortcut ? (
                                <span className="inline-flex shrink-0 items-center gap-1">
                                  {item.shortcut}
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                  {footerHint ? (
                    <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11.5px] font-semibold text-fg-subtle">
                      <span className="inline-flex items-center gap-1.5">
                        <Kbd>↑</Kbd>
                        <Kbd>↓</Kbd>
                        {footerHint.navigate}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Kbd>
                          <CornerDownLeft aria-hidden="true" />
                        </Kbd>
                        {footerHint.select}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1.5">
                        <Kbd>Esc</Kbd>
                        {footerHint.close}
                      </span>
                    </div>
                  ) : null}
                </motion.div>
              </RadixDialog.Content>
            </div>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
