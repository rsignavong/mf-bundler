import { ChildProcess } from "child_process";

export interface Bundler {
  microAppName: string;
  entity: string;
  uiType: string;
  processor: string;
  requiredAcls: string[];
}

export interface BundlerByEntity {
  microAppName: string;
  uiType: string;
  processor: string;
  requiredAcls: string[];
}

export interface ComponentProcess {
  name: string;
  process?: ChildProcess;
  syncResults?: Buffer | string;
}

export interface MfEntity {
  name: string;
  domain?: string;
  prefix?: string;
}

export interface CommandConfig {
  componentsPath: string;
  componentName?: string;
  mfEntities?: MfEntity[];
  componentProcess(
    name: string,
    componentsPath?: string,
    entityConfig?: MfEntity
  ): Promise<ComponentProcess>;
  postProcess?(
    results: ComponentProcess[],
    componentsPath?: string
  ): Promise<void>;
  concurrency?: number;
}

export interface PartitionQueues {
  [key: string]: string[];
}
