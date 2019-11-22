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
import kebabCase from "lodash.kebabcase";
import { default as path, extname } from "path";

import color from "./core/color";
import { CommandConfig, ComponentProcess, command } from "./core/command";

interface Pkg {
  name: string;
  "mf-bundler": {
    "ui-type": string;
  };
}

program
  .version("1.0.0")
  .option("-c, --component <component>", "Bundle a specific micro-frontend.")
  .option(
    "-d, --domain <domain>",
    "Define domain prefix to manifest url and css. e.g. http://localhost:3002 (without final '/'). Default to relative path."
  )
  .option(
    "-e, --environment <environment>",
    "Set NODE_ENV environment variable. Default to 'development'"
  )
  .option(
    "-n, --namespace <namespace>",
    "Define namespace of these micro-frontends."
  )
  .option(
    "-e, --entrypoint <entrypoint>",
    "Define the js entry if the micro-frontend has lazy load chunks. Take the first js file if not define."
  )
  .option(
    "-o, --output <output>",
    "Define the output distributed folder of your micro-frontend. Default to 'dist/'"
  )
  .option(
    "-p, --path <path>",
    "Define component(s) root path. Default to 'apps/'"
  )
  .parse(process.argv);

const env = program.environment || process.env.NODE_ENV || "development";
const distDirectory = path.join(process.cwd(), "dist");
const namespace = program.namespace;
const fullComponentName = (name: string): string =>
  kebabCase(isEmpty(namespace) ? name : `${namespace}-${name}`);
const programPath = program.path || "apps";
const componentsPath = path.join(programPath, "/");
const manifestFile = path.join(distDirectory, "mf-maestro.json");
const output = program.output || "dist";
const outputDist = path.join(output, "/");
const domain = program.domain || "";

mkdirSync(distDirectory, { recursive: true });

let manifestData: object;
try {
  const content: Buffer = readFileSync(manifestFile);
  manifestData = JSON.parse(content.toString());
} catch (_err) {
  console.log(color.yellow, "Manifest doesn't exists.");
  manifestData = {};
}

const getPkg = (name: string): Pkg => {
  const pkgBuf = readFileSync(path.join(componentsPath, name, "package.json"));
  const pkg = JSON.parse(pkgBuf.toString());
  if (!pkg["mf-bundler"]) {
    console.log(color.red, "Missing mf-bundler config");
    process.exit(1);
  }
  if (!pkg["mf-bundler"]["ui-type"]) {
    console.log(
      color.red,
      "Missing mf-bundler.ui-type: master, detail, new, edit"
    );
    process.exit(1);
  }

  return pkg;
};

const componentProcess = ({ name }: Dirent): ComponentProcess => {
  const pkg = getPkg(name);
  const uiType = pkg["mf-bundler"]["ui-type"];
  const componentDistDirectory = path.join(
    distDirectory,
    fullComponentName(pkg.name),
    uiType,
    "/"
  );
  mkdirSync(componentDistDirectory, { recursive: true });
  console.log(color.blue, `Bundling ${pkg.name}...`);
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
  const filterByType = (type: string) => ({ name }: Dirent): boolean =>
    extname(name).toLowerCase() === `.${type}`;
  const manifestJson = results.reduce(
    (acc: object, { name }: ComponentProcess) => {
      const pkg = getPkg(name);
      const uiType = pkg["mf-bundler"]["ui-type"];
      const componentName = fullComponentName(pkg.name);
      const filePathpath = path.join(distDirectory, componentName, uiType);
      const jsFiles = readdirSync(filePathpath, { withFileTypes: true }).filter(
        filterByType("js")
      );
      const jsFile = program.entrypoint
        ? jsFiles
            .filter(file => file.name.startsWith(program.entrypoint))
            .shift()
        : jsFiles.shift();
      const manifestJs = jsFile
        ? {
            url: `${domain}/${componentName}/${uiType}/${jsFile.name}`,
          }
        : {};

      const cssFiles = readdirSync(filePathpath, {
        withFileTypes: true,
      }).filter(filterByType("css"));
      const cssFile = cssFiles.shift();
      const manifest = cssFile
        ? {
            ...manifestJs,
            css: `${domain}/${componentName}/${uiType}/${cssFile.name}`,
          }
        : manifestJs;

      if (isEmpty(manifest)) {
        return acc;
      }

      return {
        ...acc,
        [componentName]: manifest,
      };
    },
    manifestData
  );
  writeFileSync(manifestFile, JSON.stringify(manifestJson));
  console.log(color.blue, "Done");
};

const config: CommandConfig = {
  componentName: program.component,
  componentProcess,
  componentsPath,
  postProcess,
};

command(config);
