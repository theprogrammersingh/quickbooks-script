const mongoose = require("mongoose");

export const Customer = mongoose.model("Customer", {
  displayName: String,
  id: String,
});

export const findCustomerByDisplayName = async (displayName) => {
  const customer = await Customer.findOne({ displayName });
  return customer;
};
