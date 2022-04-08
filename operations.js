import fs from "fs";
import mongoose from "mongoose";
import mongooseHelper from "./mongoose-helper.js";

const start = async () => {
  await mongoose.connect(
    `mongodb+srv://ewaservices:${encodeURIComponent(
      "ewaservices2022!@#"
    )}@cluster0.zerhe.mongodb.net/quickbook-res?retryWrites=true&w=majority`
  );

  const customerExist = (displayName) =>{
    return mongooseHelper.findCustomerByDisplayName(displayName);
  }

  const savedData = JSON.parse(fs.readFileSync("./data/customers-res.json"));

  for (let i = 0; i < savedData.length; i++) {
    if (!(await customerExist(savedData[i]['DisplayName']))) {
      const customer = new mongooseHelper.Customer({
        displayName: savedData[i]["DisplayName"],
        id: savedData[i]["Id"],
      });
      await customer.save();
    }
  }
};

start();
