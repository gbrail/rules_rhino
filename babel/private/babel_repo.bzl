def _babel_deps_repo_impl(repository_ctx):
    package_json = repository_ctx.path(repository_ctx.attr.package_json)
    package_lock = repository_ctx.path(repository_ctx.attr.package_lock)

    # Let's find python
    python = repository_ctx.which("python") or repository_ctx.which("python3") or repository_ctx.which("py")
    if not python:
        res = repository_ctx.execute(["where", "python"])
        if res.return_code == 0:
            python = res.stdout.splitlines()[0].strip()

    if not python:
        fail("Python is required.")

    # We will write a python helper script "install.py"
    repository_ctx.file("install.py", """
import shutil
import subprocess
import sys
import os

def main():
    pkg_json = sys.argv[1]
    pkg_lock = sys.argv[2]
    
    # Copy package files
    shutil.copy2(pkg_json, "package.json")
    shutil.copy2(pkg_lock, "package-lock.json")
    
    # Run npm ci
    print("Running npm ci...")
    npm_cmd = ["npm", "ci"]
    if os.name == 'nt':
        res = subprocess.run(npm_cmd, shell=True)
    else:
        res = subprocess.run(npm_cmd)
    if res.returncode != 0:
        print("npm ci failed with code", res.returncode)
        sys.exit(res.returncode)
        
    print("NPM installation completed successfully!")

if __name__ == "__main__":
    main()
""")

    # Now execute the Python script
    res = repository_ctx.execute([
        python,
        "install.py",
        str(package_json),
        str(package_lock),
    ], timeout = 600)

    if res.return_code != 0:
        fail("Babel dependencies installation repository rule failed:\n%s\n%s" % (res.stdout, res.stderr))

    # Print the output log so developers can see it
    print(res.stdout)

    # Create a BUILD.bazel file in the repository to expose the installed node_modules
    repository_ctx.file("BUILD.bazel", """
filegroup(
    name = "node_modules",
    srcs = glob(["node_modules/**/*"], exclude = ["node_modules/**/.*"]),
    visibility = ["//visibility:public"],
)

exports_files(
    ["node_modules/@babel/cli/bin/babel.js"],
    visibility = ["//visibility:public"],
)
""")

babel_deps_repo = repository_rule(
    implementation = _babel_deps_repo_impl,
    attrs = {
        "package_json": attr.label(mandatory = True, allow_single_file = True),
        "package_lock": attr.label(mandatory = True, allow_single_file = True),
    },
)

def _babel_deps_extension_impl(module_ctx):
    babel_deps_repo(
        name = "rhino_babel_deps",
        package_json = "//babel:package.json",
        package_lock = "//babel:package-lock.json",
    )

babel_deps_extension = module_extension(
    implementation = _babel_deps_extension_impl,
)
