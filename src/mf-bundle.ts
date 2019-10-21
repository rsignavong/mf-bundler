#!/usr/bin/env node

import { exec } from "child_process";
import program from "commander";
import { Dirent, mkdirSync } from "fs";
import kebabCase from "lodash.kebabcase";

import color from "./core/color";
import { CommandConfig, ComponentProcess, command } from "./core/command";

program
  .version("1.0.0")
  .option("-c, --component <component>", "Build a specific component.")
  .option(
    "-d, --domain <domain>",
    "Define domain of these micro-frontends. Default to 'app'"
  )
  .option(
    "-p, --path <path>",
    "Define component(s) root path. Default to 'src/components/'"
  )
  .parse(process.argv);

const distDirectory = `${process.cwd()}/dist`;
const domain = program.domain || "app";
const path = program.path || "src/components/";
const componentsPath = path.endsWith("/") ? path : `${path}/`;

mkdirSync(distDirectory, { recursive: true });

const componentProcess = ({ name }: Dirent): ComponentProcess => {
  const componentDistDirectory = `${distDirectory}/components/${kebabCase(
    domain
  )}-${name}/`;
  mkdirSync(componentDistDirectory, { recursive: true });
  console.log(color.blue, `Bundling ${name}...`);
  const process = exec(
    `cd ${componentsPath + name} && cp dist/* ${componentDistDirectory}`
  );
  return { name, process };
};

const postProcess = (results: any[]): void => {
  console.log(results);
};

const config: CommandConfig = {
  componentName: program.component,
  componentProcess,
  componentsPath,
  postProcess,
};

command(config);
