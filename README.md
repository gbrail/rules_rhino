# rules_rhino

Some rules for Bazel.

## Managing Babel plugins

The `babel_preprocess` rule gets its Babel plugins from the npm repo
`@rhino_babel_deps`, which is populated by running `npm ci` against
`babel/package.json` + `babel/package-lock.json`.

To add (or update) a plugin:

1. Add the dependency to `babel/package.json`.
2. Regenerate the lock file (the repo rule runs `npm ci`, which fails if
   the lock file is out of sync):

       cd babel && npm install --package-lock-only

3. Force a re-fetch of the npm repo in **every** project that uses it.
   Bzlmod does not re-run the repo rule when these files change, so delete
   the fetched repo from each output base:

       # in rules_rhino itself:
       rm -rf $(bazel info output_base)/external/+babel_deps_extension+rhino_babel_deps*

       # in a consuming project (e.g. ithaca, rhino-benchmarks):
       rm -rf $(bazel info output_base)/external/rules_rhino++babel_deps_extension+rhino_babel_deps*

   Note the different canonical repo name: inside the defining module the
   repo is `+babel_deps_extension+rhino_babel_deps`, while in consumers it
   carries the `rules_rhino++` module prefix.

4. Rebuild; the repo re-runs `npm ci` and the Babel actions re-execute.

Consumers pass their own Babel configuration to `babel_preprocess` via the
`config` attribute; only the plugin set lives in this module.
