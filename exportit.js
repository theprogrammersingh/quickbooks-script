import fs from "fs";

let savedData = JSON.parse(fs.readFileSync("data/customers-res.json"));

let customers = JSON.parse(fs.readFileSync("data/customers.json"));

savedData = savedData.filter((c) => !!c);
// console.log(customers);
const toSave = [];
customers.forEach((cust) => {
  if (cust) {
    if (savedData.findIndex((s) => s.DisplayName == cust.DisplayName) < 0) {
      toSave.push(cust);
      console.log(cust);
    }
  }
});

fs.writeFileSync("data/customers-to-save.json", JSON.stringify(toSave));
