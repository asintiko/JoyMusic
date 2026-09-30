import type { Locale } from "@joymusic/shared";

export interface Step {
  tag: string;
  title: string;
  text: string;
}

export interface Feature {
  title: string;
  text: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface DetectItem {
  name: string;
  note: string;
}

export interface ThemeCopy {
  name: string;
  text: string;
  venue: string;
}

export interface DemoCopy {
  venue: string;
  searchPlaceholder: string;
  query: string;
  results: string;
  request: string;
  requested: string;
  sheetTitle: string;
  dedicationLabel: string;
  dedicationValue: string;
  send: string;
  sentTitle: string;
  sentText: string;
  acceptedTitle: string;
  acceptedText: string;
  playingTitle: string;
  playingText: string;
  restart: string;
  back: string;
  nowPlaying: string;
  upNext: string;
  hints: {
    idle: string;
    results: string;
    compose: string;
    sent: string;
    accepted: string;
    playing: string;
  };
  stepOf: string;
}

export interface LandingCopy {
  locale: Locale;
  meta: { title: string; description: string; ogAlt: string; keywords: string[] };
  skip: string;
  brandLabel: string;
  navLabel: string;
  nav: { how: string; demo: string; venues: string; djs: string; themes: string; faq: string };
  openMenu: string;
  closeMenu: string;
  language: string;
  getStarted: string;
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    sub: string;
    primary: string;
    secondary: string;
    note: string;
    phoneAlt: string;
    live: string;
    nowPlaying: string;
    fromTable: string;
    simulated: string;
    scroll: string;
  };
  how: { eyebrow: string; title: string; sub: string; steps: Step[] };
  demo: {
    eyebrow: string;
    title: string;
    sub: string;
    qrLabel: string;
    qrCaption: string;
    urlLabel: string;
    phoneLabel: string;
    disclaimer: string;
    copy: DemoCopy;
  };
  venues: {
    eyebrow: string;
    title: string;
    sub: string;
    features: Feature[];
    adminAlt: string;
    tvAlt: string;
    adminCaption: string;
    tvCaption: string;
    demoData: string;
  };
  djs: {
    eyebrow: string;
    title: string;
    sub: string;
    points: Feature[];
    consoleAlt: string;
    consoleCaption: string;
    detectTitle: string;
    autoLabel: string;
    manualLabel: string;
    auto: DetectItem[];
    manual: string[];
    detectNote: string;
    downloadTitle: string;
    mac: string;
    windows: string;
    soon: string;
    soonNote: string;
    readyNote: string;
  };
  themes: {
    eyebrow: string;
    title: string;
    sub: string;
    switchLabel: string;
    items: { club: ThemeCopy; lounge: ThemeCopy; cafe: ThemeCopy };
    previewLabel: string;
    nowPlaying: string;
    upNext: string;
    request: string;
  };
  privacy: { eyebrow: string; title: string; sub: string; cards: Feature[] };
  faq: { eyebrow: string; title: string; items: FaqItem[] };
  contact: {
    eyebrow: string;
    title: string;
    text: string;
    honesty: string;
    cta: string;
  };
  closing: { title: string; text: string; primary: string; secondary: string };
  footer: { tagline: string; product: string; rights: string; status: string };
}
