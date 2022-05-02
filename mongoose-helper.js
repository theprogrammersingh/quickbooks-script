import mongoose from "mongoose";

const Customer = mongoose.model("Customer", {
  displayName: {
    type: String,
    unique: true,
  },
  id: String,
  saInvoiceId:String,
  tipInvoiceId: String,
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

const getLimitedCustomers = async(limit, offset) => {
  return (await Customer.find().limit(limit).skip(offset));
}

const updateCustomerById = async (id, data) => {
  Customer.findByIdAndUpdate(id, data)
}

const mongooseHelper = {
  Customer,
  getAllCustomers,
  getLimitedCustomers,
  findCustomerByDisplayName,
  updateCustomerById,
};

export default mongooseHelper;
