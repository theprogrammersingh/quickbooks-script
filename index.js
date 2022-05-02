import * as xlsx from "xlsx";

import OAuthClient from "intuit-oauth";
import QuickBooks from "node-quickbooks";

import express from "express";
const app = express();
import bodyParser from "body-parser";
import fs from "fs";
import mongoose from "mongoose";

import mongooseHelper from "./mongoose-helper.js";

const oauthClient = new OAuthClient({
  clientId: "ABL9octUQz2zkIci1hZGOWRkf1HUmaBuyGWuQqIE6FSJX74MeE",
  clientSecret: "2havApRttfP4Fkkw8k0uT3CCtEShx0cpF8PbvHjV",
  environment: "sandbox",
  redirectUri: "http://quickbooks-test.ewa-services.com:3333/callback",
  // redirectUri: "http://localhost:3333/callback",
});

mongoose
  .connect(
    `mongodb+srv://ewaservices:${encodeURIComponent(
      "ewaservices2022!@#"
    )}@cluster0.zerhe.mongodb.net/quickbook-res?retryWrites=true&w=majority`
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => console.log(err));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ******************************************* Define variables ***********************************************************
let oauth2_token_json = null;
let redirectUri = "";
let qbo;

let sheetsData = [];
let customers = [];

let invoicesSA = [];
let invoicedFee = [];

let receivedPayments = [];

// ****************************************** define helper functions *****************************************************
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readSheet = () => {
  const file = xlxs.readFile("./test.xlsx");

  let sheetData = [];
  let customers = [];
  const sheets = file.SheetNames;

  for (let i = 0; i < sheets.length; i++) {
    const temp = utils.sheet_to_json(file.Sheets[file.SheetNames[i]]);
    sheetData.push(temp);
  }
  sheetData[0].forEach((row) => {
    customers.push(row.Customer);
  });
};

const customerExist = async (displayName) => {
  try {
    const findUser = await mongooseHelper.findCustomerByDisplayName(
      displayName
    );
    return findUser;
  } catch (err) {
    console.log(err);
  }
};

// ******************************************** define QBO functions *****************************************************
const createCustomer = (displayName) => {
  const promise = new Promise((resolve, reject) => {
    console.log("Creating Customer", displayName);
    qbo.createCustomer({ DisplayName: displayName }, async (err, customer) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      try {
        await mongooseHelper.Customer({
          displayName: customer["DisplayName"],
          id: customer["Id"],
        });
      } catch (err) {
        console.log(err);
        reject(err);
      }
      console.log("Created Customer", displayName);
      resolve(customer);
    });
  });
  return promise;
};

const createSAInvoice = async (customerID, amount = 1000) => {
  // const customer = await mongooseHelper.findCustomerByDisplayName(customerID);
  const promise = new Promise((resolve, reject) => {
    qbo.createInvoice(
      {
        CustomerRef: {
          value: customerID,
        },
        Line: [
          {
            Amount: amount,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: {
                name: "Salary Advance",
                value: "30",
              },
              TaxCodeRef: {
                value: "7",
              },
            },
          },
        ],
        DueDate: "2020-31-01",
        TxnDate: "2020-25-01",
      },
      function (err, invoice) {
        if (err) {
          reject(err);
        }
        resolve(invoice);
      }
    );
  });
  return promise;
};

const createFeeInvoice = (customerID, amount = 100) => {
  const promise = new Promise((resolve, reject) => {
    qbo.createInvoice(
      {
        CustomerRef: {
          value: customerID,
        },
        Line: [
          {
            Amount: amount,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: {
                name: "Tip",
                value: "31",
              },
              TaxCodeRef: {
                value: "11",
              },
            },
          },
        ],
        DueDate: "2020-31-01",
        TxnDate: "2020-25-01",
      },
      function (err, invoice) {
        if (err) {
          reject(err);
        }
        resolve(invoice);
      }
    );
  });
  return promise;
};

const createPayment = (customerId, amount, invoiceId) => {
  const promise = new Promise((resolve, reject) => {
    qbo.createPayment(
      {
        CustomerRef: {
          value: customerId,
        },
        TotalAmt: amount,
        TxnDate: "2020-25-01",
        Line: [
          {
            Amount: amount,
            LinkedTxn: [
              {
                TxnId: invoiceId,
                TxnType: "Invoice",
              },
            ],
          },
        ],
      },
      function (err, payment) {
        if (err) {
          reject(err);
        }
        resolve(payment);
      }
    );
  });
  return promise;
};

const createDeposit = (paymentId, amount) => {
  const promise = new Promise((resolve, reject) => {
    qbo.createDeposit(
      {
        DepositToAccountRef: {
          name: "Bank",
          value: 133,
        },
        TotalAmt: amount,
        Line: [
          {
            Amount: amount,
            LinkedTxn: [
              {
                TxnLineId: 0,
                TxnId: paymentId,
                TxnType: "Payment",
              },
            ],
          },
        ],
      },
      function (err, payment) {
        if (err) {
          reject(err);
        }
        resolve(payment);
      }
    );
  });
  return promise;
};

const findAllCustomers = (offset) => {
  const promise = new Promise((resolve, reject) => {
    qbo.findCustomers(
      {
        limit: 1000,
        offset,
      },
      function (err, customers) {
        if (err) {
          reject(err);
        }
        resolve(customers);
      }
    );
  });
  return promise;
};

// **************************************** define main functions *******************************************************

const run = () => {
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: "intuit-test",
  });
  console.log(authUri);
};

const refreshToken = async () => {
  const authResponse = await oauthClient.refresh();
  oauth2_token_json = JSON.stringify(authResponse.getJson(), null, 2);
  qbo = new QuickBooks(
    "ABL9octUQz2zkIci1hZGOWRkf1HUmaBuyGWuQqIE6FSJX74MeE",
    "2havApRttfP4Fkkw8k0uT3CCtEShx0cpF8PbvHjV",
    JSON.parse(oauth2_token_json)["access_token"],
    false,
    "4620816365219278430",
    true,
    true,
    null,
    "2.0",
    JSON.parse(oauth2_token_json)["refresh_token"]
  );
  // .then(function (authResponse) {
  //   console.log(
  //     `The Refresh Token is  ${JSON.stringify(authResponse.getJson())}`
  //   );
  //   oauth2_token_json = JSON.stringify(authResponse.getJson(), null, 2);
  // })
  // .catch(function (e) {
  //   console.error(e);
  // });
};

const runScript = async () => {
  setInterval(refreshToken, 3600 * 100);
  for(let i = 0 ; i < 300000 ; i = i + 1000) {
    await sleep(2000);
    try {
      const dbCustomers = await mongooseHelper.getLimitedCustomers(1000, i);
      // console.log("response", allCustomers.QueryResponse.Customer);

      for (let j = 0; j < dbCustomers.length; j++) {
    await sleep(2000);

        const saInvoice = await createSAInvoice(dbCustomers[j].id);
        await mongooseHelper.updateCustomerById(dbCustomers[j]._id, {saInvoiceId: saInvoice.Id});
    await sleep(2000);

        const tipInvoice = await createFeeInvoice(dbCustomers[j].id);
        await mongooseHelper.updateCustomerById(dbCustomers[j]._id, {saInvoiceId: tipInvoice.Id});
      }
    } catch(err) {
      console.log(err);
    }
  }
  
  // let customers = fs.readFileSync("./data/customers-to-save.json");

  // let savedCustomers = await mongooseHelper.getAllCustomers();
  // console.log("checking array");
  // customers = customers
  //   .filter((cust) => !!cust)
  //   .filter(
  //     (cust) =>
  //       savedCustomers.findIndex((c) => c.displayName == cust.DisplayName) < 0
  //   );
  // console.log("array checked");
  // if (Array.isArray(customers)) {
  //   setInterval(refreshToken, 3600 * 100);
  //   for (let i = 0; i < customers.length; i++) {
  //     try {
  //       await sleep(1000);
  //       await createCustomer(customers[i]["DisplayName"]);
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   }
  // }
};

run();

/**
 * Instantiate new Client
 * @type {OAuthClient}
 */
/**
 * Home Route
 */
/**
 * Get the AuthorizeUri
 */
// app.get("/authUri", urlencodedParser, function (req, res) {

// });

/**
 * Handle the callback to extract the `Auth Code` and exchange them for `Bearer-Tokens`
 */

app.get("/callback", function (req, res) {
  oauthClient
    .createToken(req.url)
    .then(function async(authResponse) {
      oauth2_token_json = JSON.stringify(authResponse.getJson(), null, 2);
      qbo = new QuickBooks(
        "ABL9octUQz2zkIci1hZGOWRkf1HUmaBuyGWuQqIE6FSJX74MeE",
        "2havApRttfP4Fkkw8k0uT3CCtEShx0cpF8PbvHjV",
        JSON.parse(oauth2_token_json)["access_token"],
        false,
        "4620816365219278430",
        true,
        true,
        null,
        "2.0",
        JSON.parse(oauth2_token_json)["refresh_token"]
      );
      runScript();
    })
    .catch(function (e) {
      console.error(e);
    });

  res.send("close this tab");
});

/**
 * Display the token : CAUTION : JUST for sample purposes
 */
app.get("/retrieveToken", function (req, res) {
  res.send(oauth2_token_json);
});

/**
 * Refresh the access-token
 */
app.get("/refreshAccessToken", function (req, res) {
  oauthClient
    .refresh()
    .then(function (authResponse) {
      console.log(
        `The Refresh Token is  ${JSON.stringify(authResponse.getJson())}`
      );
      oauth2_token_json = JSON.stringify(authResponse.getJson(), null, 2);
      res.send(oauth2_token_json);
    })
    .catch(function (e) {
      console.error(e);
    });
});

/**
 * getCompanyInfo ()
 */
app.get("/getCompanyInfo", function (req, res) {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == "sandbox"
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({
      url: `${url}v3/company/${companyID}/companyinfo/${companyID}`,
    })
    .then(function (authResponse) {
      console.log(
        `The response for API call is :${JSON.stringify(authResponse)}`
      );
      res.send(JSON.parse(authResponse.text()));
    })
    .catch(function (e) {
      console.error(e);
    });
});

/**
 * disconnect ()
 */
app.get("/disconnect", function (req, res) {
  console.log("The disconnect called ");
  const authUri = oauthClient.authorizeUri({
    scope: [scopes.OpenId, scopes.Email],
    state: "intuit-test",
  });
  res.redirect(authUri);
});

app.get("/run", function (req, res) {
  // Reading our test file

  const file = xlxs.readFile("./test.xlsx");

  let data = [];
  let sheetData = [];
  const sheets = file.SheetNames;

  for (let i = 0; i < sheets.length; i++) {
    const temp = utils.sheet_to_json(file.Sheets[file.SheetNames[i]]);
    sheetData.push(temp);
  }
  sheetData[0].forEach((row) => {
    customers.push(row.Customer);
  });
  res.json(customers);
});

/**
 * Start server on HTTP (will use ngrok for HTTPS forwarding)
 */
const server = app.listen(process.env.PORT || 3333, () => {
  console.log(`💻 Server listening on port ${server.address().port}`);
});
