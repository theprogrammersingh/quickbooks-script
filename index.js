const reader = require("xlsx");
const open = require("open");

const OAuthClient = require("intuit-oauth");
const QuickBooks = require("node-quickbooks");

const express = require("express");
const app = express();
const fs = require("fs");
const bodyParser = require("body-parser");

const oauthClient = new OAuthClient({
  clientId: "ABL9octUQz2zkIci1hZGOWRkf1HUmaBuyGWuQqIE6FSJX74MeE",
  clientSecret: "2havApRttfP4Fkkw8k0uT3CCtEShx0cpF8PbvHjV",
  environment: "sandbox",
  redirectUri: "http://quickbooks-test.ewa-services.com:3333/callback",
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const urlencodedParser = bodyParser.urlencoded({ extended: false });

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
  const file = reader.readFile("./test.xlsx");

  let sheetData = [];
  let customers = [];
  const sheets = file.SheetNames;

  for (let i = 0; i < sheets.length; i++) {
    const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]]);
    sheetData.push(temp);
  }
  sheetData[0].forEach((row) => {
    customers.push(row.Customer);
  });
};

// ******************************************** define QBO functions *****************************************************
const createCustomer = (displayName) => {
  const promise = new Promise((reject, resolve) => {
    console.log("Creating Customer", displayName);
    qbo.createCustomer({ DisplayName: displayName }, function (err, customer) {
      if (err) {
        console.log(err);
        reject(err);
      }
      if (!fs.existsSync("./data/customers-res.json")) {
        fs.writeFileSync("./data/customers-res.json", "[]");
      }
      const customersRes = JSON.parse(fs.readFileSync("./data/customers-res.json"));
      customersRes.push(customer);
      fs.writeFileSync("./data/customers-res.json", JSON.stringify(customersRes));
      console.log('Created Customer', displayName);
      resolve(customer);
    });
  });
  return promise;
};

const createSAInvoice = (customerID, amount) => {
  const promise = new Promise((reject, resolve) => {
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
        DueDate: "1-31-2020",
        TxnDate: "1-25-2020",
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

const createFeeInvoice = (customerID, amount) => {
  const promise = new Promise((reject, resolve) => {
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
        DueDate: "1-31-2020",
        TxnDate: "1-25-2020",
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
  const promise = new Promise((reject, resolve) => {
    qbo.createPayment(
      {
        CustomerRef: {
          value: customerId,
        },
        TotalAmt: amount,
        TxnDate: "1-25-2020",
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
  const promise = new Promise((reject, resolve) => {
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
  try {
    let customers = fs.readFileSync("./data/customers.json");
    customers = JSON.parse(customers);
    if (Array.isArray(customers)) {
      customers.forEach(async (customer, i) => {
        await sleep(1000);
        await createCustomer(customer['DisplayName']);
        if (i % 3000 == 0) {
          await refreshToken();
        }
      });
    }
  } catch (err) {
    console.log(err);
  }

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
    scope: [OAuthClient.scopes.OpenId, OAuthClient.scopes.Email],
    state: "intuit-test",
  });
  res.redirect(authUri);
});

app.get("/run", function (req, res) {
  // Reading our test file

  const file = reader.readFile("./test.xlsx");

  let data = [];
  let sheetData = [];
  const sheets = file.SheetNames;

  for (let i = 0; i < sheets.length; i++) {
    const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]]);
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
