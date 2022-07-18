#!/usr/bin/env node

import { execSync } from "child_process";
import program from "commander";
import { default as path } from "path";

import color from "./core/color";
import { command } from "./core/command";
import { CommandConfig, ComponentProcess, MfEntity } from "./core/types";
import { getGlobalBundlerConfig } from "./core/utils";

program
  .version("1.0.0")
  .option("-c, --component <component>", "Test a specific component.")
  .option("-g, --entity <entity>", "Bundle a specific group/entity.")
  .option(
    "-p, --path <path>",
    "Define component(s) root path. Default to 'apps/'"
  )
  .parse(process.argv);

const programPath = program.path || "apps";
const componentsPath = programPath.endsWith("/")
  ? programPath
  : path.join(programPath, "/");
const targetEntity = program.entity;

const componentProcess = async (
  name: string,
  entity: string,
  componentFullPath: string,
  entitiesPath: string
): Promise<ComponentProcess> => {
  console.log(color.blue, `Testing ${entity}-${name}...`);
  try {
    const syncResults = execSync(`cd ${componentFullPath} && npm test`, {
      stdio: "inherit",
    });
    return { name, entity, componentFullPath, syncResults };
  } catch (error) {
    console.log(color.red, error);
    process.exit(1);
  }
};

getGlobalBundlerConfig(targetEntity).then((mfEntities: MfEntity[]) => {
  const config: CommandConfig = {
    componentName: program.component,
    componentProcess,
    componentsPath,
    mfEntities,
    concurrency: 1,
  };
  return Promise.all(command(config));
});
