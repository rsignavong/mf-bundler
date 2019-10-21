#!/usr/bin/env node

import { exec } from "child_process";
import program from "commander";
import { Dirent } from "fs";

import color from "./core/color";
import { CommandConfig, ComponentProcess, command } from "./core/command";

program
  .version("1.0.0")
  .option("-c, --component <component>", "Build a specific component.")
  .option(
    "-p, --path <path>",
    "Define component(s) root path. Default to 'src/components/'"
  )
  .parse(process.argv);

const path = program.path || "src/components/";
const componentsPath = path.endsWith("/") ? path : `${path}/`;

const componentProcess = ({ name }: Dirent): ComponentProcess => {
  console.log(color.blue, `Testing ${name}...`);
  const process = exec(`cd ${componentsPath + name} && npm test`);
  return { name, process };
};

const config: CommandConfig = {
  componentName: program.component,
  componentProcess,
  componentsPath,
};

command(config);
