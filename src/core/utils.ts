import { Dirent, existsSync, readFileSync } from "fs";
import color from "./color";
import nodeEval from "node-eval";
import { runTransform } from "esm-to-cjs";
import { Bundler, MfEntity } from "./types";
import * as path from "path";
import { bundlerConfigFilesNames } from "./constants";

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
  componentName: string,
  componentsPath: string
): boolean => {
  if (!dirent.isDirectory()) {
    return false;
  }
  if (componentName && componentName !== dirent.name) {
    return false;
  }
  if (
    !existsSync(
      path.join(componentsPath, dirent.name, bundlerConfigFilesNames.microApp)
    )
  ) {
    return false;
  }
  if (!existsSync(path.join(componentsPath, dirent.name, "package.json"))) {
    return false;
  }
  return true;
};

export const getGlobalBundlerConfig = async (
  entity?: string
): Promise<MfEntity[]> => {
  if (!entity) {
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
    return [{ name: entity }];
  }
};

export const getBundlerConfig = async (
  name: string,
  entitiesPath: string
): Promise<Bundler> => {
  const bundlerConfig = await readConfigFromFile(
    path.resolve(entitiesPath, name, bundlerConfigFilesNames.microApp),
    name
  );
  if (!bundlerConfig.microAppName) {
    console.log(
      color.red,
      `Missing microAppName in ${bundlerConfigFilesNames.microApp} of ${name} app`
    );
    process.exit(1);
  }
  if (!bundlerConfig.entity) {
    console.log(
      color.red,
      `Missing entity in ${bundlerConfigFilesNames.microApp} of ${name} app`
    );
    process.exit(1);
  }
  if (!bundlerConfig.uiType) {
    console.log(
      color.red,
      `Missing uiType in ${bundlerConfigFilesNames.microApp} of ${name} app (e.g. master, detail, new, edit, ...)`
    );
    process.exit(1);
  }

  return bundlerConfig;
};
