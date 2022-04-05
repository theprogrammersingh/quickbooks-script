const fs = require("fs");
const mongoose = require("mongoose");

const mongooseHelper = require("./mongoose-helper.js");

await mongoose.connect(
  `mongodb+srv://ewaservices:${encodeURIComponent(
    "ewaservices2022!@#"
  )}@cluster0.zerhe.mongodb.net/quickbook-res?retryWrites=true&w=majority`
);

const savedData = JSON.parse(fs.readFileSync("./data/customers-res.json"));

for (let i = 0; i < savedData.length; i++) {
  const customer = new mongooseHelper.Customer({
    displayName: savedData[i]["DisplayName"],
    id: savedData[i]["Id"],
  });
  await customer.save();
}
