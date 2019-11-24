#!/usr/bin/env node

import { exec } from "child_process";
import program from "commander";
import {
  Dirent,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import isEmpty from "lodash.isempty";
import forEach from "lodash.foreach";
import groupBy from "lodash.groupby";
import kebabCase from "lodash.kebabcase";
import { default as path, extname } from "path";

import color from "./core/color";
import { CommandConfig, ComponentProcess, command } from "./core/command";

interface Pkg {
  name: string;
  "mf-bundler": {
    entity: string;
    "ui-type": string;
  };
}

interface Bundler {
  entity: string;
  "ui-type": string;
}

interface UiType {
  "ui-type": string;
}

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
    "-n, --namespace <namespace>",
    "Define namespace prefix of these micro-frontends."
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
    "-r, --root <root>",
    "Define component(s) root path. Default to 'apps/'"
  )
  .parse(process.argv);

const env = program.environment || process.env.NODE_ENV || "development";
const distDirectory = path.join(process.cwd(), "dist");
const namespace = program.namespace || "";
const programRootPath = program.root || "apps";
const componentsPath = path.join(programRootPath, "/");
const output = program.output || "dist";
const outputDist = path.join(output, "/");
const prefix = program.prefix || "";
const domain = program.domain || "";

mkdirSync(distDirectory, { recursive: true });

const getPkg = (name: string): Pkg => {
  const pkgBuf = readFileSync(path.join(componentsPath, name, "package.json"));
  const pkg = JSON.parse(pkgBuf.toString());
  if (!pkg["mf-bundler"]) {
    console.log(color.red, `Missing mf-bundler config in ${name} app`);
    process.exit(1);
  }
  if (!pkg["mf-bundler"]["entity"]) {
    console.log(color.red, `Missing mf-bundler.entity config in ${name} app`);
    process.exit(1);
  }
  if (!pkg["mf-bundler"]["ui-type"]) {
    console.log(
      color.red,
      `Missing mf-bundler.ui-type config in ${name} app (e.g. master, detail, new, edit, ...)`
    );
    process.exit(1);
  }

  return pkg;
};

const componentProcess = ({ name }: Dirent): ComponentProcess => {
  const pkg = getPkg(name);
  const entity = pkg["mf-bundler"]["entity"];
  const uiType = pkg["mf-bundler"]["ui-type"];
  const componentDists = [distDirectory, domain, entity, uiType, "/"];
  const componentDistDirectory = path.join(...componentDists);
  mkdirSync(componentDistDirectory, { recursive: true });
  console.log(color.blue, `Bundling ${entity}...`);
  const proc = exec(
    `cd ${path.join(
      componentsPath,
      name
    )} && cross-env NODE_ENV=${env} npm run build && copyfiles --up 1 ${outputDist}* ${componentDistDirectory}`
  );
  return { name, process: proc };
};

const postProcess = (results: ComponentProcess[]): void => {
  console.log(color.blue, "Building mf-maestro.json...");
  const appName = (entity: string, uiType: string): string =>
    [kebabCase(namespace), entity, uiType].filter(i => !isEmpty(i)).join("-");
  const filterByType = (type: string) => ({ name }: Dirent): boolean =>
    extname(name).toLowerCase() === `.${type}`;
  const bundlerConfig = results.reduce(
    (acc: Array<Bundler>, { name }: ComponentProcess) => {
      const pkg = getPkg(name);
      return [...acc, pkg["mf-bundler"]];
    },
    []
  );
  const bundlerConfigByEntity = groupBy(bundlerConfig, "entity");
  forEach(
    bundlerConfigByEntity,
    (uiTypes: Array<UiType>, entity: string): void => {
      const manifestFile = path.join(
        distDirectory,
        domain,
        entity,
        "mf-maestro.json"
      );
      let manifestData: object;
      try {
        const content: Buffer = readFileSync(manifestFile);
        manifestData = JSON.parse(content.toString());
      } catch (_err) {
        console.log(
          color.yellow,
          `Manifest doesn't exists for entity ${entity}.`
        );
        manifestData = {};
      }

      const manifestJson = uiTypes.reduce((acc: object, ui: UiType) => {
        const uiType = ui["ui-type"];
        const microAppName = appName(entity, uiType);
        const componentDists = [distDirectory, domain, entity, uiType, "/"];
        const componentDistDirectory = path.join(...componentDists);
        const jsFiles = readdirSync(componentDistDirectory, {
          withFileTypes: true,
        }).filter(filterByType("js"));
        const jsFile = program.jsentry
          ? jsFiles
              .filter(file => file.name.startsWith(program.jsentry))
              .shift()
          : jsFiles.shift();
        const manifestJs = jsFile
          ? { url: `${prefix}/${entity}/${uiType}/${jsFile.name}` }
          : {};

        const cssFiles = readdirSync(componentDistDirectory, {
          withFileTypes: true,
        }).filter(filterByType("css"));
        const cssFile = cssFiles.shift();
        const manifest = cssFile
          ? {
              ...manifestJs,
              css: `${prefix}/${entity}/${uiType}/${cssFile.name}`,
            }
          : manifestJs;

        if (isEmpty(manifest)) {
          return acc;
        }

        return {
          ...acc,
          [microAppName]: manifest,
        };
      }, manifestData);
      writeFileSync(manifestFile, JSON.stringify(manifestJson));
    }
  );
  console.log(color.blue, "Done");
};

const config: CommandConfig = {
  componentName: program.component,
  componentProcess,
  componentsPath,
  postProcess,
};

command(config);
