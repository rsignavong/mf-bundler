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

program
  .version("1.0.0")
  .option("-c, --component <component>", "Bundle a specific micro-frontend.")
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
    "Define component(s) root path. Default to 'src/components/'"
  )
  .parse(process.argv);

const dist = path.join("/", "dist");
const distDirectory = `${process.cwd()}${dist}`;
const namespace = program.namespace;
const fullComponentName = (name: string): string =>
  kebabCase(isEmpty(namespace) ? name : `${namespace}-${name}`);
const programPath = program.path || path.join("src", "components");
const componentsPath = path.join(programPath, "/");
const manifestFile = path.join(distDirectory, "manifest.json");
const output = program.output || "dist";
const outputDist = path.join(output, "/");

mkdirSync(distDirectory, { recursive: true });

let manifestData: object;
try {
  const content: Buffer = readFileSync(manifestFile);
  manifestData = JSON.parse(content.toString());
} catch (_err) {
  console.log(color.yellow, "Manifest doesn't exists.");
  manifestData = {};
}

const componentProcess = ({ name }: Dirent): ComponentProcess => {
  const componentDistDirectory = path.join(
    distDirectory,
    fullComponentName(name),
    "/"
  );
  mkdirSync(componentDistDirectory, { recursive: true });
  console.log(color.blue, `Bundling ${name}...`);
  const process = exec(
    `cd ${componentsPath +
      name} && copyfiles --up 1 ${outputDist}* ${componentDistDirectory}`
  );
  return { name, process };
};

const postProcess = (results: ComponentProcess[]): void => {
  console.log(color.blue, "Building manifest.json...");
  const filterByType = (type: string) => ({ name }: Dirent): boolean =>
    extname(name).toLowerCase() === `.${type}`;
  const manifestJson = results.reduce(
    (acc: object, { name }: ComponentProcess) => {
      const componentName = fullComponentName(name);
      const filePathpath = path.join(distDirectory, componentName);
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
            url: `/${componentName}/${jsFile.name}`,
          }
        : {};

      const cssFiles = readdirSync(filePathpath, {
        withFileTypes: true,
      }).filter(filterByType("css"));
      const cssFile = cssFiles.shift();
      const manifest = cssFile
        ? {
            ...manifestJs,
            css: `/${componentName}/${cssFile.name}`,
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
  writeFileSync(
    path.join(distDirectory, "manifest.json"),
    JSON.stringify(manifestJson)
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
