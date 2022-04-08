import fs from "fs";
import mongoose from "mongoose";
import mongooseHelper from "./mongoose-helper.js";

const start = async () => {
  await mongoose.connect(
    `mongodb+srv://ewaservices:${encodeURIComponent(
      "ewaservices2022!@#"
    )}@cluster0.zerhe.mongodb.net/quickbook-res?retryWrites=true&w=majority`
  );

  const customerExist = (displayName) => {
    return mongooseHelper.findCustomerByDisplayName(displayName);
  };

  const getAllCustomers = async () => {
    return await mongooseHelper.getAllCustomers();
  };

  const savedData = JSON.parse(fs.readFileSync("./data/customers-res.json"));
  const allCust = await getAllCustomers();
  const dataToSave = savedData
    .filter((cust) => !!cust)
    .filter(
      (cust) => allCust.findIndex((c) => c.displayName === cust.DisplayName) < 0
    )
    .map((cust) => {
      return {
        displayName: cust.DisplayName,
        id: cust.Id,
      };
    });

  console.log(dataToSave);
  const createQuery = mongooseHelper.Customer.create(dataToSave);
  const doneSaving = await createQuery;
  console.log(doneSaving);
  // for (let i = 0; i < savedData.length; i++) {

  // if (savedData[i] && savedData[i]["DisplayName"]) {
  //   if (!(await customerExist(savedData[i]["DisplayName"]))) {
  //     const customer = new mongooseHelper.Customer({
  //       displayName: savedData[i]["DisplayName"],
  //       id: savedData[i]["Id"],
  //     });
  //     await customer.save();
  //   }
  // }
  // }
};

start();
