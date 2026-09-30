export { createEmitter } from "./core/emitter";
export type { Emitter, Listener } from "./core/emitter";
export { cleanText, compactTrack, sameMetadata, trackKey } from "./core/keys";
export { createAdapterManager } from "./core/manager";
export type { AdapterManager, AdapterManagerEvents, AdapterManagerOptions } from "./core/manager";
export { toNowPlaying } from "./core/nowplaying";
export { selectOnAirDeck } from "./core/onair";
export { createSimulatorAdapter, defaultSimulatorSteps } from "./core/simulator";
export type { SimulatorAdapter, SimulatorOptions, SimulatorStep } from "./core/simulator";
export { createStatusHolder, systemClock, systemTimers } from "./core/timers";
export type { StatusHolder } from "./core/timers";
export type {
  AdapterInfo,
  AdapterState,
  AdapterStatus,
  Clock,
  DeckState,
  DetectedTrack,
  NowPlayingAdapter,
  NowPlayingChangeReason,
  NowPlayingEvent,
  NowPlayingSink,
  StatusEvent,
  TimerHandle,
  Timers,
} from "./core/types";
export { seratoSessionDirectories, virtualDjHistoryDirectories } from "./paths";
export type { DesktopPlatform, PathContext } from "./paths";
export { mapProlinkDeck, prolinkPlayState } from "./adapters/prolink/mapper";
export type { ProlinkStatusLike, ProlinkTrackLike } from "./adapters/prolink/mapper";
export { mapStageLinqDeck } from "./adapters/stagelinq/mapper";
export type { StageLinqMapOptions, StageLinqPlayerStatusLike } from "./adapters/stagelinq/mapper";
export { parseVirtualDjHistory } from "./adapters/virtualdj/parser";
export type { VirtualDjEntry } from "./adapters/virtualdj/parser";
export { parseSeratoSession, seratoEntriesToDecks } from "./adapters/serato/parser";
export type { SeratoEntry, SeratoSession } from "./adapters/serato/parser";
export { buildSeratoSession } from "./adapters/serato/writer";
export type { SeratoFixtureEntry } from "./adapters/serato/writer";
export { compileTrackTemplate, splitArtistTitle } from "./adapters/textfile/template";
export type { TrackTemplate } from "./adapters/textfile/template";
export {
  createIcyStreamParser,
  parseAdminMetadata,
  parseIcecastRequestHead,
  parseSongMetadata,
} from "./adapters/traktor/icecast";
export type { IcecastRequestHead, SongMetadata } from "./adapters/traktor/icecast";
export type { FileEntry, FileSystemLike } from "./adapters/io";
