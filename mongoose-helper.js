import mongoose from "mongoose";

const Customer = mongoose.model("Customer", {
  displayName: {
    type: String,
    unique: true,
  },
  id: String,
});

const findCustomerByDisplayName = async (displayName) => {
  console.log(displayName);
  const customer = await Customer.findOne({ displayName });
  console.log(customer);
  return customer;
};

const getAllCustomers = async () => {
  const customers = await Customer.find();
  return customers;
};

const mongooseHelper = {
  Customer,
  getAllCustomers,
  findCustomerByDisplayName,
};

export default mongooseHelper;
