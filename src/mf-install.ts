import { execSync } from "child_process";
import { program } from "commander";
import { default as path } from "path";

import color from "./core/color";
import { command } from "./core/command";
import { CommandConfig, ComponentProcess, MfEntity } from "./core/types";
import { getGlobalBundlerConfig } from "./core/utils";

program
  .version("1.0.0")
  .option("-c, --component <component>", "Build a specific component.")
  .option("-g, --entity <entity>", "Bundle a specific group/entity.")
  .option(
    "-p, --path <path>",
    "Define component(s) root path. Default to 'apps/'"
  )
  .parse(process.argv);

const options = program.opts();
const programPath = options.path || "apps";
const componentsPath = programPath.endsWith("/")
  ? programPath
  : path.join(programPath, "/");
const targetEntity = options.entity;

const componentProcess = async (
  name: string,
  entity: string,
  componentFullPath: string,
  entitiesPath: string
): Promise<ComponentProcess> => {
  console.log(color.blue, `Installing dependencies ${entity}-${name}...`);
  const proc = execSync(
    `cd ${componentFullPath} && pnpm i`,
    (error, stdout, stderr) => {
      if (error) {
        console.log(color.red, error);
        process.exit(1);
      }
    }
  );
  return { name, entity, componentFullPath, process: proc };
};

getGlobalBundlerConfig(targetEntity).then((mfEntities: MfEntity[]) => {
  const config: CommandConfig = {
    componentName: options.component,
    componentProcess,
    componentsPath,
    mfEntities,
  };
  return Promise.all(command(config));
});
