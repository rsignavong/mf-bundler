#!/usr/bin/env node

import bluebird from "bluebird";
import { exec } from "child_process";
import program from "commander";
import fs from "fs-extra";
import isEmpty from "lodash.isempty";
import forEach from "lodash.foreach";
import groupBy from "lodash.groupby";
import { default as path, extname } from "path";

import color from "./core/color";
import { command } from "./core/command";
import {
  Bundler,
  BundlerByEntity,
  CommandConfig,
  ComponentProcess,
  MfEntity,
} from "./core/types";
import { getBundlerConfig, getGlobalBundlerConfig } from "./core/utils";

program
  .version("1.0.0")
  .option("-c, --component <component>", "Bundle a specific micro-frontend.")
  .option(
    "-d, --domain <domain>",
    "Define the domain folder to copy apps's assets. Default: undefined ;-)"
  )
  .option(
    "-p, --prefix <prefix>",
    "Define prefix url to manifest url and css. e.g. http://localhost:8080 or /assets/domain (without final '/'). Default to relative path."
  )
  .option(
    "-e, --environment <environment>",
    "Set NODE_ENV environment variable. Default to 'development'"
  )
  .option(
    "-j, --jsentry <jsentry>",
    "Define the js entry if the micro-frontend has lazy load chunks. Take the first js file if not define."
  )
  .option(
    "-o, --output <output>",
    "Define the output distributed folder of your micro-frontend. Default to 'dist/'"
  )
  .option(
    "-t, --targetDir <targetDir>",
    "Define where your manifest and ui will be built. Default to 'dist' in current directory"
  )
  .option(
    "-r, --root <root>",
    "Define component(s) root path. Default to 'apps/'"
  )
  .parse(process.argv);

const execP = bluebird.promisify(exec);

const env = program.environment || process.env.NODE_ENV || "development";
const distDirectory = path.join(process.cwd(), program.targetDir || "dist");
const programRootPath = program.root || "apps";
const componentsPath = path.join(programRootPath, "/");
const output = program.output || "dist";
const outputDist = path.join(output, "/");
const prefix = program.prefix || "";
const domain = program.domain || "";

fs.mkdirSync(distDirectory, { recursive: true });

const componentProcess = async (
  name: string,
  entitiesPath: string,
  entityConfig: MfEntity
): Promise<ComponentProcess> => {
  const { entity, uiType } = await getBundlerConfig(name, entitiesPath);
  // TODO check entity name on micro app file === entityName on global file
  // TODO get domain & distDir from conf file (entityConfig)
  const componentDists = [distDirectory, domain, entity, uiType, "/"];
  const componentDistDirectory = path.join(...componentDists);
  return new Promise(async (resolve, reject) => { // eslint-disable-line
    try {
      await fs.mkdirp(componentDistDirectory);
      console.log(
        color.blue,
        `Bundling ${entity}...${name}... and copy content from ${outputDist} to ${componentDistDirectory}`
      );
      await execP(
        `cd ${path.join(
          entitiesPath,
          name
        )} && npx cross-env NODE_ENV=${env} npm run build && npx copyfiles --up 1 ${outputDist}* ${componentDistDirectory}`
      );
      resolve({ name });
    } catch (e) {
      reject(e);
    }
  });
};

const postProcess = async (
  results: ComponentProcess[],
  componentsPath?: string
): Promise<void> => {
  console.log(color.blue, "Building mf-maestro.json...");
  const filterByType = (type: string) => ({ name }: fs.Dirent): boolean =>
    extname(name).toLowerCase() === `.${type}`;
  const bundlerConfig = await bluebird.reduce(
    results,
    async (acc: Array<Bundler>, { name }: ComponentProcess) => {
      const bundler = await getBundlerConfig(name, componentsPath);
      return [...acc, bundler];
    },
    []
  );
  const bundlerConfigByEntity = groupBy(bundlerConfig, "entity");

  for (const entity in bundlerConfigByEntity) {
    const uiTypes: Array<BundlerByEntity> = bundlerConfigByEntity[entity];
    const manifestFile = path.join(
      distDirectory,
      domain,
      entity,
      "mf-maestro.json"
    );
    let manifestData: object;
    try {
      const content: Buffer = await fs.readFile(manifestFile);
      manifestData = JSON.parse(content.toString());
    } catch (_err) {
      console.log(
        color.yellow,
        `Manifest doesn't exists for entity ${entity}.`
      );
      manifestData = {};
    }
    console.log("ui types:");
    console.log(uiTypes);

    const manifestJson = await bluebird.reduce(
      uiTypes,
      async (acc: object, { microAppName, uiType }: BundlerByEntity) => {
        const componentDists = [distDirectory, domain, entity, uiType, "/"];
        const componentDistDirectory = path.join(...componentDists);
        try {
          const jsFilesRaw = await fs.readdir(componentDistDirectory, {
            withFileTypes: true,
          });
          const jsFiles = jsFilesRaw.filter(filterByType("js"));
          const jsFile = program.jsentry
            ? jsFiles
                .filter(file => file.name.startsWith(program.jsentry))
                .shift()
            : jsFiles.shift();
          const manifestJs = jsFile
            ? { url: `${prefix}/${entity}/${uiType}/${jsFile.name}` }
            : {};

          const cssFilesRaw = await fs.readdir(componentDistDirectory, {
            withFileTypes: true,
          });
          const cssFiles = cssFilesRaw.filter(filterByType("css"));
          const cssFile = cssFiles.shift();
          const manifest = cssFile
            ? {
                ...manifestJs,
                css: `${prefix}/${entity}/${uiType}/${cssFile.name}`,
              }
            : manifestJs;

          const realManifest = {
            ...acc,
            [microAppName]: manifest,
          };

          if (isEmpty(manifest)) {
            return realManifest;
          }
          return realManifest;
        } catch (err) {
          console.error(err);
          return acc;
        }
      },
      manifestData
    );
    console.log(manifestFile, manifestJson, JSON.stringify(manifestJson));
    await fs.writeFile(manifestFile, JSON.stringify(manifestJson));
  }
  console.log(color.blue, "Done");
};

getGlobalBundlerConfig().then((mfEntities: MfEntity[]) => {
  const config: CommandConfig = {
    componentName: program.component,
    componentProcess,
    componentsPath,
    mfEntities,
    postProcess,
  };
  command(config);
});
