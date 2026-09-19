package org.brail.rules_rhino.java;

import static org.junit.platform.engine.discovery.DiscoverySelectors.selectClass;

import java.io.PrintWriter;
import org.junit.platform.launcher.Launcher;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;
import org.junit.platform.launcher.listeners.TestExecutionSummary;

public class JUnit5Runner {
  public static void main(String[] args) {
    if (args.length == 0) {
      System.err.println("No test class specified.");
      System.exit(1);
    }

    String className = args[0];
    LauncherDiscoveryRequest request =
        LauncherDiscoveryRequestBuilder.request()
            .selectors(selectClass(loadClass(className)))
            .build();

    Launcher launcher = LauncherFactory.create();
    SummaryGeneratingListener listener = new SummaryGeneratingListener();
    launcher.registerTestExecutionListeners(listener);
    launcher.execute(request);

    TestExecutionSummary summary = listener.getSummary();
    summary.printFailuresTo(new PrintWriter(System.out));

    System.out.printf(
        "Tests run: %d, Failures: %d, Aborted: %d, Skipped: %d%n",
        summary.getTestsStartedCount(),
        summary.getTestsFailedCount(),
        summary.getTestsAbortedCount(),
        summary.getTestsSkippedCount());

    if (summary.getTestsFailedCount() > 0 || summary.getTestsAbortedCount() > 0)
 {
      System.exit(1);
    }
    System.exit(0);
  }

  private static Class<?> loadClass(String className) {
    try {
      return Class.forName(className);
    } catch (ClassNotFoundException e) {
      throw new RuntimeException("Could not find class: " + className, e);
    }
  }
}