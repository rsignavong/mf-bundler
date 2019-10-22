#!/usr/bin/env node

import { exec } from "child_process";
import program from "commander";
import { Dirent } from "fs";

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
    "Define component(s) root path. Default to 'src/components/'"
  )
  .parse(process.argv);

const programPath = program.path || "src/components/";
const componentsPath = programPath.endsWith("/")
  ? programPath
  : `${programPath}/`;
const nodeModules = "node_modules";
const dist = program.dist || "dist";
const distAndModules = `${nodeModules} ${dist}`;
const removeDirectory = program.elm
  ? `${distAndModules} elm-stuff`
  : distAndModules;

const componentProcess = ({ name }: Dirent): ComponentProcess => {
  console.log(color.blue, `Cleaning ${name}...`);
  const process = exec(
    `cd ${componentsPath + name} && rm -rf ${removeDirectory}`
  );
  return { name, process };
};

const config: CommandConfig = {
  componentName: program.component,
  componentProcess,
  componentsPath,
};

command(config);
