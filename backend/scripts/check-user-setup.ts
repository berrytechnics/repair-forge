// Script to check user setup and fix any issues
// Usage: tsx scripts/check-user-setup.ts <user-email>

import { db } from "../src/config/connection.js";
import permissionService from "../src/services/permission.service.js";
import userService from "../src/services/user.service.js";

async function checkUserSetup(email: string) {
  console.log(`Checking user setup for: ${email}\n`);
  
  // Get user
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("email", "=", email)
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  
  console.log("✓ User found:");
  console.log(`  ID: ${user.id}`);
  console.log(`  Name: ${user.first_name} ${user.last_name}`);
  console.log(`  Role: ${user.role}`);
  console.log(`  Company ID: ${user.company_id || "NULL"}`);
  console.log(`  Current Location ID: ${user.current_location_id || "NULL"}\n`);
  
  if (!user.company_id) {
    console.error("✗ ERROR: User does not have a company_id!");
    process.exit(1);
  }
  
  const companyId = user.company_id as unknown as string;
  
  // Check company exists
  const company = await db
    .selectFrom("companies")
    .select(["id", "name", "subdomain"])
    .where("id", "=", companyId)
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  
  if (!company) {
    console.error(`✗ ERROR: Company ${companyId} does not exist!`);
    process.exit(1);
  }
  
  console.log("✓ Company exists:");
  console.log(`  ID: ${company.id}`);
  console.log(`  Name: ${company.name}`);
  console.log(`  Subdomain: ${company.subdomain}\n`);
  
  // Check permissions
  console.log("Checking permissions...");
  const permissions = await db
    .selectFrom("role_permissions")
    .select((eb) => eb.fn.count<number>("id").as("count"))
    .where("company_id", "=", companyId)
    .executeTakeFirst();
  
  const permissionCount = Number(permissions?.count || 0);
  console.log(`  Found ${permissionCount} permission records for company`);
  
  if (permissionCount === 0) {
    console.log("  ⚠ No permissions found. Initializing...");
    try {
      await permissionService.initializeCompanyPermissions(companyId);
      console.log("  ✓ Permissions initialized");
    } catch (error) {
      console.error("  ✗ Failed to initialize permissions:", error);
    }
  } else {
    // Check admin permissions specifically
    const adminPermissions = await db
      .selectFrom("role_permissions")
      .select("permission")
      .where("company_id", "=", companyId)
      .where("role", "=", "admin")
      .execute();
    
    console.log(`  Found ${adminPermissions.length} permissions for admin role`);
    if (adminPermissions.length === 0) {
      console.log("  ⚠ No admin permissions found. Initializing...");
      try {
        await permissionService.initializeCompanyPermissions(companyId);
        console.log("  ✓ Permissions initialized");
      } catch (error) {
        console.error("  ✗ Failed to initialize permissions:", error);
      }
    }
  }
  
  // Check location
  if (user.current_location_id) {
    const locationId = user.current_location_id as unknown as string;
    console.log("\nChecking location...");
    const location = await db
      .selectFrom("locations")
      .select(["id", "name", "company_id"])
      .where("id", "=", locationId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    
    if (!location) {
      console.error(`  ✗ ERROR: Location ${locationId} does not exist!`);
      console.log("  Attempting to set default location...");
      const defaultLocation = await db
        .selectFrom("locations")
        .select(["id", "name"])
        .where("company_id", "=", companyId)
        .where("deleted_at", "is", null)
        .orderBy("created_at", "asc")
        .limit(1)
        .executeTakeFirst();
      
      if (defaultLocation) {
        await userService.setCurrentLocation(user.id as unknown as string, defaultLocation.id, companyId);
        console.log(`  ✓ Set current location to: ${defaultLocation.name}`);
      } else {
        console.error("  ✗ No locations found for company!");
      }
    } else {
      console.log(`  ✓ Location exists: ${location.name}`);
      if (location.company_id !== companyId) {
        console.error(`  ✗ ERROR: Location belongs to different company!`);
        console.error(`    Location company: ${location.company_id}`);
        console.error(`    User company: ${companyId}`);
      } else {
        console.log(`  ✓ Location belongs to correct company`);
      }
    }
    
    // Check user has access to location
    console.log("\nChecking user location access...");
    if (user.role === "admin") {
      console.log("  ✓ Admin users have access to all company locations");
    } else {
      const assignment = await db
        .selectFrom("user_locations")
        .select("user_id")
        .where("user_id", "=", user.id)
        .where("location_id", "=", locationId)
        .executeTakeFirst();
      
      if (assignment) {
        console.log("  ✓ User is assigned to location");
      } else {
        console.log("  ⚠ User is not assigned to location. Assigning...");
        await userService.assignLocation(user.id as unknown as string, locationId, companyId);
        console.log("  ✓ User assigned to location");
      }
    }
  } else {
    console.log("\n⚠ User does not have a current location set");
    console.log("  Attempting to set default location...");
    const defaultLocation = await db
      .selectFrom("locations")
      .select(["id", "name"])
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("created_at", "asc")
      .limit(1)
      .executeTakeFirst();
    
    if (defaultLocation) {
      await userService.setCurrentLocation(user.id as unknown as string, defaultLocation.id, companyId);
      console.log(`  ✓ Set current location to: ${defaultLocation.name}`);
    } else {
      console.error("  ✗ No locations found for company!");
    }
  }
  
  // Test permissions retrieval
  console.log("\nTesting permissions retrieval...");
  try {
    const { getPermissionsForRole } = await import("../src/config/permissions.js");
    const userPermissions = await getPermissionsForRole(user.role, companyId);
    console.log(`  ✓ Retrieved ${userPermissions.length} permissions`);
    if (userPermissions.length === 0) {
      console.error("  ✗ WARNING: No permissions returned! This will cause authorization errors.");
    } else {
      console.log(`  ✓ Permissions include: ${userPermissions.slice(0, 5).join(", ")}...`);
    }
  } catch (error) {
    console.error("  ✗ Failed to retrieve permissions:", error);
  }
  
  console.log("\n✓ User setup check complete!");
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: tsx scripts/check-user-setup.ts <user-email>");
  process.exit(1);
}

checkUserSetup(email)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });

