require("dotenv").config();

const CoinbasePro = require("coinbase-pro");
const publicClient = new CoinbasePro.PublicClient();

const key = process.env.COINBASE_PRO_API_KEY;
const secret = process.env.COINBASE_PRO_API_SECRET;
const passphrase = process.env.COINBASE_PRO_API_PASSWORD;

const reg_key = process.env.COINBASE_API_KEY;
const reg_secret = process.env.COINBASE_API_SECRET;

const amountToBuy = process.env.AMOUNT_TO_BUY;

const apiURI = process.env.COINBASE_PRO_API_ENDPOINT;

const authedClient = new CoinbasePro.AuthenticatedClient(
  key,
  secret,
  passphrase,
  apiURI
);

let usdAccount = null;
let btcAccount = null;
let paymentAccount = null;

var Client = require("coinbase").Client;

var client = new Client({ apiKey: reg_key, apiSecret: reg_secret });

//start of logic
getAccounts();

function fundAccount() {
  authedClient.getPaymentMethods(async (error, response, data) => {
    if (error) {
      // handle the error
      console.log(error);
    } else {
      var accounts = data;

      //find the usd account
      var paymentAccounts = accounts.filter(
        x => x.currency == "USD" && x.type == "ach_bank_account"
      );
      if (paymentAccounts != null && paymentAccounts.length > 0) {
        //lets use the first one
        paymentAccount = paymentAccounts[0];
        console.log(
          `${paymentAccount.name} - ${paymentAccount.id} payment account found`
        );

        client.getAccounts({}, (err, regaccounts) => {
          var coinbaseUsdAccounts = regaccounts.filter(
            x => x.id == usdAccount.id
          );
          if (coinbaseUsdAccounts != null && coinbaseUsdAccounts.length > 0) {
            //just grab the first one for nwo
            var coinbaseUsdAccount = coinbaseUsdAccounts[0];
          }
          coinbaseUsdAccount.getTransactions(null, (err, txns) => {
            var pendingTransfers = txns.filter(
              x => x.status == "pending" && x.amount.amount >= amountToBuy
            );
            if (pendingTransfers != null && pendingTransfers.length > 0) {
              console.log(
                `Pending transfer of: ${pendingTransfers[0].amount.amount} already in progress`
              );
            } else {
              scheduleUSDTransfer();
            }
          });
        });
      } else {
        console.log("No payment accounts found");
        return;
      }
    }
  });
  return;
}

function scheduleUSDTransfer() {
  console.log("schedule USD transfer function");
  //fund it
  // Schedule Deposit to your Exchange USD account from a configured payment method.

  const depositPaymentParamsUSD = {
    amount: amountToBuy,
    currency: "USD",
    payment_method_id: paymentAccount.id // ach_bank_account
  };

  authedClient.depositPayment(
    depositPaymentParamsUSD,
    (error, response, data) => {
      if (error) {
        console.log(error.message);
      } else {
        console.log(data);
      }
    }
  );

  return;
}

function getAccounts() {
  authedClient.getCoinbaseAccounts((error, response, data) => {
    if (error) {
      // handle the error
      console.log(error);
    } else {
      var accounts = data;
      //find the active usd account
      var usdAccounts = accounts.filter(
        x => x.currency == "USD" && x.active == true
      );
      if (usdAccounts != null && usdAccounts.length > 0) {
        //for now just take the first one
        usdAccount = usdAccounts[0];
        console.log(`${usdAccount.name} USD account found`);
        var usdBalance = usdAccount.balance;
        console.log(`${usdBalance} USD available`);

        //check to see if we have enough to preform trade
        if (usdBalance >= amountToBuy) {
          // find the active btc wallet
          var btcWallets = accounts.filter(
            x => x.currency == "BTC" && x.active == true
          );

          if (btcWallets != null && btcWallets.length > 0) {
            //lets use the first one for now
            btcAccount = btcWallets[0];
            console.log(`${btcAccount.name} BTC account found`);
            //great - lets buy some BTC!
            buyBTC();
          } else {
            console.log("No active BTC account found");
            return;
          }
        } else {
          console.log("Not enough USD to buy BTC");
          //we need to fund our account
          fundAccount();
        }
      } else {
        console.log("No USD accounts found");
      }
    }
  });
  return;
}

function buyBTC() {
  console.log("buy BTC function");

  // Buy 1 BTC @ 100 USD
  const buyParams = {
    price: amountToBuy, // USD
    // size: "1", // BTC
    product_id: "BTC-USD"
  };
  authedClient.buy(buyParams, (error, response, data) => {
    if (error) {
      console.log(error);
    } else {
      console.log(data);

      //we need to fund our account for next time regardless
      fundAccount();
    }
  });
}
