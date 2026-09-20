def _babel_preprocess_impl(ctx):
    all_outs = []
    node_executable = "node"

    for src in ctx.files.srcs:
        src_path = src.path
        if src_path.startswith("node/lib/"):
            rel_path = src_path[len("node/lib/"):]
        elif src_path.startswith("nodejs-local/"):
            rel_path = src_path[len("nodejs-local/"):]
        elif src_path.startswith("node/test/"):
            rel_path = src_path[len("node/test/"):]
        elif src_path.startswith("node/deps/"):
            rel_path = "internal/deps/" + src_path[len("node/deps"):]
        else:
            rel_path = src_path

        # Optionally strip a leading prefix (e.g. "JetStream") so outputs keep
        # their original top-level layout on the classpath.
        strip = ctx.attr.strip_prefix
        if strip and rel_path.startswith(strip + "/"):
            rel_path = rel_path[len(strip) + 1:]

        if ctx.attr.prefix:
            out_rel = ctx.attr.prefix + "/" + rel_path
        else:
            out_rel = rel_path
        out_file = ctx.actions.declare_file(out_rel)
        all_outs.append(out_file)

        wrapper_js = ctx.file._wrapper_js
        config_file = ctx.file.config
        node_modules = ctx.files._node_modules

        args = ctx.actions.args()
        args.add(wrapper_js.path)
        args.add(src.path)
        args.add(out_file.path)
        args.add(config_file.path)

        # To resolve Babel plugins, we must set NODE_PATH to the node_modules directory.
        node_modules_root = ""
        if node_modules:
            first_file = node_modules[0].path

            # Use simple string splitting since we can't use 'os' module in Starlark
            parts = first_file.split("node_modules")
            if len(parts) > 1:
                node_modules_root = parts[0] + "node_modules"

        ctx.actions.run(
            outputs = [out_file],
            inputs = [src, config_file, wrapper_js] + node_modules,
            executable = node_executable,
            arguments = [args],
            env = {"NODE_PATH": node_modules_root} if node_modules_root else None,
            mnemonic = "BabelCompile",
            progress_message = "Compiling %s with Babel" % src_path,
        )

    return [DefaultInfo(files = depset(all_outs))]

babel_preprocess = rule(
    implementation = _babel_preprocess_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "prefix": attr.string(doc = "Prefix for output; if empty, outputs keep their source paths"),
        "strip_prefix": attr.string(
            doc = "Leading path prefix (e.g. \"JetStream\") to strip from source paths when naming outputs",
        ),
        "config": attr.label(
            mandatory = True,
            allow_single_file = True,
            doc = "The Babel configuration (JSON) to apply to the sources",
        ),
        "_wrapper_js": attr.label(
            allow_single_file = True,
            default = "@rules_rhino//babel:babel_wrapper.js",
        ),
        "_node_modules": attr.label(
            default = "@rhino_babel_deps//:node_modules",
        ),
    },
)
