import postgres from "postgres"

// globalSetup runs once in the main vitest process before any test file.
// Environment variables from vitest.config `env:` are worker-only, so we
// read DATABASE_URL from the shell / Docker container environment directly.
const DATABASE_URL =
	process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/petsystemcrm_test"

export async function setup() {
	const sql = postgres(DATABASE_URL, { max: 1 })

	// Truncate every application table in one shot.
	// CASCADE handles FK dependencies; RESTART IDENTITY resets sequences.
	await sql.unsafe(`
    TRUNCATE TABLE
      appointment_services,
      appointments,
      sale_items,
      sales,
      stock_movements,
      products,
      product_categories,
      suppliers,
      service_pricing,
      services,
      holidays,
      work_schedules,
      pets,
      clients,
      tenant_invitations,
      tenant_members,
      session,
      account,
      verification,
      invitation,
      member,
      organization,
      tenants,
      "user"
    RESTART IDENTITY CASCADE
  `)

	await sql.end()
}
