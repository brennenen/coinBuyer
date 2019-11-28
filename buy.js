require("dotenv").config();

const CoinbasePro = require("coinbase-pro");
const publicClient = new CoinbasePro.PublicClient();

const key = process.env.COINBASE_PRO_API_KEY;
const secret = process.env.COINBASE_PRO_API_SECRET;
const passphrase = process.env.COINBASE_PRO_API_PASSWORD;

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

//start of logic
getAccounts();

function fundAccount() {
  authedClient.getPaymentMethods((error, response, data) => {
    if (error) {
      // handle the error
      console.log(error);
    } else {
      var accounts = data;

      //find the usd account
      var paymentAccounts = accounts.filter(x => x.currency == "USD");
      if (paymentAccounts != null && paymentAccounts.length > 0) {
        //lets use the first one
        paymentAccount = paymentAccounts[0];
        console.log(`${paymentAccount.name} payment account found`);

        //dont transfer funds if there is already a pending transaction
        authedClient.getAccountTransfers(
          paymentAccount.id,
          (error, response, data) => {
            if (error) {
              // handle the error
              if (error.response.statusCode == "404")
                console.log("No pending transfers");
            } else {
              //fund it
            }
          }
        );
      } else {
        console.log("No payment accounts found");
        return;
      }
    }
  });
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
          //great - lets buy some BTC!

          // find the active btc wallet
          var btcWallets = accounts.filter(
            x => x.currency == "BTC" && x.active == true
          );

          if (btcWallets != null && btcWallets.length > 0) {
            //lets use the first one for now
            btcAccount = btcWallets[0];
            console.log(`${btcAccount.name} BTC account found`);
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
