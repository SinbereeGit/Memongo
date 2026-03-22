import { command, createDatabase } from "memongo";

async function main() {
	const db = createDatabase();
	await db.init();

	const users = db.createCollection("users");

	users.add({ name: "Alice", age: 18, city: "Shanghai", role: "member" });
	users.add({ name: "Bob", age: 27, city: "Beijing", role: "admin" });
	users.add({ name: "Cindy", age: 31, city: "Shenzhen", role: "member" });
	users.add({ name: "David", age: 15, city: "Shanghai", role: "guest" });

	// Direct value condition.
	const inShanghai = users.where({ city: "Shanghai" }).get();
	console.log("city=Shanghai:", inShanghai);

	// RegExp condition.
	const startsWithB = users.where({ name: /^B/ }).get();
	console.log("name startsWith B:", startsWithB);

	// Query command condition.
	const adults = users.where({ age: command.gte(18) }).get();
	console.log("age >= 18:", adults);

	// Logical combination.
	const targetUsers = users
		.where({
			age: command.and(command.gte(18), command.lt(30)),
			role: command.or(command.eq("admin"), command.eq("member")),
		})
		.get();
	console.log("18 <= age < 30 and role in [admin, member]:", targetUsers);

	// Field existence.
	const withRole = users.where({ role: command.exists() }).get();
	console.log("role exists:", withRole);
}

await main();
