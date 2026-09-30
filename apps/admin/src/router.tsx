import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "./shell/app-shell";
import { can, safeRedirect } from "./lib/permissions";
import { session } from "./lib/api";
import { useSession } from "./lib/use-session";
import { BootSplash, NotFoundPage, RouteError } from "./pages/not-found-page";

const publicPrefixes = ["/login", "/register", "/invite"];

function RootLayout() {
  const router = useRouter();
  const state = useSession();
  const location = useRouterState({ select: (value) => value.location });

  useEffect(() => {
    if (state.status !== "anonymous") return;
    if (publicPrefixes.some((prefix) => location.pathname.startsWith(prefix))) return;
    void router.navigate({
      to: "/login",
      search: { redirect: location.href } as never,
      replace: true,
    });
  }, [state.status, location.pathname, location.href, router]);

  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  pendingComponent: BootSplash,
});

function redirectSearch(search: Record<string, unknown>): { redirect?: string } {
  return typeof search.redirect === "string" ? { redirect: search.redirect } : {};
}

async function requireAnonymous(search: { redirect?: string }) {
  const snapshot = await session.bootstrap().then(() => session.getSnapshot());
  if (snapshot.status === "authenticated") {
    throw redirect({ href: safeRedirect(search.redirect) });
  }
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: redirectSearch,
  beforeLoad: ({ search }) => requireAnonymous(search),
  component: lazyRouteComponent(() => import("./pages/auth/login-page"), "LoginPage"),
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  validateSearch: redirectSearch,
  beforeLoad: ({ search }) => requireAnonymous(search),
  component: lazyRouteComponent(() => import("./pages/auth/register-page"), "RegisterPage"),
});

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite/$token",
  component: lazyRouteComponent(() => import("./pages/auth/invite-page"), "InvitePage"),
});

const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authed",
  beforeLoad: async ({ location }) => {
    await session.bootstrap();
    if (session.getSnapshot().status !== "authenticated") {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: Outlet,
});

const desktopRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: "/desktop/authorize",
  validateSearch: (search: Record<string, unknown>) => ({
    state: typeof search.state === "string" ? search.state : undefined,
    challenge: typeof search.challenge === "string" ? search.challenge : undefined,
  }),
  component: lazyRouteComponent(
    () => import("./pages/auth/desktop-authorize-page"),
    "DesktopAuthorizePage",
  ),
});

const djRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: "/dj",
  component: lazyRouteComponent(() => import("./pages/auth/dj-notice-page"), "DjNoticePage"),
});

const adminRoute = createRoute({
  getParentRoute: () => authedRoute,
  id: "admin",
  beforeLoad: () => {
    if (!can(session.getSnapshot().role, "use-admin-panel")) throw redirect({ to: "/dj" });
  },
  component: AppShell,
});

const overviewRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  component: lazyRouteComponent(() => import("./pages/overview/overview-page"), "OverviewPage"),
});

const venuesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/venues",
  component: lazyRouteComponent(() => import("./pages/venues/venues-page"), "VenuesPage"),
});

const venueNewRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/venues/new",
  component: lazyRouteComponent(
    () => import("./pages/venues/venue-wizard-page"),
    "VenueWizardPage",
  ),
});

const venueDetailRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/venues/$venueId",
  component: lazyRouteComponent(
    () => import("./pages/venues/venue-detail-page"),
    "VenueDetailPage",
  ),
});

const qrRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/qr",
  validateSearch: (search: Record<string, unknown>) => (search.new ? { new: 1 } : {}),
  component: lazyRouteComponent(() => import("./pages/qr/qr-page"), "QrPage"),
});

const djsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/djs",
  validateSearch: (search: Record<string, unknown>) => (search.invite ? { invite: 1 } : {}),
  component: lazyRouteComponent(() => import("./pages/team/team-page"), "TeamPage"),
});

const sessionsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/sessions",
  component: lazyRouteComponent(() => import("./pages/sessions/sessions-page"), "SessionsPage"),
});

const moderationRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/moderation",
  validateSearch: (search: Record<string, unknown>) =>
    search.focus === "word" ? { focus: "word" } : {},
  component: lazyRouteComponent(
    () => import("./pages/moderation/moderation-page"),
    "ModerationPage",
  ),
});

const analyticsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/analytics",
  component: lazyRouteComponent(() => import("./pages/analytics/analytics-page"), "AnalyticsPage"),
});

const brandingRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/branding",
  component: lazyRouteComponent(() => import("./pages/branding/branding-page"), "BrandingPage"),
});

const billingRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/billing",
  component: lazyRouteComponent(() => import("./pages/billing/billing-page"), "BillingPage"),
});

const auditRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/audit",
  component: lazyRouteComponent(() => import("./pages/audit/audit-page"), "AuditPage"),
});

const settingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/settings",
  component: lazyRouteComponent(() => import("./pages/settings/settings-page"), "SettingsPage"),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  inviteRoute,
  authedRoute.addChildren([
    desktopRoute,
    djRoute,
    adminRoute.addChildren([
      overviewRoute,
      venuesRoute,
      venueNewRoute,
      venueDetailRoute,
      qrRoute,
      djsRoute,
      sessionsRoute,
      moderationRoute,
      analyticsRoute,
      brandingRoute,
      billingRoute,
      auditRoute,
      settingsRoute,
    ]),
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingMs: 150,
  defaultPendingMinMs: 0,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: RouteError,
  scrollRestoration: true,
});
