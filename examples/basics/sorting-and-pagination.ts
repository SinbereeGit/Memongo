import { createDatabase } from "memongo";

async function main() {
	const db = createDatabase();
	await db.init();

	const products = db.createCollection("products");

	products.add({ name: "Keyboard", category: "device", price: 199, sales: 330 });
	products.add({ name: "Mouse", category: "device", price: 99, sales: 560 });
	products.add({ name: "Monitor", category: "device", price: 999, sales: 120 });
	products.add({ name: "USB Cable", category: "accessory", price: 29, sales: 880 });
	products.add({ name: "Laptop Stand", category: "accessory", price: 149, sales: 300 });
	products.add({ name: "Desk Mat", category: "accessory", price: 49, sales: 520 });

	// Sort by price descending.
	const byPriceDesc = products.orderBy("price", "desc").get();
	console.log("orderBy price desc:", byPriceDesc);

	// Multiple orderBy calls are applied in order.
	const byCategoryThenSales = products
		.orderBy("category", "asc")
		.orderBy("sales", "desc")
		.get();
	console.log("orderBy category asc + sales desc:", byCategoryThenSales);

	// Pagination example: pageSize=2, page=2.
	const pageSize = 2;
	const page = 2;

	const pageData = products
		.orderBy("sales", "desc")
		.skip((page - 1) * pageSize)
		.limit(pageSize)
		.get();

	const total = products.count();
	console.log(`page ${page} / size ${pageSize}, total=${total}:`, pageData);
}

main();
