#!/usr/bin/env node

import {exec, ChildProcess} from 'child_process';
import program from 'commander';
import {mkdirSync, Dirent} from 'fs';
import kebabCase from 'lodash.kebabcase';
import color from './core/color';
import {command, CommandConfig} from './core/command';


program
  .version('1.0.0')
  .option('-c, --component <component>', 'Build a specific component.')
  .option('-d, --domain <domain>', 'Define domain of these micro-frontends. Default to \'app\'')
  .option('-p, --path <path>', 'Define component(s) root path. Default to \'src/components/\'')
  .parse(process.argv);


const distDirectory = process.cwd() + '/dist';
const domain = program.domain || 'app';
const path = program.path || 'src/components/';
const componentsPath = path.endsWith('/') ? path : path + '/';

mkdirSync(distDirectory, {recursive: true});

const componentProcess = ({name}: Dirent): ChildProcess => {
      const componentDistDirectory = `${distDirectory}/components/${kebabCase(domain)}-${name}/`;
      mkdirSync(componentDistDirectory, {recursive: true});
      console.log(color.blue, `Bundling ${name}...`);
      return exec(`cd ${componentsPath + name} && cp dist/* ${componentDistDirectory}`);
}

const config: CommandConfig = {
  componentName: program.component,
  componentProcess,
  componentsPath,
}

command(config);
