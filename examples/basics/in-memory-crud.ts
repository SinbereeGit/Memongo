import { createDatabase } from "memongo";

async function main() {
	// 1) Create an in-memory database (no persistence argument).
	const db = createDatabase();
	await db.init();

	// 2) Create or get a collection.
	let todos = db.collection("todos");
	if (!todos) {
		todos = db.createCollection("todos");
	}

	// 3) Add documents.
	const { _id: buyMilkId } = todos.add({
		title: "Buy milk",
		done: false,
		priority: 2,
	});

	todos.add({
		title: "Read Memongo docs",
		done: false,
		priority: 1,
	});

	console.log("After add:", todos.get());

	// 4) Read one document by id.
	const buyMilk = todos.doc(buyMilkId).get();
	console.log("One doc:", buyMilk);

	// 5) Update one document.
	todos.doc(buyMilkId).update({
		done: true,
	});
	console.log("After doc.update:", todos.get());

	// 6) Remove one document.
	todos.doc(buyMilkId).remove();
	console.log("After doc.remove:", todos.get());

	// 7) Remove all documents in the collection.
	todos.remove();
	console.log("After collection.remove:", todos.get());
}

await main();
