# coinBuyer

automates coinbase pro btc purchases

## process

1.  The process will first fetch your coinbase pro USD wallet and BTC wallet
2.  It will then check the balance of your USD wallet to see if there is atleast AMOUNT_TO_BUY available
3.  If it is available, an order of AMOUNT_TO_BUY will be initiated from USD to BTC
4.  Finally, if your USD account is below the MAX_FUNDING amount, it will attempt to add more funds
5.  If there is already a pending transfer of atleast AMOUNT_TO_BUY, then the funding step will be skipped.

## setup

-   create a ".env" file in the root that based on the provided .env.sample file replacing the values with your own.
-   provide your coinbase PRO api credentials in the appropriate fields
-   also provide your regular coinbase api credentials in the non PRO fields. This is because the coinbase-pro package does not support viewing pending transactions.

## running

-   npm install
-   npm start

## running on a schedule

-   change buy.js by commenting/uncommenting to look like the following:

    > var task = cron.schedule("0 8 \* \* 1", () => {
    > mainLogic();
    > });
    >
    > task.start();
    >
    > //mainLogic();

-   note you can specify any cron schedule you wish. a good resource is [crontab.guru](https://crontab.guru/)
-   launch the job in the background by running "forever start buy.js"
-   kill the job by running "forever stop buy.js"
-   it is easiest to run this on a vm to ensure constant uptime
