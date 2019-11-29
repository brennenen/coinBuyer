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

//8 am on mondays
var task = cron.schedule("0 8 * * 1", () => {
    mainLogic();
});

task.start();

// mainLogic();

async function mainLogic() {
    await getAccounts();
    if (checkBalance()) {
        //great - lets buy some BTC!
        await buyBTC();
        //lets ensure that we have enough money for next time
        await fundAccount();
    } else {
        console.log(`Not enough USD to buy BTC - ${amountToBuy} requested`);
        //we need to fund our account
        await fundAccount();
    }
}

async function getAccounts() {
    try {
        var accounts = await authedClient.getCoinbaseAccounts();

        //find the active usd wallet
        var usdAccounts = accounts.filter(
            x => x.currency == "USD" && x.active == true
        );
        if (usdAccounts != undefined && usdAccounts.length > 0) {
            //for now just take the first one
            usdAccount = usdAccounts[0];
            console.log(
                `${usdAccount.name} - ${usdAccount.id} USD wallet found`
            );
        } else {
            console.log("No active USD wallet found");
        }

        //find active btc wallet
        var btcWallets = accounts.filter(
            x => x.currency == "BTC" && x.active == true
        );

        if (btcWallets != undefined && btcWallets.length > 0) {
            //lets use the first one for now
            btcAccount = btcWallets[0];
            console.log(
                `${btcAccount.name} - ${btcAccount.id} BTC wallet found`
            );
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
                            x.amount.amount >= amountToBuy
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
            amount: amountToBuy,
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
        // Buy 1 BTC @ 100 USD
        const buyParams = {
            price: amountToBuy, // USD
            // size: "1", // BTC
            product_id: "BTC-USD",
        };
        var result = await authedClient.buy(buyParams);
        console.log(data);
        console.log("BTC purchase successfull");
    } catch (error) {
        console.log(error);
    }
}
