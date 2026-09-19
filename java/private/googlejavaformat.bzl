load("@rules_java//java:defs.bzl", "java_binary", "java_test")

gjf_jvm_flags = [
    # Required by google-java-format on JDK 16+
    "--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED",
    "--add-exports=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED",
    "--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED",
    "--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED",
    "--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED",
    "--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED",
    # Opens for reflective access
    "--add-opens=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED",
    "--add-opens=jdk.compiler/com.sun.tools.javac.comp=ALL-UNNAMED",
]

_DRIVER_CLASS = "org.brail.rules_rhino.java.FormatDriver"

_DRIVER_DEPS = ["@rules_rhino//java:format_driver"]

def google_java_format():

    java_binary(
        name = "googlejavaformat",
        srcs = [],
        jvm_flags = gjf_jvm_flags,
        main_class = "com.google.googlejavaformat.java.Main",
        runtime_deps = ["@rules_rhino//java:google_java_format_jar"],
    )

def google_java_format_check(name, files, **kwargs):
    data = kwargs.pop("data", []) + files
    java_test(
        name = name,
        args = ["check"],
        data = data,
        jvm_flags = gjf_jvm_flags,
        main_class = _DRIVER_CLASS,
        runtime_deps = _DRIVER_DEPS,
        use_testrunner = False,
        **kwargs
    )

def google_java_format_fix(name, **kwargs):
    java_binary(
        name = name,
        args = ["fix"],
        jvm_flags = gjf_jvm_flags,
        main_class = _DRIVER_CLASS,
        runtime_deps = _DRIVER_DEPS,
        **kwargs
    )
