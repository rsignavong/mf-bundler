#!/usr/bin/env node

import { exec } from "child_process";
import program from "commander";
import { Dirent } from "fs";
import { default as path } from "path";

import color from "./core/color";
import { CommandConfig, ComponentProcess, command } from "./core/command";

program
  .version("1.0.0")
  .option(
    "-c, --component <component>",
    "Clean 'node_modules' of a specific component."
  )
  .option("-d, --dist <dist>", "Clean specific 'dist'. Default to 'dist'")
  .option("-e, --elm", "Add 'elm-stuff' directory to remove.")
  .option(
    "-p, --path <path>",
    "Define component(s) root path. Default to 'apps/'"
  )
  .parse(process.argv);

const programPath = program.path || "apps";
const componentsPath = programPath.endsWith("/")
  ? programPath
  : path.join(programPath, "/");
const nodeModules = "node_modules";
const dist = program.dist || "dist";
const distAndModules = [nodeModules, dist];
const removeDirectory = program.elm
  ? [...distAndModules, "elm-stuff"]
  : distAndModules;

const componentProcess = async ({
  name,
}: Dirent): Promise<ComponentProcess> => {
  console.log(color.blue, `Cleaning ${name}...`);
  const proc = exec(
    `rm -rf ${path.join(process.cwd(), "dist")} && cd ${path.join(
      componentsPath,
      name
    )} && rm -rf ${removeDirectory.join(" ")}`,
    err => err && process.exit(1)
  );
  return { name, process: proc };
};

const config: CommandConfig = {
  componentName: program.component,
  componentProcess,
  componentsPath,
};

command(config);
