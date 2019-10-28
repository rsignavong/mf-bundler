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
    "-e, --environment <environment>",
    "Set NODE_ENV environment variable. Default to 'development'"
  )
  .option(
    "-p, --path <path>",
    "Define component(s) root path. Default to 'apps/'"
  )
  .parse(process.argv);

const env = program.environment || process.env.NODE_ENV || "development";
const programPath = program.path || "apps";
const componentsPath = programPath.endsWith("/")
  ? programPath
  : path.join(programPath, "/");

const componentProcess = ({ name }: Dirent): ComponentProcess => {
  console.log(color.blue, `Installing dependencies and building ${name}...`);
  const process = exec(
    `cd ${path.join(
      componentsPath,
      name
    )} && npm ci && cross-env NODE_ENV=${env} npm run build`
  );
  return { name, process };
};

const config: CommandConfig = {
  componentName: program.component,
  componentProcess,
  componentsPath,
};

command(config);
