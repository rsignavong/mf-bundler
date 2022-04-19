#!/usr/bin/env node

import { exec } from "child_process";
import bluebird from "bluebird";
import program from "commander";
import { default as path } from "path";
import groupBy from "lodash.groupby";
import fs from "fs-extra";

import color from "./core/color";
import { command } from "./core/command";
import {
  Bundler,
  BundlerByEntity,
  CommandConfig,
  ComponentProcess,
  MfEntity,
  PartitionQueues,
} from "./core/types";
import { getBundlerConfig, getGlobalBundlerConfig } from "./core/utils";

program
  .version("1.0.0")
  .option(
    "-r, --root <root>",
    "Define component(s) root path. Default to 'apps/'"
  )
  .option(
    "-p, --partition <partition>",
    "Define number of partition. Default: 3"
  )
  .option(
    "-t, --targetPartitionDir <targetPartitionDir>",
    "Define the target partition directory concatened with the number of partition. e.g. 'partition_1'. Defautl: partition"
  )
  .parse(process.argv);

const execP = bluebird.promisify(exec);

const programRootPath = program.root || "apps";
const componentsPath = path.join(programRootPath, "/");
const partition = parseInt(program.partition) || 3;
const partitionTarget = program.targetPartitionDir || "partition";
const partitionQueues = [...Array(partition).keys()].reduce(
  (acc: PartitionQueues, partition: number): PartitionQueues => ({
    ...acc,
    [`${partitionTarget}_${partition + 1}`]: [],
  }),
  {}
);

console.log(partitionQueues);

const getMinPartitionQueue = (
  partitionQueues: PartitionQueues
): [string, string[]] => {
  return Object.entries(partitionQueues).reduce(
    ([prevPartition, prevQueues], [currPartition, currrQueues]) => {
      return prevQueues.length < currrQueues.length
        ? [prevPartition, prevQueues]
        : [currPartition, currrQueues];
    }
  );
};

const componentProcess = async (
  name: string,
  entitiesPath: string
): Promise<ComponentProcess> => ({ name });

const postProcess = async (
  results: ComponentProcess[],
  componentsPath?: string
): Promise<void> => {
  console.log(color.blue, `Partitionning over ${partition} partition(s)...`);
  const bundlerConfig = await bluebird.reduce(
    results,
    async (acc: Array<Bundler>, { name }: ComponentProcess) => {
      const bundler = await getBundlerConfig(name, componentsPath);
      return [...acc, bundler];
    },
    []
  );

  const bundlerConfigByEntity = groupBy(bundlerConfig, "entity");

  const fullPartitionQueues = Object.entries(bundlerConfigByEntity).reduce(
    (
      partitionQueues: PartitionQueues,
      [entity, bundlerConfigs]: [string, BundlerByEntity[]]
    ): PartitionQueues => {
      const [partition, queue] = getMinPartitionQueue(partitionQueues);
      const mfs = bundlerConfigs.map(({ uiType }) => `${entity}-${uiType}`);
      const newQueue = queue.concat(mfs);
      return { ...partitionQueues, [partition]: newQueue };
    },
    partitionQueues
  );

  for (const [partitionDir, mfs] of Object.entries(fullPartitionQueues)) {
    const partitionAlliumSystemDirectory = path.join(
      process.cwd(),
      partitionDir,
      "allium-system"
    );
    const partitionDirectory = path.join(
      partitionAlliumSystemDirectory,
      componentsPath
    );
    console.log(
      color.blue,
      `Creating partition directory ${partitionDirectory}`
    );
    await fs.mkdirp(partitionDirectory);

    console.log(
      color.blue,
      `Copy projects files to ${partitionAlliumSystemDirectory}`
    );
    await execP(`npx copyfiles --all * ${partitionAlliumSystemDirectory}`);

    console.log(color.blue, `Copy ${mfs.join(" ")} to ${partitionDirectory}`);
    const mfsPath = mfs.map(mf => path.join(componentsPath, mf)).join(" ");
    await execP(`cp -RP ${mfsPath} ${partitionDirectory}`);
  }
};

getGlobalBundlerConfig().then((mfEntities: MfEntity[]) => {
  const config: CommandConfig = {
    componentProcess,
    componentsPath,
    mfEntities,
    postProcess,
  };
  return Promise.all(command(config));
});
