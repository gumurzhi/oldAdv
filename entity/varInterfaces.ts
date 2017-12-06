import {AdvCampaignIface} from "./mongoModels/advCampaigns";
export module varInterfaces {
    export interface Routes {
        path:string;
        httpMethod:string;
        authToUse:string|boolean;
        middleware:any;
    }
    export interface User {
        _id?:string;
        username?:string;
        password?:string;
    }
    export interface campaignReserv {
        _id:string;
        uid:string;
    }
    export var testAdvTyped = {
        _id: String,
        action: {
            actionType: String,
            data: String
        },
        banner: String,
        btnColor: String,
        btnTxt: String,
        budget: Number,
        dayBudget: Number,
        description: String,
        endDate: Date,
        horz_img: String,
        logo: String,
        owner: String,
        price: {
            banner: Number,
            vert_img: Number,
            horz_img: Number,
            action: Number
        },
        statistic: [String],
        startDate: Date,
        status: String,
        title: String,
        vert_img: String,
        targeting: {
            age: [String],
            gender: String,
            country: [String]
        }
    };
    export interface debit {
        uid:string;
        campaignId:string;
        debit:number;
        statistic:{
            appType?:string
            platformName:string,
            age?:string,
            gender?:string,
            country?:string,
            banner:boolean ,
            vert_img:boolean,
            horz_img:boolean,
            action?:number,
            cDate?:Date
        }
    }
    export  interface myAdvCampaigns extends AdvCampaignIface {
        statistic:{
            stages:number[],
            apps:string[],
            appsTotal:number
        };
    }
    export interface advStatistic {
        stages:number[],
        apps:string[],
        appsTotal:number
    }

    export  interface advStatisticObj {
        [index:string]:advStatistic;
    }
    export interface payment {
        "intent":string,
        "payer":{
            "payment_method":string
        },
        "transactions":[{
            "amount":{
                "total":string;
                "currency":string;
                "details":{
                    "subtotal":string;
                }
            },
            "description":string,
            "item_list":{
                "items":[{
                    "name":string;
                    "description":string;
                    "quantity":string;
                    "price":string;
                    "currency":string;
                }]

            }
        }]
        ,
        "note_to_payer":string;
        "redirect_urls":{
            "return_url":string;
            "cancel_url":string;
        }
    }

    export  interface paymentAnswer extends payment {
        id:string;
        "links":{
            "href":string;
            "rel":string;
            "method":string;
        }[]
    }

    export interface executedPayment {
        "id":string;
        "intent":string;
        "state":string;
        "cart":string;
        "payer":{
            "payment_method":string;
            "status":string;
            "payer_info":{
                "email":string;
                "first_name":string;
                "last_name":string;
                "payer_id":string;
                "shipping_address":{
                    "recipient_name":string;
                    "line1":string;
                    "city":string;
                    "state":string;
                    "postal_code":string;
                    "country_code":string;
                },
                "country_code":string;
            }
        },
        "transactions":{
            "amount":{"total":string, "currency":string, "details":{"subtotal":string}},
            "payee":{"merchant_id":string, "email":string},
            "description":string,
            "item_list":{
                "items":{
                    "name":string;
                    "description":string;
                    "price":string;
                    "currency":string;
                    "quantity":number
                }[],
                "shipping_address":{
                    "recipient_name":string;
                    "line1":string;
                    "city":string;
                    "state":string;
                    "postal_code":string;
                    "country_code":string;
                }
            },
            "related_resources":[{
                "sale":{
                    "id":string;
                    "state":string;
                    "amount":{"total":string, "currency":string, "details":{"subtotal":string}},
                    "payment_mode":string;
                    "protection_eligibility":string;
                    "protection_eligibility_type":string;
                    "transaction_fee":{"value":string, "currency":string},
                    "parent_payment":string;
                    "create_time":string;
                    "update_time":string;
                    "links":[{
                        "href":string;
                        "rel":string;
                        "method":string;
                    }, {
                        "href":string;
                        "rel":string;
                        "method":string;
                    }, {
                        "href":string;
                        "rel":string;
                        "method":string;
                    }]
                }
            }]
        }[],
        "create_time":string;
        "links":[{
            "href":string;
            "rel":string;
            "method":string;
        }],
        "httpStatusCode":number
    }

    export interface stripeAnswer {
        id:string;
        object:string;
        amount:number;
        amount_refunded:number;
        balance_transaction:string;
        captured:boolean;
        created:number;
        currency:string;
        description:string;
        livemode:boolean;
        metadata:{},
        paid:boolean;
        refunds:{ object:string;
            data:any;
            has_more:boolean;
            total_count:number;
            url:string },
        source:{ id:string;
            object:string;
            address_city?:string;
            address_country?:string;
            address_line1?:string;
            address_line1_check?:string;
            address_line2?:string;
            address_state?:string,
            address_zip?:string,
            address_zip_check?:string,
            brand:string,
            country:string,
            customer?:string,
            cvc_check:string,
            exp_month:number,
            exp_year:number,
            fingerprint:string,
            funding:string,
            last4:string,
            metadata:{},
            name:string,
            tokenization_method?:string},
        source_transfer?:string,
        statement_descriptor?:string,
        status:string
    }
    export interface reqBodygetClientsRequiestOptions {
        gender?:string,
        age?:string[],
        appType?:string,
        country?:string[]
    }

    export interface getClientsRequiestOptions {
        uid:string,
        data?:reqBodygetClientsRequiestOptions
    }
    export interface clientCountResponse {
        uid:string,
        platform:string,
        num:number
    }
}