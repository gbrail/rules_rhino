package org.brail.rules_rhino.java;

import com.google.googlejavaformat.java.Formatter;
import com.google.googlejavaformat.java.FormatterException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

public class FormatDriver {
  public static void main(String[] args) throws Exception {
    if (args.length == 0) {
      System.err.println("usage: FormatDriver <check|fix> [paths...]");
      System.exit(2);
    }
    String mode = args[0];
    List<String> paths = Arrays.asList(args).subList(1, args.length);
    int exit;
    switch (mode) {
      case "check":
        exit = check(paths);
        break;
      case "fix":
        exit = fix(paths);
        break;
      default:
        System.err.println("unknown mode: " + mode);
        exit = 2;
    }
    System.exit(exit);
  }

  private static String format(String src) throws FormatterException {
    return new Formatter().formatSource(src);
  }

  private static int check(List<String> paths) {
    String testSrcdir = System.getenv("TEST_SRCDIR");
    List<Path> targets;
    try {
      targets = checkTargets(paths, testSrcdir);
    } catch (Exception e) {
      System.err.println("Failed to collect files: " + e);
      return 1;
    }
    if (targets.isEmpty()) {
      System.out.println("No Java files found to check.");
      return 0;
    }
    List<String> bad = new ArrayList<>();
    List<String> errors = new ArrayList<>();
    for (Path p : targets) {
      try {
        String src = new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
        if (!format(src).equals(src)) {
          bad.add(p.toString());
        }
      } catch (IOException | FormatterException e) {
        errors.add(p + ": " + e);
      }
    }
    if (!errors.isEmpty()) {
      System.err.println("Errors while checking:");
      errors.forEach(e -> System.err.println("  " + e));
      return 1;
    }
    if (!bad.isEmpty()) {
      System.err.println("The following files are not formatted with google-java-format:");
      bad.forEach(b -> System.err.println("  " + b));
      return 1;
    }
    System.out.println("All " + targets.size() + " file(s) are properly formatted.");
    return 0;
  }

  private static List<Path> checkTargets(List<String> paths, String testSrcdir) throws IOException {
    if (!paths.isEmpty()) {
      List<Path> targets = new ArrayList<>();
      for (String p : paths) {
        targets.add(resolve(p, testSrcdir));
      }
      return targets;
    }
    if (testSrcdir != null) {
      return findJavaFiles(Paths.get(testSrcdir, "_main"));
    }
    throw new IOException("no file paths given and TEST_SRCDIR is not set");
  }

  private static int fix(List<String> paths) {
    List<Path> targets;
    try {
      targets = fixTargets(paths);
    } catch (IOException e) {
      System.err.println("Failed to collect files: " + e);
      return 1;
    }
    if (targets.isEmpty()) {
      System.out.println("No Java files found to format.");
      return 0;
    }
    int changed = 0;
    List<String> errors = new ArrayList<>();
    for (Path p : targets) {
      try {
        String src = new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
        String fmt = format(src);
        if (!fmt.equals(src)) {
          Files.write(p, fmt.getBytes(StandardCharsets.UTF_8));
          changed++;
          System.out.println("Formatted: " + p);
        }
      } catch (IOException | FormatterException e) {
        errors.add(p + ": " + e);
      }
    }
    if (!errors.isEmpty()) {
      System.err.println("Errors while fixing:");
      errors.forEach(e -> System.err.println("  " + e));
      return 1;
    }
    System.out.println(changed + " of " + targets.size() + " file(s) reformatted.");
    return 0;
  }

  private static List<Path> fixTargets(List<String> paths) throws IOException {
    if (!paths.isEmpty()) {
      List<Path> targets = new ArrayList<>();
      for (String p : paths) {
        Path path = Paths.get(p);
        if (Files.isDirectory(path)) {
          targets.addAll(findJavaFiles(path));
        } else if (Files.isRegularFile(path)) {
          targets.add(path);
        } else {
          System.err.println("Skipping (not found): " + p);
        }
      }
      return targets;
    }
    String ws = System.getenv("BUILD_WORKSPACE_DIRECTORY");
    if (ws == null) {
      throw new IOException(
          "BUILD_WORKSPACE_DIRECTORY is not set; pass file or directory paths explicitly");
    }
    return findJavaFiles(Paths.get(ws));
  }

  private static Path resolve(String p, String testSrcdir) {
    Path path = Paths.get(p);
    if (Files.exists(path)) {
      return path;
    }
    if (testSrcdir != null) {
      Path prefixed = Paths.get(testSrcdir).resolve(p);
      if (Files.exists(prefixed)) {
        return prefixed;
      }
    }
    return path;
  }

  private static List<Path> findJavaFiles(Path root) throws IOException {
    List<Path> result = new ArrayList<>();
    if (!Files.isDirectory(root)) {
      return result;
    }
    try (Stream<Path> stream = Files.walk(root)) {
      stream
          .filter(Files::isRegularFile)
          .filter(p -> p.getFileName().toString().endsWith(".java"))
          .filter(p -> !isUnderSkippedDir(root, p))
          .sorted()
          .forEach(result::add);
    }
    return result;
  }

  private static boolean isUnderSkippedDir(Path root, Path file) {
    for (Path segment : root.relativize(file)) {
      String s = segment.toString();
      if (s.startsWith(".") || s.startsWith("bazel-")) {
        return true;
      }
    }
    return false;
  }
}
