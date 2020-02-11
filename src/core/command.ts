import bluebird from "bluebird";
import { readdirSync } from "fs";
import * as path from "path";
import color from "./color";
import { CommandConfig, ComponentProcess, MfEntity } from "./types";
import { isProjectDir } from "./utils";

const asyncforEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const executeCommandProcess = async ({
  componentName,
  componentProcess,
  componentsPath,
  mfEntities,
  postProcess,
  sequential,
}: CommandConfig): Promise<void> => {
  const components: Array<Promise<ComponentProcess>> = readdirSync(
    componentsPath,
    {
      withFileTypes: true,
    }
  )
    .filter(dirent => {
      return isProjectDir(dirent, componentName, componentsPath);
    })
    .map((dirent, index) => {
      return componentProcess(dirent.name, componentsPath, mfEntities[index]);
    });

  try {
    // const results = await asyncforEach(components, c => c.process);
    // console.log(results);
    const results: ComponentProcess[] = sequential
      ? await bluebird.mapSeries(components, res => res)
      : await bluebird.all(components);
    // const resultsProcess = await Promise.all(results.map(res => res.process));
    // console.log(resultsProcess);
    console.log(color.blue, "Done");

    if (postProcess) {
      await postProcess(results, componentsPath);
    }
  } catch (e) {
    console.error(e);
  }
  return;
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
