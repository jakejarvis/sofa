import { generateFiles } from "fumadocs-openapi";
import { openapi } from "../src/lib/openapi";

void generateFiles({
  input: openapi,
  output: "./content/docs/api",
  per: "tag",
  addGeneratedComment: true,
});
