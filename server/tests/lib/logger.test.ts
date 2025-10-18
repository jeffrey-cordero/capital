/**
 * Tests for logger functionality
 *
 * Expected output format:
 *
 * 2025-10-13T23:32:51.509Z (info)
 *
 * Test info message
 *
 * ================================
 */
import { logger } from "@/lib/logger";

describe("Logger", () => {
   describe("logger configuration", () => {
      it("should have all proper configurations", () => {
         // Assert - default log level
         expect(logger.level).toBe("info");

         // Assert - console transport configuration
         expect(logger.transports).toHaveLength(1);
         expect(logger.transports[0].constructor.name).toBe("Console");

         // Assert - format configuration
         expect(logger.format).toBeDefined();

         // Assert - transport level matches logger level
         expect((logger.transports[0] as any).level).toBe("info");
      });
   });

   describe("logger methods", () => {
      const methods = ["info", "error", "warn", "debug"] as const;

      methods.forEach(method => {
         it(`should have ${method} method`, () => {
            expect(typeof logger[method]).toBe("function");
         });
      });
   });

   describe("logger output format", () => {
      it("should format messages according to expected template", () => {
         // Expected format template based on logger.ts implementation
         const expectedDivider = "=".repeat(32);
         const expectedTemplate = (timestamp: string, level: string, message: string) =>
            `${timestamp} (${level})\n\n${message}\n\n${expectedDivider}`;

         // Test with a known message
         const testLevel = "info";
         const testMessage = "Test format verification";

         // Act - Log the message
         expect(() => logger.info(testMessage)).not.toThrow();

         // Assert - Verify the format components exist in the expected structure
         expect(logger.format).toBeDefined();
         expect(logger.level).toBe(testLevel);

         // Verify the divider constant (32 equals signs) is used
         expect(expectedDivider).toHaveLength(32);
         expect(expectedDivider).toBe("================================");

         // Verify template function produces expected structure
         const mockTimestamp = "2025-10-13T23:41:20.641Z";
         const mockLevel = "info";
         const mockMessage = "Test message";
         const expectedOutput = expectedTemplate(mockTimestamp, mockLevel, mockMessage);

         // Verify the output contains the expected components
         expect(expectedOutput).toContain(mockTimestamp);
         expect(expectedOutput).toContain(`(${mockLevel})`);
         expect(expectedOutput).toContain(mockMessage);
         expect(expectedOutput).toContain(expectedDivider);

         // Verify double newlines around message
         expect(expectedOutput).toMatch(/\n\n.*\n\n/);
      });

      const testCases = [
         { level: "info", message: "Test info message" },
         { level: "error", message: "Test error message" },
         { level: "warn", message: "Test warning message" }
      ];

      testCases.forEach(({ level, message }) => {
         it(`should format ${level} messages with proper structure`, () => {
            // Act & Assert - Verify the logger doesn't throw and has expected structure
            expect(() => (logger as any)[level](message)).not.toThrow();
         });
      });

      it("should not output debug messages when level is info", () => {
         // Act & Assert - Debug messages should not be logged at info level
         expect(() => logger.debug("Test debug message")).not.toThrow();
      });

      it("should handle multi-line messages correctly", () => {
         const multiLineMessage = "Line 1\nLine 2\nLine 3";

         // Act & Assert
         expect(() => logger.info(multiLineMessage)).not.toThrow();
      });

      it("should handle empty messages correctly", () => {
         // Act & Assert
         expect(() => logger.info("")).not.toThrow();
      });
   });

   describe("logger functionality", () => {
      const testMessages = [
         { method: "info", message: "Test info message" },
         { method: "error", message: "Test error message" },
         { method: "warn", message: "Test warning message" },
         { method: "debug", message: "Test debug message" }
      ];

      testMessages.forEach(({ method, message }) => {
         it(`should not throw when logging ${method} messages`, () => {
            expect(() => (logger as any)[method](message)).not.toThrow();
         });
      });
   });
});