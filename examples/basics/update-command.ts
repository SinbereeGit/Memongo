import { command, createDatabase } from "memongo";

async function main() {
	const db = createDatabase();
	await db.init();

	const users = db.createCollection("users");

	const { _id: aliceId } = users.add({
		name: "Alice",
		age: 20,
		points: 100,
		tags: ["new"],
		profile: {
			city: "Shanghai",
			status: "active",
		},
		tempField: "to be removed",
	});

	users.add({
		name: "Bob",
		age: 24,
		points: 60,
		tags: ["new", "vip"],
		profile: {
			city: "Beijing",
			status: "active",
		},
		tempField: "to be removed",
	});

	// Batch update all documents matched by where().
	users.where({ profile: { status: "active" } }).update({
		age: command.inc(1),
		points: command.mul(2),
		tags: command.push("promoted"),
		"profile.city": command.set("Shenzhen"),
		tempField: command.remove(),
	});

	console.log("After collection.update:", users.get());

	// Update one document by id.
	users.doc(aliceId).update({
		tags: command.unshift("top-user"),
		"profile.status": command.set("legend"),
		points: command.inc(500),
	});

	console.log("After doc.update:", users.doc(aliceId).get());
}

await main();
