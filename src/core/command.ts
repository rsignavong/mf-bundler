import bluebird from "bluebird";
import fs from "fs-extra";
import * as path from "path";
import color from "./color";
import {
  CommandConfig,
  ComponentProcess,
  MfEntity,
  ComponentPathInfo,
} from "./types";
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
    const components = await bluebird.reduce(
      rawComponents,
      (res, entityDirent) => {
        const result = async (): Promise<ComponentPathInfo[]> => {
          if (entityDirent.isDirectory()) {
            const rawMfs: Dirent[] = await fs.readdir(
              path.join(componentsPath, entityDirent.name),
              {
                withFileTypes: true,
              }
            );

            return [
              ...res,
              ...rawMfs
                .filter(dirent =>
                  isProjectDir(
                    dirent,
                    entityDirent.name,
                    componentName,
                    componentsPath
                  )
                )
                .map(dirent => ({
                  entityDirent,
                  componentDirent: dirent,
                })),
            ];
          } else {
            return res;
          }
        };
        return result();
      },
      []
    );

    const results = await bluebird.map(
      components,
      ({ entityDirent, componentDirent }, index) => {
        const result = async (): Promise<ComponentProcess> => {
          try {
            return componentProcess(
              componentDirent.name,
              entityDirent.name,
              path.join(
                componentsPath,
                entityDirent.name,
                componentDirent.name
              ),
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
