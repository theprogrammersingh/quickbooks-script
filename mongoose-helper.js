import mongoose from "mongoose";

const Customer = mongoose.model("Customer", {
  displayName: String,
  id: String,
});

const findCustomerByDisplayName = async (displayName) => {
  const customer = await Customer.findOne({ displayName });
  return customer;
};

const mongooseHelper = {
  Customer,
  findCustomerByDisplayName,
};

export default mongooseHelper;
