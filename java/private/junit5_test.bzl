load("@rules_java//java:defs.bzl", "java_test")
load(":common.bzl", "get_package_name")

def junit5_test(
        name,
        test_class = "",
        args = [],
        runtime_deps = [],
        **kwargs):
    """Run junit5 tests using Bazel.

       This works the same way as java_test but uses the JUnit5 runner.
    """

    if test_class:
        clazz = test_class
    else:
        clazz = get_package_name() + name

    java_test(
        name = name,
        main_class = "org.brail.rules_rhino.java.JUnit5Runner",
        args = [clazz] + args,
        runtime_deps = runtime_deps + [
            "@maven//:org_junit_platform_junit_platform_launcher",
            "@maven//:org_junit_platform_junit_platform_engine",
            "@maven//:org_junit_jupiter_junit_jupiter_engine",
            "@rules_rhino//java:junit5_runner",
        ],
        test_class = clazz,
        **kwargs
    )
