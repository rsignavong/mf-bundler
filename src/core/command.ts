import bluebird from "bluebird";
import fs from "fs-extra";
import * as path from "path";
import color from "./color";
import { CommandConfig, ComponentProcess, MfEntity } from "./types";
import { isProjectDir } from "./utils";
import { Dirent } from "fs";

const executeCommandProcess = async ({
  componentName,
  componentProcess,
  componentsPath,
  mfEntities,
  postProcess,
  concurrency,
}: CommandConfig): Promise<void> => {
  try {
    console.log(color.blue, `Execute ${concurrency} process in parallel`);
    const rawComponents: Dirent[] = await fs.readdir(componentsPath, {
      withFileTypes: true,
    });
    const components = rawComponents.filter(dirent =>
      isProjectDir(dirent, componentName, componentsPath)
    );
    const results = await bluebird.map(
      components,
      (dirent, index) => {
        const result = async (): Promise<ComponentProcess> => {
          try {
            return componentProcess(
              dirent.name,
              componentsPath,
              mfEntities[index]
            );
          } catch (e) {
            console.error(e);
            process.exit(1);
          }
        };
        return result();
      },
      { concurrency }
    );
    console.log(color.blue, "Done");
    if (postProcess) {
      await postProcess(results, componentsPath);
    }
    return;
  } catch (e) {
    console.error(e);
    return e;
  }
};

const command = ({
  componentName,
  componentProcess,
  componentsPath,
  mfEntities,
  postProcess,
  concurrency = 1,
}: CommandConfig): Promise<void>[] => {
  console.log(color.blue, "Running command for entities");
  return mfEntities.map((entity: MfEntity) => {
    const tmpComponentsPath = path.join(componentsPath, entity.name);
    return executeCommandProcess({
      componentName,
      componentProcess,
      componentsPath: tmpComponentsPath,
      mfEntities,
      postProcess,
      concurrency,
    });
  });
};

export { command };
