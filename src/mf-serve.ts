#!/usr/bin/env node

import { exec } from "child_process";
import program from "commander";
import isFinite from "lodash.isfinite";

import color from "./core/color";

program
  .version("1.0.0")
  .option("-p, --port <port>", "Define port. Default to '8080/'")
  .parse(process.argv);

const programPort = program.port || 8080;
const port = isFinite(parseInt(programPort, 10))
  ? programPort
  : (() => {
      throw new Error("Port must be an integer value");
    })();

console.log(color.blue, `Running dev server on port ${port}`);
exec(`cd dist && http-server -p ${port}`);
