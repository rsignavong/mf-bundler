import bluebird from 'bluebird';
import {ChildProcess} from 'child_process';
import {existsSync, readdirSync, Dirent} from 'fs';
import color from './color';


export interface CommandConfig {
  componentsPath: string,
  componentName?: string,
  componentProcess(dirent: Dirent): ChildProcess,
  postProcess?(results: Array<any>): void,
}

const command = ({componentName, componentProcess, componentsPath, postProcess}: CommandConfig): void => {
  const components: Array<Promise<any>> = 
  readdirSync(componentsPath, {withFileTypes: true})
    .filter(dirent => {
      if (!dirent.isDirectory()) return false;
      if (componentName && componentName !== dirent.name) return false;
      if (!existsSync(componentsPath + dirent.name + '/package-lock.json')) return false;
      return true;
    })
    .map(dirent => new Promise((resolve, reject) => {
      const pid: ChildProcess = componentProcess(dirent);
      pid.stdout.on('data', (data) => {
        console.log(color.green, `${dirent.name}:`)
        console.log(data);
      });
      pid.stderr.on('data', reject);
      pid.on('close', resolve);
    }));

    bluebird.all(components).then((results: Array<any>) => {
    console.log(color.blue, 'Done');

    postProcess && postProcess(results);
  });
}

export { command };
