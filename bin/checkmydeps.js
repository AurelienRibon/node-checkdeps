#!/usr/bin/env node
'use strict';

const help = `
Usage: checkmydeps [options] [path]
    path  The path of the target node module to check. Uses current directory if
          no path is provided.

Options:
    --hide-up-to-date  Prevents the display of up-to-date dependencies.
    --github-token     Defines the GitHub token to use to access private github
                       repositories. The token must have "repo" capability (check
                       your GitHub settings, section "Personal access tokens").
    -h, --help         Shows this description.`;

// -----------------------------------------------------------------------------
// PROGRAM
// -----------------------------------------------------------------------------

const minimist    = require('minimist');
const semver      = require('semver');
const suspend     = require('suspend');
const checkmydeps = require('../lib/checkmydeps');
const utils       = require('../lib/utils');
const $$          = suspend.resume;

const args         = minimist(process.argv.slice(2));
const modulePath   = args._[0] || '.';
const hideUpToDate = args['hide-up-to-date'];
const githubToken  = args['github-token'] || process.env.GITHUB_TOKEN;
const showHelp     = args.h || args.help;

if (showHelp) {
  console.log(help.trim());
  process.exit(0);
  return;
}

suspend.run(function* () {

  const deps   = yield checkmydeps(modulePath, { githubToken }, $$());
  const report = createReport(deps);
  console.log(report);

  yield* checkForUpdate();

}, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function createReport(deps) {
  if (hideUpToDate) {
    deps = deps.filter(dep => dep.status !== 'ok');
  }

  const useColors = process.stdout.isTTY;
  return utils.createReportTable(deps, { useColors });
}

function* checkForUpdate() {
  const content        = yield utils.downloadGithubPackage('AurelienRibon/node-checkmydeps', null, $$());
  const latestVersion  = content.version;
  const currentVersion = require('../package.json').version;

  if (semver.gt(latestVersion, currentVersion)) {
    const tty      = process.stdout.isTTY;
    const startRed = tty ? '\u001b[31;1m' : '';
    const endColor = tty ? '\u001b[0m' : '';

    console.log(`\n${startRed}Version ${latestVersion} is available, current is ${currentVersion}, please update.${endColor}`);
  }
}
