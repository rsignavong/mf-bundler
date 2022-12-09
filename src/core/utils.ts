import { Dirent, existsSync, readFileSync } from "fs";
import color from "./color";
import nodeEval from "node-eval";
import { runTransform } from "esm-to-cjs";
import { Bundler, MfEntity } from "./types";
import * as path from "path";
import { bundlerConfigFilesNames } from "./constants";
import Case from "case";

const readConfigFromFile = async (filePath: string, name?: string) => {
  let errorMessage = `Missing config ${bundlerConfigFilesNames.global}`;
  if (filePath.indexOf(bundlerConfigFilesNames.microApp) !== -1) {
    errorMessage = `Missing config ${bundlerConfigFilesNames.microApp} in ${name} app`;
  }
  const bundlerConfigSource = readFileSync(filePath, "utf8");
  const { config: bundlerConfig } = nodeEval(
    runTransform(bundlerConfigSource.toString())
  );
  if (!bundlerConfig) {
    console.log(color.red, errorMessage);
    process.exit(1);
  }
  return bundlerConfig;
};

export const isProjectDir = (
  dirent: Dirent,
  entityName: string,
  componentName: string,
  componentsPath: string
): boolean => {
  if (!dirent.isDirectory()) {
    return false;
  }
  if (componentName && Case.kebab(componentName) !== `${entityName}-${dirent.name}`) {
    return false;
  }
  if (
    !existsSync(
      path.join(
        componentsPath,
        entityName,
        dirent.name,
        bundlerConfigFilesNames.microApp
      )
    )
  ) {
    return false;
  }
  if (
    !existsSync(
      path.join(componentsPath, entityName, dirent.name, "package.json")
    )
  ) {
    return false;
  }
  return true;
};

export const getGlobalBundlerConfig = async (
  entity?: string
): Promise<MfEntity[]> => {
  if (!entity) {
    console.log(
      color.blue,
      `Get Global Bundler Config from ${bundlerConfigFilesNames.global}`
    );
    const bundlerConfig = await readConfigFromFile(
      bundlerConfigFilesNames.global
    );
    if (!bundlerConfig.entities) {
      console.log(
        color.red,
        `Missing entities in ${bundlerConfigFilesNames.global}`
      );
      process.exit(1);
    }
    return bundlerConfig.entities;
  } else {
    console.log(color.blue, `Get Global Bundler Config for ${entity}`);
    return [{ name: entity }];
  }
};

export const getBundlerConfig = async (
  name: string,
  entity: string,
  componentFullPath: string
): Promise<Bundler> => {
  console.log(color.blue, `Reading ${entity}-${name} Bundler Config file`);
  const bundlerConfig = await readConfigFromFile(
    path.resolve(componentFullPath, bundlerConfigFilesNames.microApp),
    `${entity}-${name}`
  );
  if (!bundlerConfig.microAppName) {
    console.log(
      color.red,
      `Missing microAppName in ${bundlerConfigFilesNames.microApp} of ${entity}-${name} app`
    );
    process.exit(1);
  }
  if (!bundlerConfig.entity) {
    console.log(
      color.red,
      `Missing entity in ${bundlerConfigFilesNames.microApp} of ${entity}-${name} app`
    );
    process.exit(1);
  }
  if (!bundlerConfig.uiType) {
    console.log(
      color.red,
      `Missing uiType in ${bundlerConfigFilesNames.microApp} of $${entity}-${name} app (e.g. master, detail, new, edit, ...)`
    );
    process.exit(1);
  }
  if (!bundlerConfig.mfName) {
    console.log(
      color.red,
      `Missing mfName in ${bundlerConfigFilesNames.microApp} of $${entity}-${name} app`
    );
    process.exit(1);
  }
  if (typeof bundlerConfig.processor === "undefined") {
    console.log(
      color.red,
      `Missing processor in ${bundlerConfigFilesNames.microApp} of ${entity}-${name} app`
    );
    process.exit(1);
  }
  if (
    !bundlerConfig.requiredAcls ||
    bundlerConfig.requiredAcls.constructor !== Array
  ) {
    console.log(
      color.red,
      `Missing requiredAcls in ${bundlerConfigFilesNames.microApp} of ${entity}-${name} app (e.g. ['create', 'index'])`
    );
    process.exit(1);
  }

  return bundlerConfig;
};
