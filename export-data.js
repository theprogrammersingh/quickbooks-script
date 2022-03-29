const fs = require("fs");
const reader = require("xlsx");
let invoicesSA = [];
let invoicesFee = [];

let receivedPayments = [];
if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data");
  console.log("----------CREATED DATA DIRECTORY------------");
}

const file = reader.readFile("./qbo.xlsx");

let sheetData = [];
let customers = [];
const sheets = file.SheetNames;

for (let i = 0; i < sheets.length; i++) {
  const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]]);
  sheetData.push(temp);
}
console.log("----------------READING SHEET------------------");
sheetData[0].forEach((row) => {
  customers.push({ DisplayName: row.Customer });
  invoicesSA.push(row);
});

sheetData[1].forEach((row) => {
  invoicesFee.push(row);
});

console.log("------------CREATING CUSTOMERS.JSON------------");
fs.writeFileSync("data/customers.json", JSON.stringify(customers));

console.log("-----------CREATING INVOICES-SA.JSON-----------");
fs.writeFileSync("data/invoices-sa.json", JSON.stringify(invoicesSA));

console.log("-----------CREATING INVOICES-FEE.JSON-----------");
fs.writeFileSync("data/invoices-fee.json", JSON.stringify(invoicesFee));
