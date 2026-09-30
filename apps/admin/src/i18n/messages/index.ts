import { auth } from "./auth";
import { common } from "./common";
import { errors } from "./errors";
import { insight } from "./insight";
import { misc } from "./misc";
import { qr } from "./qr";
import { shell } from "./shell";
import { team } from "./team";
import { venues } from "./venues";

export const catalog = {
  ...common,
  ...errors,
  ...shell,
  ...auth,
  ...insight,
  ...venues,
  ...qr,
  ...team,
  ...misc,
} as const;

export type MessageKey = keyof typeof catalog;
