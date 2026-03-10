import { implement } from "@orpc/server";
import { contract } from "./contract";

export interface Context {
  headers: Headers;
}

export const os = implement(contract).$context<Context>();
