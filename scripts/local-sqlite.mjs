// Test-only stand-in for node:sqlite, served by scripts/local-root.mjs so the ledger's
// absolute database path lands under OURS_LOCAL_ROOT like every other file.
import sqlite from "node:sqlite";
import { mapPath } from "./local-root.mjs";

export class DatabaseSync extends sqlite.DatabaseSync {
  constructor(path, ...rest) { super(typeof path === "string" ? mapPath(path) : path, ...rest); }
}
export const { StatementSync, Session, constants, backup } = sqlite;
export default { ...sqlite, DatabaseSync };
