load(":common.bzl", "get_class_name")
load(":junit5_test.bzl", "junit5_test")

def java_test_suite(
        name,
        srcs,
        size = None,
        **kwargs):
    """Run a suite of tests

       For each file in "srcs", run as a separate unit test using Java 5.
    """
    for src in srcs:
        suffix = src.rfind(".")
        prefix = src.rfind("/")
        test_name = src[prefix + 1:suffix]
        test_class = get_class_name(None, src)

        junit5_test(
            name = name + "_" + test_name,
            test_class = test_class,
            size = size,
            srcs = [src],
            visibility = ["//visibility:private"],
            **kwargs
        )
