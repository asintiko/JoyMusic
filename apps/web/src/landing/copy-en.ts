import type { LandingCopy } from "./types";

export const copyEn: LandingCopy = {
  locale: "en",
  meta: {
    title: "Joy Music: song requests from the DJ with a QR code",
    description:
      "Guests scan a QR code and request songs from the DJ. No app, no login. A desktop console for DJs, an admin panel and a TV stage for bars, clubs and cafés in Uzbekistan.",
    ogAlt: "Joy Music: scan, choose, dance",
    keywords: ["song requests", "QR code", "DJ", "bar", "club", "cafe", "Uzbekistan", "Tashkent"],
  },
  skip: "Skip to content",
  brandLabel: "Joy Music, home",
  navLabel: "Main",
  nav: {
    how: "How it works",
    demo: "Demo",
    venues: "Venues",
    djs: "DJs",
    themes: "Themes",
    faq: "FAQ",
  },
  openMenu: "Open menu",
  closeMenu: "Close menu",
  language: "Language",
  getStarted: "Get started",
  hero: {
    eyebrow: "QR song requests for bars, clubs and cafés",
    titleLead: "Let the room choose",
    titleAccent: "the next track",
    sub: "Guests scan a QR code on the table and request a song from their own phone. The DJ sees every request in one console. The venue sees what the room loves.",
    primary: "Start free",
    secondary: "See how it works",
    note: "No app for guests. No login. Works on any phone.",
    phoneAlt: "Joy Music guest screen with the current track and the queue",
    live: "Live preview",
    nowPlaying: "Now playing",
    fromTable: "Requested from table {n}",
    simulated: "Simulated",
    scroll: "Scroll",
  },
  how: {
    eyebrow: "How it works",
    title: "From the table to the speakers in three steps",
    sub: "Nothing to install and nothing to sign up for. The whole guest flow lives in the phone browser.",
    steps: [
      {
        tag: "01",
        title: "Scan",
        text: "Point the camera at the Joy Code on the table, the TV or a poster. The venue page opens in the browser.",
      },
      {
        tag: "02",
        title: "Choose",
        text: "Search any song or artist, in Latin or Cyrillic. Can't find it? Request it by text and add a dedication.",
      },
      {
        tag: "03",
        title: "Dance",
        text: "The DJ accepts, the track joins the queue, and your phone shows its status until it plays.",
      },
    ],
  },
  demo: {
    eyebrow: "Try it",
    title: "Scan it. It is a real code.",
    sub: "This is a real Joy Code. Point your phone camera at it, or tap through a request on the mini phone.",
    qrLabel: "Joy Code for the demo venue",
    qrCaption: "Opens the guest page of the demo venue",
    urlLabel: "Demo address",
    phoneLabel: "Simulated guest phone",
    disclaimer: "The phone is a simulation with made-up tracks. It does not talk to a real venue.",
    copy: {
      venue: "Joy Demo Club",
      searchPlaceholder: "Search a song or artist",
      query: "atlas",
      results: "Results",
      request: "Request",
      requested: "Requested",
      sheetTitle: "Request a track",
      dedicationLabel: "Dedication",
      dedicationValue: "For Aziz, happy birthday!",
      send: "Send to the DJ",
      sentTitle: "Request received",
      sentText: "Waiting for the DJ",
      acceptedTitle: "Accepted by the DJ",
      acceptedText: "Position 2 in the queue",
      playingTitle: "Now playing",
      playingText: "Your track is on",
      restart: "Start over",
      back: "Back",
      nowPlaying: "Now playing",
      upNext: "Up next",
      hints: {
        idle: "Tap the search bar",
        results: "Pick a track",
        compose: "Add a dedication and send",
        sent: "The request goes to the DJ",
        accepted: "The DJ accepts it",
        playing: "It plays. That is the whole flow.",
      },
      stepOf: "Step {n} of {total}",
    },
  },
  venues: {
    eyebrow: "For venues",
    title: "One QR on every table. One screen in the room.",
    sub: "Set up a venue in minutes, print the codes, and let the DJ run the night from a single console.",
    features: [
      {
        title: "A code for every table",
        text: "Print posters, table tents and stickers from QR Studio. Each table gets its own code, so you see where the orders come from.",
      },
      {
        title: "A stage for your TV",
        text: "A 16:9 screen shows the current track, the queue, dedications and a live QR. Choose the Club, Lounge or Café look.",
      },
      {
        title: "Moderation you control",
        text: "Banned words, request limits and a switch to close requests. Duplicates become votes. Other guests never see a note before the DJ accepts it.",
      },
      {
        title: "Analytics that mean something",
        text: "Requests by hour, most requested tracks, unique guests and QR scans. Per venue or across all of them.",
      },
    ],
    adminAlt: "Joy Music admin panel: overview with requests by hour and most requested tracks",
    tvAlt: "Joy Music TV stage: current track, up next, dedications and a QR code",
    adminCaption: "Admin panel",
    tvCaption: "TV stage",
    demoData: "Demo data",
  },
  djs: {
    eyebrow: "For DJs",
    title: "A console for requests, not another mixer",
    sub: "Keep playing in Serato, Rekordbox, Traktor, VirtualDJ or on CDJs. Joy Music sits next to your setup and handles the requests.",
    points: [
      {
        title: "Every request in one place",
        text: "Accept, postpone or decline with a keystroke. See table, votes, note and dedication at a glance.",
      },
      {
        title: "Your queue, your order",
        text: "Drag tracks to reorder, push the next one to air, mark played. The guests and the TV update at once.",
      },
      {
        title: "Built for the booth",
        text: "Command palette, hotkeys, MIDI mapping, an ultra-dark mode and large tap targets.",
      },
    ],
    consoleAlt: "Joy Music DJ console with incoming requests, the queue and the current track",
    consoleCaption: "DJ console, demo data",
    detectTitle: "What is detected, and what is manual",
    autoLabel: "Detected automatically",
    manualLabel: "Always manual",
    auto: [
      { name: "Serato DJ", note: "reads the history folder" },
      { name: "VirtualDJ", note: "reads the history folder" },
      { name: "Traktor", note: "over an Icecast broadcast" },
      { name: "Pioneer CDJ", note: "Pro DJ Link, experimental" },
      { name: "Denon", note: "StageLinQ, experimental" },
      { name: "Rekordbox", note: "through a text file, no direct adapter" },
    ],
    manual: [
      "Mark a track as playing or played",
      "Add a request to the queue yourself",
      "MIDI controller mapping (presets are unverified)",
    ],
    detectNote:
      "The adapters are tested on fixtures and a simulator. Checks with real gear are still in progress, so the manual controls always work as a fallback.",
    downloadTitle: "Desktop app",
    mac: "Download for Mac",
    windows: "Download for Windows",
    soon: "Coming soon",
    soonNote: "The first public build is not out yet. Get started in the admin panel and we will let you know.",
    readyNote: "Mac (Apple silicon and Intel) and Windows 10 or later.",
  },
  themes: {
    eyebrow: "Venue themes",
    title: "Your venue, your look",
    sub: "One design system, three moods. Pick a theme in the admin panel and the guest screen, the TV and the console follow.",
    switchLabel: "Venue theme",
    items: {
      club: { name: "Club", text: "Neon on a black-violet stage.", venue: "Joy Demo Club" },
      lounge: { name: "Lounge", text: "Black and gold, calm and precise.", venue: "Joy Demo Lounge" },
      cafe: { name: "Café", text: "Soft cream with a terracotta accent.", venue: "Joy Demo Café" },
    },
    previewLabel: "Guest screen preview",
    nowPlaying: "Now playing",
    upNext: "Up next",
    request: "Request a track",
  },
  privacy: {
    eyebrow: "Guests first",
    title: "Nothing between the guest and the song",
    sub: "The fewer steps, the more requests. So we removed every step we could.",
    cards: [
      {
        title: "No login",
        text: "Guests are anonymous. No account, no phone number, no email.",
      },
      {
        title: "No app install",
        text: "It is a web page. The QR opens it, the browser runs it.",
      },
      {
        title: "Any phone",
        text: "Light on data and fast on older Android and iPhone models.",
      },
      {
        title: "Uzbek, Russian, English",
        text: "Uzbek in Latin script, Russian and English. Search works across Latin and Cyrillic spellings.",
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions, answered",
    items: [
      {
        question: "Do guests need to install an app or sign up?",
        answer:
          "No. They scan the QR code and the venue page opens in the browser. Guests are anonymous: there is no account, phone number or email.",
      },
      {
        question: "Does Joy Music play the music?",
        answer:
          "No. The DJ keeps playing on their own equipment. Joy Music collects requests, keeps the queue and shows what is playing. Guests can hear a 30-second preview before they request.",
      },
      {
        question: "Which DJ software and hardware works?",
        answer:
          "The desktop app has adapters for Serato, VirtualDJ, Traktor, Pioneer CDJ and Denon, and can read a text file for anything else, including Rekordbox. They are tested on fixtures and a simulator, real-gear checks are in progress. Marking a track as playing by hand always works.",
      },
      {
        question: "Which platforms is the DJ app on?",
        answer:
          "Mac and Windows. The first public build is coming soon. The admin panel and the guest pages run in any modern browser.",
      },
      {
        question: "Can we control what guests request?",
        answer:
          "Yes. Set request limits, ban words, ban a device, close requests with one switch or decline with a reason. The DJ accepts every request before it counts.",
      },
      {
        question: "What if a song is not in the catalog?",
        answer:
          "Guests can request by text, artist and title, and add a dedication. Local music is thinly covered by the public catalogs we search, so this matters.",
      },
      {
        question: "What does it cost?",
        answer:
          "We do not publish prices. Payments are not enabled yet, so you can set up a venue today without paying. Write to us to talk about your venue.",
      },
    ],
  },
  contact: {
    eyebrow: "Pricing",
    title: "Let's talk about your venue",
    text: "We do not publish prices yet. Tell us about your bar, club or café and we will find a fit.",
    honesty: "Payments are not enabled yet. Nothing here charges you.",
    cta: "Contact us",
  },
  closing: {
    title: "Give your room a voice",
    text: "Create a venue, print the codes and start the night. It takes minutes.",
    primary: "Start free",
    secondary: "Contact us",
  },
  footer: {
    tagline: "Song requests from the DJ, by QR code.",
    product: "Product",
    rights: "Joy Music",
    status: "Payments are not enabled yet.",
  },
};
