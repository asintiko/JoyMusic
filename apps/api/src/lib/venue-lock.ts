import { sql } from "drizzle-orm";
import type { Transaction } from "../db/client";

export async function lockVenue(tx: Transaction, venueId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${venueId}, 0))`);
}
