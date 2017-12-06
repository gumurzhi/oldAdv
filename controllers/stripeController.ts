///<reference path="../typings/tsd.d.ts"/>
import {getLogger} from "log4js";
import {config} from "../config/appConfig";
import {varInterfaces} from "../entity/varInterfaces";
import {payment} from "paypal-rest-sdk";
import {socketIoController} from "./socketIoController";
import {dbController} from "./dbController";
var stripe = require('stripe')(config.stripeConf.apiKey);
let logger = getLogger('stripe');


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

stripe.customers.create();
class StripeController {
    constructor() {
    }

    public charge(req:Req, res:Response):void {

        logger.trace('req.body:', req.body);
        if (req && req.body && req.user && req.body.stripeToken && req.body.total && typeof req.body.total == 'number') {
            var token = req.body.stripeToken; // Using Express
            // Create a charge: this will charge the user's card
            var charge = stripe.charges.create({
                amount: req.body.total, // Amount in cents
                currency: "usd",
                source: token,
                description: "Advertising wallet charge"
            }, function (err, charge:varInterfaces.stripeAnswer) {
                if (err) { //&& err.type === 'StripeCardError') {
                    // The card has been declined
                    logger.error('stripe.payment.execute ERROR:', err);
                    res.json({error: {code: 500, message: err}})
                } else {
                    logger.info('charge:', charge);
                    if (charge.object == 'charge' && charge.amount && charge.status == 'succeeded') {
                        dbController.updateUserById(req.user._id, {$inc: {wallet: charge.amount * 10}})
                            .then(function (user) {
                                if (user) {
                                    logger.info('charge of', charge.amount, 'of user', req.user.username, 'was successful');
                                    socketIoController.sendUserInfo(user);
                                    dbController.addPayment({payer: req.user._id, sum: charge.amount / 100, provider: 'stripe'})
                                        .catch(function (err) {
                                           logger.error('addPayment ERROR:', err);
                                        });
                                    res.json({total: charge.amount});
                                } else {
                                    logger.error('can\'t find user:', req.user.username);
                                    res.json({error: {code: 504, message: 'can\'t find such user for charging'}});
                                }
                            })
                            .catch(function (err) {
                                logger.error('dbController.updateUserById', err);
                                res.json({error: {code: 500, message: 'internal server error'}});
                            });
                    } else {
                        logger.error('payment  fail, check details:', JSON.stringify(charge));
                        res.json({error: {code: 505, message: 'charge failed'}});
                    }

                }
            });
        } else {
            logger.error('createPayment ERROR:', 'wrong incoming data');
            res.json({error: {cole: 400, message: 'wrong incoming data'}});
        }
    }
}

export var stripeController = new StripeController();