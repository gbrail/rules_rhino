# rules_rhino

Some rules for Bazel.

## Babel rules

`babel_preprocess` transforms JavaScript sources with Babel. Each consumer
provides its own Babel configuration **and** its own npm dependency set:

```starlark
load("@rules_rhino//babel:defs.bzl", "babel_preprocess", "npm_install")

npm_install(
    name = "babel_deps",
    package_json = "//bazel:package.json",
    package_lock = "//bazel:package-lock.json",
)

babel_preprocess(
    name = "preprocessed",
    srcs = glob(["src/**/*.js"]),
    prefix = "js",
    config = "//bazel:babel.config.json",
    npm = ":babel_deps",
)
```

`npm_install` runs `npm ci` as an ordinary build action and installs into
a declared output directory, so Bazel re-runs it automatically whenever
`package.json` or `package-lock.json` changes. There is no repository rule
and no fetched npm repo to refetch, so node_modules can never be stale
relative to the build — on any machine, after any pin bump.

### Adding a Babel plugin

1. Add the plugin to your project's `package.json` (e.g.
   `bazel/package.json`), next to your `babel.config.json`, which must list
   it under `plugins`/`presets`.
2. Regenerate the lock file (`npm ci` fails if the two disagree):

       cd bazel && npm install --package-lock-only

3. Rebuild. Bazel re-runs the `npm ci` action and then the Babel actions.

The `npm ci` action verifies after installing that every package the lock
file requires on this platform is present on disk; an interrupted install
(timeout, antivirus, OneDrive) fails the build immediately instead of
surfacing later as a missing Babel plugin.

The actions run `node` and `npm` from the build machine's PATH (so the
workspace needs `build --action_env=PATH` in `.bazelrc`) and download from
the npm registry, so builds need network access.
