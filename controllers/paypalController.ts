///<reference path="../typings/tsd.d.ts"/>
import {getLogger} from "log4js";
import {config} from "../config/appConfig";
import * as paypal from "paypal-rest-sdk";
import {socketIoController} from "./socketIoController";
import {varInterfaces} from "../entity/varInterfaces";
import {dbController} from "./dbController";
let logger = getLogger('payPal');
var paypalConfig = config.paypalConf;


interface Req extends Express.Request {
    params(s:string);
    body?:any;
    query?:any;
}
interface Response extends Express.Response {
    json:any;
    redirect(url:string);
    send(s:string);
}

class PaypalController {
    private payments:{[index:string]:string} = {};

    constructor() {
        paypal.configure(paypalConfig);
    }

    public createPayment(req:Req, res:Response):void {
        logger.debug('createPayment got', req.body, '\n from:', req.user);
        var my = this;
        if (req && req.body && req.user && req.body.total) { //&& typeof req.body.total == 'number') {
            req.body.total = req.body.total.toString();
            var payment:varInterfaces.payment = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "transactions": [
                    {
                        "amount": {
                            "total": req.body.total,
                            "currency": "USD",
                            "details": {
                                "subtotal": req.body.total
                            }
                        },
                        "description": "This is the payment transaction description.",
                        "item_list": {
                            "items": [
                                {
                                    "name": "Advertising payment",
                                    "description": "Advertising wallet charge",
                                    "quantity": "1",
                                    "price": req.body.total,
                                    "currency": "USD"
                                }
                            ]
                        }
                    }
                ],
                "note_to_payer": "Contact us for any questions.",
                "redirect_urls": {
                    "return_url": "/paypal/execute",
                    "cancel_url": "/paypal/cancel"
                }
            };
            paypal.payment.create(payment, function (error, payment:varInterfaces.paymentAnswer) {
                if (error) {
                    logger.error(error);
                    res.json({error:{code:505, message: 'got error on payment creation'}});
                } else {
                    logger.info('payment of', req.user.username, ':', JSON.stringify(payment));
                    if (payment.payer.payment_method === 'paypal') {
                        req.session['paymentId'] = payment.id;
                        var redirectUrl;
                        for (var i = 0; i < payment.links.length; i++) {
                            var link = payment.links[i];
                            if (link.method === 'REDIRECT') {
                                redirectUrl = link.href;
                            }
                        }
                        my.payments[payment.id] = req.user.username;
                        res.json({link: redirectUrl});
                    }
                }
            });
        } else {
            logger.error('createPayment ERROR:', 'wrong incoming data');
            res.json({error: {cole: 400, message: 'wrong incoming data'}});
        }
    };

    public execute(req:Req, res:Response) {
        var my = this;
        logger.debug('execute got:', req.query);
        logger.trace('from', req.user);
        var paymentId = req.query['paymentId'];
        var payerId = req.query['PayerID'];
        var details = {"payer_id": payerId};

        logger.trace('paymentId:', paymentId, 'payerId:', payerId, 'details:', details);
        paypal.payment.execute(paymentId, details, function (error, payment:varInterfaces.executedPayment) {
            if (error) {
                logger.error('paypal.payment.execute ERROR:', error);
                res.json({error: {code: 500, message: error}})
            } else {
                logger.info('payment:', JSON.stringify(payment));
                if (payment && payment.state === "approved" && my.payments[payment.id] === req.user.username && payment.transactions && payment.transactions.length) {
                    delete my.payments[payment.id];
                    var total = 0;
                    payment.transactions.forEach(function (cell) {
                        total += parseFloat(cell.amount.total);
                    });
                    logger.trace('total is:', total);
                    dbController.updateUserById(req.user._id, {$inc: {wallet: total * 1000}})
                        .then(function (user) {
                            if (user) {
                                logger.info('payment successful');
                                socketIoController.sendUserInfo(user);
                                dbController.addPayment({payer: req.user._id, sum: total, provider: 'payPal'})
                                    .catch(function (err) {
                                        logger.error('addPayment ERROR:', err);
                                    });
                                res.redirect('/');
                            } else {
                                logger.error('user was not found on charging wallet. User:', req.user, 'Money:', total);
                                res.json({error: {code: 500, message: 'internal server error'}});
                            }
                        })
                        .catch(function (err) {
                            logger.error('user was not found on charging wallet. User:', req.user, 'Money:', total);
                            logger.error('error is:', err);
                            res.json({error: {code: 500, message: 'internal server error'}});
                        });
                } else {
                    logger.error('createPayment ERROR:', 'wrong incoming data');
                    res.json({error: {cole: 400, message: 'wrong incoming data'}});
                }
            }
        });
    };

    public cancel(req:Req, res:Response) {
        logger.info('req,query', req.query);
        res.redirect('/');
    };
}

export var paypalController = new PaypalController();