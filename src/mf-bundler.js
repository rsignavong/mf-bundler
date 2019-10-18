#!/usr/bin/env node

import bluebird from 'bluebird';
import {exec} from 'child_process';
import program from 'commander';
import {promisify} from 'util';
import {mkdirSync, readdirSync} from 'fs';
import kebabCase from 'lodash.kebabcase';

const logColor = '\x1b[34m%s\x1b[0m';
const distDirectory = __dirname + '/dist';


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
const run = promisify(exec);


const components =
  readdirSync(path, {withFileTypes: true})
    .filter(dirent => dirent.isDirectory() && program.name ? program.name === dirent.name : true)
    .map(dirent => {
      const componentDirectory = `${distDirectory}/components/${kebabCase(domain)}-${dirent.name}/`;
      mkdirSync(componentDirectory, {recursive: true});
      run(`cd ${path} && npm ci && NODE_ENV=${NODE_ENV} npm run build && cp dist/* ${componentDirectory}`);
    });


bluebird.all(components).then(() => {
  console.log(logColor, 'Building component.json...');
});
