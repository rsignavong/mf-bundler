#!/usr/bin/env node

import bluebird from 'bluebird';
import {exec} from 'child_process';
import program from 'commander';
import {existsSync, mkdirSync, readdirSync} from 'fs';
import kebabCase from 'lodash.kebabcase';

const logColor = '\x1b[34m%s\x1b[0m';
const distDirectory = process.cwd() + '/dist';


mkdirSync(distDirectory, {recursive: true});

program
  .version('1.0.0')
  .option('-c, --component <component>', 'Build a specific component.')
  .option('-d, --domain <domain>', 'Define domain of these micro-frontends. Default to \'app\'')
  .option('-e, --environment <environment>', 'Set NODE_ENV environment variable. Default to \'development\'')
  .option('-p, --path <path>', 'Define component(s) root path. Default to \'src/components/\'')
  .parse(process.argv);



const NODE_ENV = program.environment || process.env.NODE_ENV || 'development';
const domain = program.domain || 'app';
const path = program.path || 'src/components/';
const componentsPath = path.endsWith('/') ? path : path + '/';

const components =
  readdirSync(componentsPath, {withFileTypes: true})
    .filter(dirent => {
      if (!dirent.isDirectory()) return false;
      if (program.component && program.component !== dirent.name) return false;
      if (!existsSync(componentsPath + dirent.name + '/package-lock.json')) return false;
      return true;
    })
    .map(dirent => new Promise((resolve, reject) => {
      const componentDistDirectory = `${distDirectory}/components/${kebabCase(domain)}-${dirent.name}/`;
      mkdirSync(componentDistDirectory, {recursive: true});
      console.log(logColor, `Installing dependencies for ${dirent.name}...`);
      const pid = exec(`cd ${componentsPath + dirent.name} && npm ci && NODE_ENV=${NODE_ENV} npm run build && cp dist/* ${componentDistDirectory}`);
      pid.stderr.on('data', reject);
      pid.on('close', resolve);
    }));

bluebird.all(components).then(() => {
  console.log(logColor, 'Building component.json...');
});
