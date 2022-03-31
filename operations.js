const fs = require("fs");

const existInAddedCustomers = (displayName) => {
  console.log(displayName);
  return (
    addedCustomers.findIndex((cust) => cust.DisplayName == displayName) >= 0
  );
};

const customers = JSON.parse(fs.readFileSync("./data/customers.json"));

const addedCustomers = JSON.parse(
  fs.readFileSync("./data/customers-res-filtered.json")
);

const filteredCustomers = customers.filter(
  (cust) => !existInAddedCustomers(cust.DisplayName)
);

fs.writeFileSync(
  "./data/customers-filtered.json",
  JSON.stringify(filteredCustomers)
);
