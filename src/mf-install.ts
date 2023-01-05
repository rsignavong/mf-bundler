import { exec } from "child_process";
import os from "os";
import bluebird from "bluebird";
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

const execP = bluebird.promisify(exec);

const options = program.opts();
const programPath = options.path || "apps";
const componentsPath = programPath.endsWith("/")
  ? programPath
  : path.join(programPath, "/");
const targetEntity = options.entity;

const maxWorkers = os.cpus().length - 1;
const nbWorker = parseInt(options.worker) || maxWorkers;
const concurrency = Math.max(nbWorker > maxWorkers ? maxWorkers : nbWorker, 1);

const componentProcess = async (
  name: string,
  entity: string,
  componentFullPath: string,
  entitiesPath: string
): Promise<ComponentProcess> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(color.blue, `Installing dependencies ${entity}-${name}...`);
      await execP(`cd ${componentFullPath} && npm i`);

      resolve({ name, entity, componentFullPath });
    } catch (e) {
      reject(e)
    }
  });
};

getGlobalBundlerConfig(targetEntity).then((mfEntities: MfEntity[]) => {
  const config: CommandConfig = {
    componentName: options.component,
    componentProcess,
    componentsPath,
    mfEntities,
    concurrency
  };
  return Promise.all(command(config));
});
