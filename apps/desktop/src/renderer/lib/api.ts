import type { CommandOutcome, OutboxCommand } from "../../common/commands";
import type { DjRouteInput, DjRouteName, DjRouteOutput } from "../../common/bridge";
import { getBridge, unwrap } from "../bridge/access";

export async function callApi<N extends DjRouteName>(
  name: N,
  input?: DjRouteInput<N>,
): Promise<DjRouteOutput<N>> {
  return unwrap(await getBridge().api.call(name, input));
}

export async function runCommand(command: OutboxCommand): Promise<CommandOutcome> {
  return unwrap(await getBridge().commands.run(command));
}
