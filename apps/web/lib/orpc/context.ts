import { implement } from "@orpc/server";
import { contract } from "@sofa/api/contract";

export interface Context {
  headers: Headers;
}

export const os = implement(contract).$context<Context>();
