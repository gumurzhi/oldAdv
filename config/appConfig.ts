export module config {
    export var mongoose = {
        "uri": "mongodb://localhost/adv",
        "options": {}
    };
    export var port = 8080;
    export var sessionSecret = '955653';
    export var amqp = {
        uri: 'amqp://localhost',
        rpcCampaignListQ: 'rpcCampaignList',
        rpcReservationQ: 'rpcReservation',
        advEventsEx: 'advEventsEx',
        debitExchange: 'debitExchange',
        inWorkQ: 'inWorkQ',
        clientReqExchange: 'clientReqExchange',
        clientResExchange: 'clientResExchange'
    };
    export var webAddress = '192.168.7.102';
    export var campaignStatusArr: string[] = ['started', 'paused', 'finished', 'pending'];
    export var debugMode = false;

    export var paypalConf = {
            "host" : "api.sandbox.paypal.com",
            'mode': 'sandbox', //sandbox or live
            "client_id" : "AQB-evKvYavHsBXmd-WT0PxdM4GoTx_Be5wI_gt1nNq3xzf1avEm8MB79lNUXdbj91jZgzSH9kVeg1J_",
            "client_secret" : "EFK3nXai4Gtu_yEFKgZ2ix7UuwltsUcJRCc_8iYejsqRS-AC_JFnUcE4UoTEkrqN2y7khW6XPPu-auud"
    };
    export var stripeConf = {
        apiKey: 'sk_test_czkVoL5TlhRDzqXBvhujbLM0'
    }
}
