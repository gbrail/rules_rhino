package org.brail.rules_rhino.java.test;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.google.googlejavaformat.java.Main;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class GoogleJavaFormatGoldenTest {
  private static final String INPUT =
      "package com.example;\n"
          + "\n"
          + "public class    Sample{\n"
          + "    int add(int a,int b){return a + b;   }\n"
          + "}\n";

  private static final String EXPECTED =
      "package com.example;\n"
          + "\n"
          + "public class Sample {\n"
          + "  int add(int a, int b) {\n"
          + "    return a + b;\n"
          + "  }\n"
          + "}\n";

  private static Main formatter() {
    return new Main(new PrintWriter(System.out), new PrintWriter(System.err), System.in);
  }

  @Test
  void formatsToGolden(@TempDir Path dir) throws Exception {
    Path file = dir.resolve("Sample.java");
    Files.write(file, INPUT.getBytes(StandardCharsets.UTF_8));

    int dryRun = formatter().format("--dry-run", "--set-exit-if-changed", file.toString());
    assertEquals(1, dryRun, "dry-run should report the unformatted file as changed");

    int replace = formatter().format("--replace", file.toString());
    assertEquals(0, replace, "replace should succeed");
    String formatted = new String(Files.readAllBytes(file), StandardCharsets.UTF_8);
    assertEquals(EXPECTED, formatted, "formatted output should match the golden file");

    int idempotent = formatter().format("--dry-run", "--set-exit-if-changed", file.toString());
    assertEquals(0, idempotent, "formatted file should already be in canonical form");
  }
}
