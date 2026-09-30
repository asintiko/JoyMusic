import { Menu, app, shell } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import type { MenuCommand } from "../common/ipc";

export interface MenuLabels {
  settings: string;
  view: string;
  booth: string;
  largeTargets: string;
  stage: string;
  palette: string;
  session: string;
  endSession: string;
  signOut: string;
  help: string;
  docs: string;
}

export const englishMenuLabels: MenuLabels = {
  settings: "Settings",
  view: "View",
  booth: "Booth mode",
  largeTargets: "Large targets",
  stage: "Stage window",
  palette: "Command palette",
  session: "Session",
  endSession: "End session",
  signOut: "Sign out",
  help: "Help",
  docs: "Documentation",
};

export function buildMenuTemplate(
  send: (command: MenuCommand) => void,
  options: { platform: string; development: boolean; labels?: MenuLabels },
): MenuItemConstructorOptions[] {
  const labels = options.labels ?? englishMenuLabels;
  const mac = options.platform === "darwin";
  const command = (value: MenuCommand) => () => send(value);
  const appMenu: MenuItemConstructorOptions[] = mac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            {
              label: `${labels.settings}...`,
              accelerator: "CmdOrCtrl+,",
              click: command("openSettings"),
            },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : [];
  const fileMenu: MenuItemConstructorOptions = {
    label: "File",
    submenu: [
      ...(mac
        ? []
        : ([
            { label: labels.settings, accelerator: "CmdOrCtrl+,", click: command("openSettings") },
            { type: "separator" },
          ] as MenuItemConstructorOptions[])),
      { label: labels.endSession, click: command("endSession") },
      { label: labels.signOut, click: command("signOut") },
      ...(mac ? [] : ([{ type: "separator" }, { role: "quit" }] as MenuItemConstructorOptions[])),
    ],
  };
  const viewMenu: MenuItemConstructorOptions = {
    label: labels.view,
    submenu: [
      {
        label: labels.palette,
        accelerator: "CmdOrCtrl+K",
        registerAccelerator: false,
        click: command("openPalette"),
      },
      { type: "separator" },
      { label: labels.booth, accelerator: "CmdOrCtrl+Shift+B", click: command("toggleBooth") },
      {
        label: labels.largeTargets,
        accelerator: "CmdOrCtrl+Shift+L",
        click: command("toggleLargeTargets"),
      },
      { label: labels.stage, accelerator: "CmdOrCtrl+Shift+S", click: command("toggleStage") },
      { type: "separator" },
      { role: "togglefullscreen" },
      ...(options.development
        ? ([
            { type: "separator" },
            { role: "reload" },
            { role: "toggleDevTools" },
          ] as MenuItemConstructorOptions[])
        : []),
    ],
  };
  const windowMenu: MenuItemConstructorOptions = { role: "windowMenu" };
  const helpMenu: MenuItemConstructorOptions = {
    role: "help",
    submenu: [
      {
        label: labels.docs,
        click: () =>
          void shell.openExternal("https://github.com/asintiko/JoyMusic/blob/main/docs/DESKTOP.md"),
      },
    ],
  };
  return [...appMenu, fileMenu, { role: "editMenu" }, viewMenu, windowMenu, helpMenu];
}

export function installMenu(
  send: (command: MenuCommand) => void,
  options: { platform: string; development: boolean },
): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate(send, options)));
}
