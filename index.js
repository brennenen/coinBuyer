require('dotenv').config();

const CoinbasePro = require('coinbase-pro');
const publicClient = new CoinbasePro.PublicClient();

const key = process.env.COINBASE_PRO_API_KEY;
const secret = process.env.COINBASE_PRO_API_SECRET;
const passphrase = process.env.COINBASE_PRO_API_PASSWORD;
 
const apiURI = process.env.COINBASE_PRO_API_ENDPOINT;
// const sandboxURI = process.env.COINBASE_PRO_API_ENDPOINT_SANDBOX;

const authedClient = new CoinbasePro.AuthenticatedClient(
    key,
    secret,
    passphrase,
    apiURI
  );

  authedClient.getCoinbaseAccounts( (res) => {
      console.log(res);
  })

authedClient.getPaymentMethods((error, response, data) => {
    if (error) {
      // handle the error
      console.log(error);
    } else {
      // work with data
      console.log(data);
    }
  });
