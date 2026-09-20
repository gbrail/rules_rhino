def _npm_install_impl(ctx):
    # The action installs into a declared directory output, so Bazel re-runs
    # it automatically whenever the package files change: no repository rule,
    # no manual refetching, no stale node_modules.
    #
    # The directory must not be named "node_modules": Node.js module
    # resolution treats a directory with that name as a module root and
    # would never search the node_modules inside it.
    out_dir = ctx.actions.declare_directory("deps")

    ctx.actions.run(
        outputs = [out_dir],
        inputs = [ctx.file.package_json, ctx.file.package_lock, ctx.file._runner],
        executable = "node",
        arguments = [
            ctx.file._runner.path,
            ctx.file.package_json.path,
            ctx.file.package_lock.path,
            out_dir.path,
        ],
        mnemonic = "NpmCi",
        progress_message = "Installing npm dependencies for %s" % ctx.label.name,
    )

    return [DefaultInfo(files = depset([out_dir]))]

npm_install = rule(
    implementation = _npm_install_impl,
    attrs = {
        "package_json": attr.label(
            mandatory = True,
            allow_single_file = True,
            doc = "The package.json to install from",
        ),
        "package_lock": attr.label(
            mandatory = True,
            allow_single_file = True,
            doc = "The package-lock.json matching package_json; regenerate it with 'npm install --package-lock-only' after editing package.json",
        ),
        "_runner": attr.label(
            allow_single_file = True,
            default = "@rules_rhino//babel:npm_install.js",
        ),
    },
)
