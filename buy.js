require("dotenv").config();
const cron = require("node-cron");

var fs = require("fs");
var util = require("util");

const CoinbasePro = require("coinbase-pro");
const publicClient = new CoinbasePro.PublicClient();

const key = process.env.COINBASE_PRO_API_KEY;
const secret = process.env.COINBASE_PRO_API_SECRET;
const passphrase = process.env.COINBASE_PRO_API_PASSWORD;
const reg_key = process.env.COINBASE_API_KEY;
const reg_secret = process.env.COINBASE_API_SECRET;
const amountToBuy = process.env.AMOUNT_TO_BUY;
const apiURI = process.env.COINBASE_PRO_API_ENDPOINT;
const maxFunding = process.env.MAX_FUNDING;
const amountToFund = process.env.AMOUNT_TO_FUND;

var logFile = fs.createWriteStream("log.txt", { flags: "a" });
// Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function() {
    logFile.write(util.format.apply(null, arguments) + "\n");
    logStdout.write(util.format.apply(null, arguments) + "\n");
};
console.error = console.log;

//coinbase pro
const authedClient = new CoinbasePro.AuthenticatedClient(
    key,
    secret,
    passphrase,
    apiURI
);

//coinbase regular
var Client = require("coinbase").Client;
var client = new Client({ apiKey: reg_key, apiSecret: reg_secret });

let usdAccount = null;
let btcAccount = null;
let paymentAccount = null;

var date = new Date();

//9 am on everyday
// var task = cron.schedule("0 9 * * *", () => {
//     mainLogic();
// });

// task.start();

mainLogic();

async function mainLogic() {
    console.log(`---- Run Started : ${date} ----`);
    await getAccounts();
    if (checkBalance()) {
        //great - lets buy some BTC!
        await buyBTC();
    } else {
        console.log(`Not enough USD to buy BTC - ${amountToBuy} requested`);
    }
    // console.log(usdAccount.balance);
    // console.log(maxFunding);
    if (usdAccount.balance < maxFunding) {
        //we need to fund our account
        //lets ensure that we have enough money for next time
        await fundAccount();
    } else {
        console.log(`Max funding of ${maxFunding} has been reached`);
    }
}

async function getAccounts() {
    try {
        var accounts = await authedClient.getCoinbaseAccounts();

        // console.log(accounts.filter(x => x.balance > 0));
        //find the active usd wallet
        var usdAccounts = accounts.filter(x => x.currency == "USD");
        if (usdAccounts != undefined && usdAccounts.length > 0) {
            //for now just take the first one
            usdAccount = usdAccounts[0];
            console.log(`${usdAccount.id} USD wallet found`);
        } else {
            console.log("No active USD wallet found");
        }

        //find active btc wallet
        var btcWallets = accounts.filter(x => x.currency == "BTC");

        if (btcWallets != undefined && btcWallets.length > 0) {
            //lets use the first one for now
            btcAccount = btcWallets[0];
            console.log(`${btcAccount.id} BTC wallet found`);
        } else {
            console.log("No active BTC wallet found");
        }
    } catch (error) {
        console.log(error);
    }
}

function checkBalance() {
    var returnVal = false;
    if (usdAccount != undefined) {
        var usdBalance = usdAccount.balance;
        console.log(`${usdBalance} USD available`);

        //check to see if we have enough to preform trade
        if (usdBalance >= amountToBuy) {
            returnVal = true;
        }
    }
    return returnVal;
}

async function fundAccount() {
    try {
        var paymentMethods = await authedClient.getPaymentMethods();

        //find the usd account
        var paymentAccounts = paymentMethods.filter(
            x => x.currency == "USD" && x.type == "ach_bank_account"
        );
        if (paymentAccounts != undefined && paymentAccounts.length > 0) {
            //lets use the first one
            paymentAccount = paymentAccounts[0];
            console.log(
                `${paymentAccount.name} - ${paymentAccount.id} payment account found`
            );

            client.getAccounts({}, async (err, regaccounts) => {
                var coinbaseUsdAccounts = regaccounts.filter(
                    x => x.id == usdAccount.id
                );
                if (
                    coinbaseUsdAccounts != undefined &&
                    coinbaseUsdAccounts.length > 0
                ) {
                    //just grab the first one for nwo
                    var coinbaseUsdAccount = coinbaseUsdAccounts[0];
                }
                coinbaseUsdAccount.getTransactions(null, async (err, txns) => {
                    var pendingTransfers = txns.filter(
                        x =>
                            x.status == "pending" &&
                            x.amount.amount >= amountToFund
                    );
                    if (
                        pendingTransfers != null &&
                        pendingTransfers != undefined &&
                        pendingTransfers.length > 0
                    ) {
                        console.log(
                            `Pending transfer of ${pendingTransfers[0].amount.amount} already in progress`
                        );
                    } else {
                        await scheduleUSDTransfer();
                    }
                });
            });
        } else {
            console.log("No payment accounts found");
        }
    } catch (error) {
        console.log(error);
    }
}

async function scheduleUSDTransfer() {
    console.log("schedule USD transfer function");
    try {
        //fund it
        // Schedule Deposit to your Exchange USD account from a configured payment method.

        const depositPaymentParamsUSD = {
            amount: amountToFund,
            currency: "USD",
            payment_method_id: paymentAccount.id, // ach_bank_account
        };

        var result = await authedClient.depositPayment(depositPaymentParamsUSD);

        console.log("Funding scheduled");
        console.log(result);
    } catch (error) {
        console.log(error);
    }
}

async function buyBTC() {
    console.log("buy BTC function");
    try {
        var btcPrice = await publicClient.getProductTicker("BTC-USD");

        // console.log(btcPrice);
        var amountOfBtcToBuy = amountToBuy / btcPrice.price;
        amountOfBtcToBuy = roundDown(amountOfBtcToBuy.toFixed(8), 8);
        console.log(amountOfBtcToBuy);

        // Buy 1 BTC @ 100 USD
        const buyParams = {
            price: btcPrice.price, // USD
            size: amountOfBtcToBuy, // BTC
            product_id: "BTC-USD",
            side: "buy",
        };
        var result = await authedClient.placeOrder(buyParams);
        console.log(result);
        console.log("BTC purchase successfull");
    } catch (error) {
        console.log(error.response.body);
    }
}

function roundDown(number, decimals) {
    decimals = decimals || 0;
    return Math.floor(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
