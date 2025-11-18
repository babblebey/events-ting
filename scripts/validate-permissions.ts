/**
 * Permission Check Validation Script
 *
 * Validates that all module routers have proper team permission checks.
 * Run this script to ensure security compliance across the application.
 *
 * Usage: tsx scripts/validate-permissions.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

interface ValidationResult {
  router: string;
  hasPermissionChecks: boolean;
  issues: string[];
  checksPassed: number;
  checksTotal: number;
}

const REQUIRED_MODULES = [
  "cfp",
  "attendees",
  "schedule",
  "speakers",
  "communications",
  "tickets",
];

const ROUTERS_PATH = join(process.cwd(), "src", "server", "api", "routers");

/**
 * Check if a router file has proper team permission checks
 */
function validateRouter(routerName: string): ValidationResult {
  const filePath = join(ROUTERS_PATH, `${routerName}.ts`);
  const result: ValidationResult = {
    router: routerName,
    hasPermissionChecks: false,
    issues: [],
    checksPassed: 0,
    checksTotal: 0,
  };

  try {
    const content = readFileSync(filePath, "utf-8");

    // Check 1: Does the router check for team membership?
    result.checksTotal++;
    if (
      content.includes("ctx.db.teamMember.findFirst") ||
      content.includes("ctx.db.teamMember.findUnique")
    ) {
      result.checksPassed++;
    } else {
      result.issues.push(
        "Missing team membership check (ctx.db.teamMember.findFirst)",
      );
    }

    // Check 2: Does the router verify module permissions?
    result.checksTotal++;
    const modulePermissionCheck =
      content.includes("modulePermissions.includes") ||
      content.includes(
        `modulePermissions.includes("${routerName.toUpperCase()}")`,
      );

    if (modulePermissionCheck) {
      result.checksPassed++;
    } else {
      result.issues.push(
        `Missing module permission check (modulePermissions.includes("${routerName.toUpperCase()}"))`,
      );
    }

    // Check 3: Does the router check for ACTIVE status?
    result.checksTotal++;
    if (content.includes('status: "ACTIVE"')) {
      result.checksPassed++;
    } else {
      result.issues.push('Missing status check (status: "ACTIVE")');
    }

    // Check 4: Does the router throw FORBIDDEN errors?
    result.checksTotal++;
    if (content.includes('code: "FORBIDDEN"')) {
      result.checksPassed++;
    } else {
      result.issues.push(
        'Missing FORBIDDEN error handling (code: "FORBIDDEN")',
      );
    }

    // Check 5: Does the router handle OWNER special case?
    result.checksTotal++;
    if (
      content.includes('role === "OWNER"') ||
      content.includes('role !== "OWNER"')
    ) {
      result.checksPassed++;
    } else {
      result.issues.push('Missing OWNER role handling (role === "OWNER")');
    }

    result.hasPermissionChecks = result.checksPassed === result.checksTotal;
  } catch (error) {
    result.issues.push(`Error reading file: ${(error as Error).message}`);
  }

  return result;
}

/**
 * Main validation function
 */
function validateAllRouters(): void {
  console.log("🔒 Validating Team Permission Checks\n");
  console.log("=".repeat(60));

  const results: ValidationResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  // Validate each required module router
  for (const moduleName of REQUIRED_MODULES) {
    const result = validateRouter(moduleName);
    results.push(result);

    if (result.hasPermissionChecks) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  // Print results
  console.log("\n📊 Validation Results:\n");

  for (const result of results) {
    const status = result.hasPermissionChecks ? "✅ PASS" : "❌ FAIL";
    const percentage = Math.round(
      (result.checksPassed / result.checksTotal) * 100,
    );

    console.log(`${status} ${result.router}.ts`);
    console.log(
      `   Coverage: ${result.checksPassed}/${result.checksTotal} checks (${percentage}%)`,
    );

    if (result.issues.length > 0) {
      console.log("   Issues:");
      for (const issue of result.issues) {
        console.log(`     - ${issue}`);
      }
    }
    console.log();
  }

  // Summary
  console.log("=".repeat(60));
  console.log(`\n📈 Summary:`);
  console.log(`   Total Routers: ${REQUIRED_MODULES.length}`);
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ❌ Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    console.log(`\n✨ All routers have proper permission checks!`);
    process.exit(0);
  } else {
    console.log(
      `\n⚠️  ${totalFailed} router(s) need permission checks. Please review and fix.`,
    );
    process.exit(1);
  }
}

// Run validation
validateAllRouters();
