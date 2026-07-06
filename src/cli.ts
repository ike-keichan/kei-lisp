import { CliApp } from './interpreter/CliApp/index.js';

process.exitCode = CliApp.run(process.argv.slice(2));
