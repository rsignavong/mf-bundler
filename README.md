# MfBundler

MfBundler ([npm link](https://www.npmjs.com/package/mf-bundler)) allow you to build your components with single command line

# Quick Setup
In order to works, Mf-bundler needs:
- `mf-bundler.config.js` at the root of the project with 
```
const config = {
  entities: [
    {
      name: "menu", // entity folder name inside apps/ folder
    }
  ]
};

export {config};
```
- `mf-app.config.js` at the root of each entity-type microfronts with 
```
const config = {
  microAppName: "micro-app-menu-detail", // used by registerMicroApp and MicroAppComponent name attribute 
  entity: "menu", // used for the mf-maestro.json and dist folder structure for build
  uiType: "detail" // used for the mf-maestro.json and dist folder structure for build
};

export {config};
```
- npm scripts in root package.json with
```
  "scripts": {
    "build": "mf-bundle -d back-office-menu -p /assets/back-office-menu", // -d for domain & -p for prefix inside mf-maestro.json
    "clean": "mf-clean",
    "dependencies": "mf-install",
    "postinstall": "npm run dependencies",
    "start": "mf-serve",
    "test": "mf-test",
    "watch": "npm-watch"
  },
```

The overall structure to work will look like this:
```
/apps
     /entity
            /entity-master
                          /package.json
                          /mf-app.config.js
            /entity-detail
                          /package.json
                          /mf-app.config.js
            /entity-type...
/package.json => with mf-bundler scripts and installed in dependencies
/mf-bundler.config.json
```
