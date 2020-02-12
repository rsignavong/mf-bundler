import bluebird from "bluebird";
import fs from "fs-extra";
import * as path from "path";
import color from "./color";
import { CommandConfig, ComponentProcess, MfEntity } from "./types";
import { isProjectDir } from "./utils";

const asyncforEach = async (
  array,
  callback,
  acc: ComponentProcess[] = []
): Promise<ComponentProcess[]> => {
  for (let index = 0; index < array.length; index++) {
    const r = await callback(array[index], index, array);
    acc.push(r);
  }
  return acc;
};

const executeCommandProcess = async ({
  componentName,
  componentProcess,
  componentsPath,
  mfEntities,
  postProcess,
  sequential,
}: CommandConfig): Promise<void> => {
  try {
    const rawComponents = await fs.readdir(componentsPath, {
      withFileTypes: true,
    });
    const components = rawComponents.filter(dirent => {
      return isProjectDir(dirent, componentName, componentsPath);
    });
    const results = await asyncforEach(components, async (dirent, index) => {
      try {
        const { name } = await componentProcess(
          dirent.name,
          componentsPath,
          mfEntities[index]
        );
        console.log(`${name} done !`);
        return { name };
      } catch (e) {
        console.error(`error !`);
        console.error(e);
        process.exit(1);
      }
    });
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
  sequential = false,
}: CommandConfig): Promise<void>[] => {
  return mfEntities.map(async (entity: MfEntity) => {
    const tmpComponentsPath = path.join(componentsPath, entity.name);
    return await executeCommandProcess({
      componentName,
      componentProcess,
      componentsPath: tmpComponentsPath,
      mfEntities,
      postProcess,
      sequential,
    });
  });
};

export { command };
