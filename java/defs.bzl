load(
    "//java/private:junit5_test.bzl",
    _junit5_test = "junit5_test",
)
load(
    "//java/private:java_test_suite.bzl",
    _java_test_suite = "java_test_suite",
)
load(
    "//java/private:googlejavaformat.bzl",
    _google_java_format = "google_java_format",
    _google_java_format_check = "google_java_format_check",
    _google_java_format_fix = "google_java_format_fix",
)

google_java_format = _google_java_format
google_java_format_check = _google_java_format_check
google_java_format_fix = _google_java_format_fix
java_test_suite = _java_test_suite
junit5_test = _junit5_test
