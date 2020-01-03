import bluebird from "bluebird";
import { readdirSync } from "fs";
import * as path from "path";
import color from "./color";
import { CommandConfig, ComponentProcess, MfEntity } from "./types";
import { isProjectDir } from "./utils";

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
      if (sequential) {
        return componentProcess(dirent.name, componentsPath, mfEntities[index]);
      }

      return new Promise(resolve => {
        componentProcess(dirent.name, componentsPath, mfEntities[index]).then(
          cop => {
            if (cop.process.stdout) {
              cop.process.stdout.on("data", data => {
                console.log(color.green, `${dirent.name}:`);
                console.log(data);
              });
            }
            if (cop.process.stderr) {
              cop.process.stderr.on("data", err => console.log(color.red, err));
              cop.process.on("close", () => resolve(cop));
            }
            return;
          }
        );
        return;
      });
    });

  const results: ComponentProcess[] = sequential
    ? await bluebird.mapSeries(components, res => res)
    : await bluebird.all(components);
  console.log(color.blue, "Done");

  if (postProcess) {
    await postProcess(results, componentsPath);
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
