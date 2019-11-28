require("dotenv").config();

const CoinbasePro = require("coinbase-pro");
const publicClient = new CoinbasePro.PublicClient();

const key = process.env.COINBASE_PRO_API_KEY;
const secret = process.env.COINBASE_PRO_API_SECRET;
const passphrase = process.env.COINBASE_PRO_API_PASSWORD;

const amountToBuy = process.env.AMOUNT_TO_BUY;

const apiURI = process.env.COINBASE_PRO_API_ENDPOINT;
// const sandboxURI = process.env.COINBASE_PRO_API_ENDPOINT_SANDBOX;

const authedClient = new CoinbasePro.AuthenticatedClient(
  key,
  secret,
  passphrase,
  apiURI
);

authedClient.getCoinbaseAccounts((error, response, data) => {
  if (error) {
    // handle the error
    console.log(error);
  } else {
    var accounts = data;
    //find the active usd account
    var usdAccount = accounts.filter(
      x => x.currency == "USD" && x.active == true
    );
    if (usdAccount != null && usdAccount.length > 0) {
      //for now just take the first one
      console.log(`${usdAccount[0].name} USD account found`);
      var usdBalance = usdAccount[0].balance;
      console.log(`${usdBalance} USD available`);

      //check to see if we have enough to preform trade
      if (usdBalance >= amountToBuy) {
        //great - lets buy some BTC!

        // find the active btc wallet
        var btcWallet = accounts.filter(
          x => x.currency == "BTC" && x.active == true
        );

        if(btcWallet != null && btcWallet.length > 0)
        {
            console.log(`${btcWallet[0].name} BTC account found`);
        }
        else{
            console.log("No active BTC account found");
            return;
        }
      }
      else
      {
          console.log("Not enough USD to buy BTC");
           //we need to fund our account
           return;
      }     
    }
    else {
        console.log("No USD accounts found");
    }
  }
});
