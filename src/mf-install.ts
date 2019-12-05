#!/usr/bin/env node

import { exec } from "child_process";
import program from "commander";
import { Dirent } from "fs";
import { default as path } from "path";

import color from "./core/color";
import { CommandConfig, ComponentProcess, command } from "./core/command";

program
  .version("1.0.0")
  .option("-c, --component <component>", "Build a specific component.")
  .option(
    "-p, --path <path>",
    "Define component(s) root path. Default to 'apps/'"
  )
  .parse(process.argv);

const programPath = program.path || "apps";
const componentsPath = programPath.endsWith("/")
  ? programPath
  : path.join(programPath, "/");

const componentProcess = async ({
  name,
}: Dirent): Promise<ComponentProcess> => {
  console.log(color.blue, `Installing dependencies and building ${name}...`);
  const proc = exec(
    `cd ${path.join(componentsPath, name)} && npm ci`,
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
